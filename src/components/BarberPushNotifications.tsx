import { useEffect, useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { externalNotifications } from "@/integrations/external-notifications/client";

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalReady?: Promise<any>;
    OneSignalDeferred?: Array<(OneSignal: any) => void | Promise<void>>;
  }
}

type Barber = { id: string; name: string };

let oneSignalReady: Promise<any> | null = null;

// O index.html é o único lugar que inicializa o SDK.
// Este componente apenas aguarda e reutiliza a instância já inicializada.
const initializeOneSignal = () => {
  if (oneSignalReady) return oneSignalReady;

  if (window.OneSignalReady) {
    oneSignalReady = window.OneSignalReady.then((OneSignal) => {
      window.OneSignal = OneSignal;
      return OneSignal;
    });
    return oneSignalReady;
  }

  oneSignalReady = new Promise((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        if (window.OneSignalReady) {
          await window.OneSignalReady;
        }
        window.OneSignal = OneSignal;
        resolve(OneSignal);
      } catch (error) {
        reject(error);
      }
    });
  });

  return oneSignalReady;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try { return JSON.stringify(error); } catch { return "Erro desconhecido ao ativar as notificações."; }
};

const BarberPushNotifications = ({ barbers }: { barbers: Barber[] | undefined }) => {
  const [barberId, setBarberId] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [oneSignalReadyState, setOneSignalReadyState] = useState(false);

  useEffect(() => {
    initializeOneSignal()
      .then(() => setOneSignalReadyState(true))
      .catch((error) => {
        console.error("Erro ao iniciar OneSignal:", error);
        toast.error("Não foi possível carregar as notificações.", { description: getErrorMessage(error) });
      });
  }, []);

  useEffect(() => setSubscribed(false), [barberId]);

  const handleEnableNotifications = () => {
    if (!barberId) {
      toast.error("Selecione o barbeiro que receberá as notificações.");
      return;
    }

    const OneSignal = window.OneSignal;

    if (!oneSignalReadyState || !OneSignal?.Notifications?.requestPermission) {
      toast.error("Notificações ainda estão carregando.", {
        description: "Aguarde um instante e tente novamente.",
      });
      return;
    }

    setLoading(true);

    // IMPORTANTE PARA iOS: requestPermission() é iniciado diretamente
    // pelo evento de clique, sem await antes desta chamada.
    OneSignal.Notifications.requestPermission()
      .then(async (permission: boolean) => {
        if (!permission) {
          throw new Error(
            "A permissão de notificações não foi concedida. Verifique Ajustes > Notificações > The Brooklyn."
          );
        }

        await OneSignal.User.PushSubscription.optIn();

        // O iOS/OneSignal pode criar o ID antes de concluir a inscrição.
        // Só salve o aparelho quando os dois estados estiverem prontos.
        let subscriptionId = OneSignal.User.PushSubscription.id;
        let optedIn = OneSignal.User.PushSubscription.optedIn === true;

        for (
          let attempt = 0;
          (!subscriptionId || !optedIn) && attempt < 10;
          attempt += 1
        ) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          subscriptionId = OneSignal.User.PushSubscription.id;
          optedIn = OneSignal.User.PushSubscription.optedIn === true;
        }

        if (!subscriptionId || !optedIn) {
          throw new Error(
            "O iPhone autorizou as notificações, mas ainda não concluiu a inscrição. Feche o site, abra novamente pelo ícone da Tela de Início e tente ativar outra vez."
          );
        }

        const selectedBarber = barbers?.find((barber) => barber.id === barberId);
        if (!selectedBarber) {
          throw new Error("Não foi possível identificar o barbeiro selecionado.");
        }

        const { data: externalBarber, error: barberError } = await externalNotifications
          .from("barbers")
          .select("id")
          .eq("name", selectedBarber.name)
          .maybeSingle();

        if (barberError || !externalBarber) {
          throw new Error("Este barbeiro ainda não está disponível para notificações.");
        }

        // Registra cada dispositivo separadamente. Assim, o PC e o celular
        // podem receber notificações para o mesmo barbeiro.
        const { error: registrationError } = await externalNotifications
          .from("barber_push_subscriptions")
          .upsert(
            {
              barbershop_id: "836d4853-d45e-44cb-9b87-14b88fc0fe48",
              barber_id: externalBarber.id,
              onesignal_app_id: "6e736ec1-785c-48da-9b6e-c461a926c3c2",
              onesignal_subscription_id: subscriptionId,
            },
            {
              onConflict: "barbershop_id,barber_id,onesignal_app_id,onesignal_subscription_id",
              ignoreDuplicates: true,
            },
          );

        if (registrationError) {
          throw new Error(
            `Não foi possível salvar este dispositivo: ${registrationError.message}`
          );
        }

        setSubscribed(true);
        toast.success("Notificações ativadas!", {
          description:
            "Este celular receberá um aviso quando chegar um novo agendamento.",
        });
      })
      .catch((error: unknown) => {
        console.error("Erro ao ativar notificações:", error);

        const message = getErrorMessage(error);

        toast.error("Não foi possível ativar as notificações.", {
          description: message,
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-5">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0"><Bell className="w-5 h-5 text-primary" /></div>
          <div>
            <p className="font-semibold">Notificações de novos cortes</p>
            <p className="text-sm text-muted-foreground">Ative no celular do barbeiro para receber os novos agendamentos.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 md:min-w-[360px]">
          <select value={barberId} onChange={(event) => setBarberId(event.target.value)} className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Selecione o barbeiro</option>
            {barbers?.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
          </select>
          <Button type="button" onClick={handleEnableNotifications} disabled={loading || subscribed || !oneSignalReadyState} className="bg-gold-gradient text-primary-foreground">
            {subscribed ? <><CheckCircle2 className="w-4 h-4" /> Notificações Ativas ✓</> : loading ? "Aguardando confirmação..." : !oneSignalReadyState ? "Carregando notificações..." : <><Bell className="w-4 h-4" /> Ativar Notificações</>}
          </Button>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground/50 text-right">Push v2026.10.06</p>
    </div>
  );
};

export default BarberPushNotifications;
