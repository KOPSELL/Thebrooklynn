import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, isBefore, startOfToday, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Check, Scissors, Clock, User, Phone } from "lucide-react";
import { toast } from "sonner";

const THEBROOKLYNN_BARBERSHOP_ID = "836d4853-d45e-44cb-9b87-14b88fc0fe48";
const THEBROOKLYNN_ONESIGNAL_APP_ID = "6e736ec1-785c-48da-9b6e-c461a926c3c2";

type OneSignalInstance = {
  User?: {
    PushSubscription?: {
      id?: string | null;
    };
  };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: OneSignalInstance) => void | Promise<void>>;
  }
}

const saveOneSignalSubscription = async (barberId: string) => {
  if (!window.OneSignalDeferred) {
    console.warn("OneSignal ainda não está disponível.");
    return;
  }

  await new Promise<void>((resolve) => {
    window.OneSignalDeferred!.push(async (OneSignal) => {
      try {
        const subscriptionId = OneSignal.User?.PushSubscription?.id;

        if (!subscriptionId) {
          console.warn("Nenhuma assinatura OneSignal encontrada neste dispositivo.");
          resolve();
          return;
        }

        const { data: existing, error: findError } = await supabase
          .from("barber_push_subscriptions")
          .select("id")
          .eq("barbershop_id", THEBROOKLYNN_BARBERSHOP_ID)
          .eq("barber_id", barberId)
          .eq("onesignal_app_id", THEBROOKLYNN_ONESIGNAL_APP_ID)
          .maybeSingle();

        if (findError) throw findError;

        if (existing?.id) {
          const { error } = await supabase
            .from("barber_push_subscriptions")
            .update({
              onesignal_subscription_id: subscriptionId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("barber_push_subscriptions")
            .insert({
              barbershop_id: THEBROOKLYNN_BARBERSHOP_ID,
              barber_id: barberId,
              onesignal_app_id: THEBROOKLYNN_ONESIGNAL_APP_ID,
              onesignal_subscription_id: subscriptionId,
            });

          if (error) throw error;
        }

        console.info("Assinatura OneSignal salva para o Thebrooklynn.");
      } catch (error) {
        console.error("Erro ao salvar assinatura OneSignal:", error);
      } finally {
        resolve();
      }
    });
  });
};

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
];

const BookingForm = () => {
  const queryClient = useQueryClient();
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [step, setStep] = useState(1);

  const { data: barbers } = useQuery({
    queryKey: ["barbers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("barbers").select("*").eq("active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: existingAppointments } = useQuery({
    queryKey: ["appointments", selectedBarber, selectedDate],
    queryFn: async () => {
      if (!selectedBarber || !selectedDate) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("appointment_time")
        .eq("barber_id", selectedBarber)
        .eq("appointment_date", format(selectedDate, "yyyy-MM-dd"))
        .eq("status", "confirmed");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedBarber && !!selectedDate,
  });

  const bookedTimes = existingAppointments?.map((a) => a.appointment_time.slice(0, 5)) || [];

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedBarber || !selectedService || !selectedDate || !selectedTime) {
        throw new Error("Dados do agendamento incompletos.");
      }

      const { data: appointment, error } = await supabase.from("appointments").insert({
        barber_id: selectedBarber,
        service_id: selectedService,
        client_name: clientName,
        client_phone: clientPhone,
        appointment_date: format(selectedDate, "yyyy-MM-dd"),
        appointment_time: selectedTime,
      }).select("id").single();
      if (error) throw error;

      // O agendamento já foi salvo. Rode o cadastro do dispositivo e o envio
      // em tarefas separadas: o callback do OneSignal pode não disparar em alguns
      // celulares e nunca deve impedir o envio da notificação.
      void saveOneSignalSubscription(selectedBarber).catch((subscriptionError) => {
        console.error("Falha ao atualizar assinatura OneSignal:", subscriptionError);
      });

      void (async () => {
        try {
          const { data: notificationResult, error: notificationError } = await supabase.functions.invoke(
            "send-appointment-notification",
            {
              body: {
                appointmentId: appointment.id,
                barbershopId: THEBROOKLYNN_BARBERSHOP_ID,
                onesignalAppId: THEBROOKLYNN_ONESIGNAL_APP_ID,
                barberId: selectedBarber,
              },
            },
          );

          if (notificationError || notificationResult?.delivered === false || notificationResult?.ok === false) {
            console.error(
              "O agendamento foi salvo, mas a notificação não foi entregue:",
              notificationError ?? notificationResult,
            );
          } else {
            console.info("Resultado do envio da notificação:", notificationResult);
          }
        } catch (notificationError) {
          console.error("Falha ao enviar notificação; agendamento mantido:", notificationError);
        }
      })();
    },
    onSuccess: () => {
      toast.success("Agendamento confirmado!", {
        description: "Seu horário foi reservado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      // Reset
      setStep(1);
      setSelectedBarber(null);
      setSelectedService(null);
      setSelectedDate(undefined);
      setSelectedTime(null);
      setClientName("");
      setClientPhone("");
    },
    onError: () => {
      toast.error("Erro ao agendar. Tente novamente.");
    },
  });

  const canProceed = () => {
    switch (step) {
      case 1: return !!selectedBarber;
      case 2: return !!selectedService;
      case 3: return !!selectedDate && !!selectedTime;
      case 4: return clientName.trim().length > 0 && clientPhone.trim().length > 0;
      default: return false;
    }
  };

  const selectedBarberName = barbers?.find((b) => b.id === selectedBarber)?.name;
  const selectedServiceData = services?.find((s) => s.id === selectedService);

  return (
    <section id="booking" className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-2">
          <span className="text-gold-gradient">Agende seu Horário</span>
        </h2>
        <p className="text-center text-muted-foreground mb-10">
          Escolha o barbeiro, serviço e horário
        </p>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                step === s
                  ? "bg-gold-gradient text-primary-foreground scale-110"
                  : step > s
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-2xl">
          {/* Step 1: Barber */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Scissors className="w-5 h-5 text-primary" />
                Escolha o Barbeiro
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {barbers?.map((barber) => (
                  <button
                    key={barber.id}
                    onClick={() => setSelectedBarber(barber.id)}
                    className={cn(
                      "p-6 rounded-lg border-2 transition-all duration-300 text-center",
                      selectedBarber === barber.id
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                        : "border-border hover:border-primary/40 bg-secondary/50"
                    )}
                  >
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <p className="font-semibold text-lg">{barber.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Service */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Scissors className="w-5 h-5 text-primary" />
                Escolha o Serviço
              </h3>
              <div className="grid gap-3">
                {services?.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all duration-300 flex items-center justify-between",
                      selectedService === service.id
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                        : "border-border hover:border-primary/40 bg-secondary/50"
                    )}
                  >
                    <div className="text-left">
                      <p className="font-semibold text-lg">{service.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {service.duration_minutes} min
                      </p>
                    </div>
                    <p className="text-xl font-bold text-primary">
                      R$ {Number(service.price).toFixed(2)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Date & Time */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Data e Horário
              </h3>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Selecione a data</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-12",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate
                        ? format(selectedDate, "PPP", { locale: ptBR })
                        : "Selecione uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setSelectedTime(null);
                      }}
                      disabled={(date) =>
                        isBefore(date, startOfToday()) || isBefore(addDays(new Date(), 30), date)
                      }
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {selectedDate && (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Horários disponíveis</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {TIME_SLOTS.map((time) => {
                      const isBooked = bookedTimes.includes(time);
                      const isPast = selectedDate && isToday(selectedDate) && time <= format(new Date(), "HH:mm");
                      const isDisabled = isBooked || isPast;
                      return (
                        <button
                          key={time}
                          disabled={!!isDisabled}
                          onClick={() => setSelectedTime(time)}
                          className={cn(
                            "py-2 px-3 rounded-md text-sm font-medium transition-all duration-200",
                            isDisabled
                              ? "bg-secondary/30 text-muted-foreground/40 cursor-not-allowed line-through"
                              : selectedTime === time
                              ? "bg-gold-gradient text-primary-foreground shadow-md"
                              : "bg-secondary hover:bg-primary/20 text-foreground"
                          )}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Client info */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Seus Dados
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Nome</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Seu nome"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="pl-10 h-12 bg-secondary border-border"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="(00) 00000-0000"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="pl-10 h-12 bg-secondary border-border"
                    />
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-secondary/50 rounded-lg p-4 border border-border space-y-2">
                <p className="text-sm font-semibold text-primary mb-2">Resumo do agendamento</p>
                <p className="text-sm"><span className="text-muted-foreground">Barbeiro:</span> {selectedBarberName}</p>
                <p className="text-sm"><span className="text-muted-foreground">Serviço:</span> {selectedServiceData?.name}</p>
                <p className="text-sm"><span className="text-muted-foreground">Data:</span> {selectedDate && format(selectedDate, "dd/MM/yyyy")}</p>
                <p className="text-sm"><span className="text-muted-foreground">Horário:</span> {selectedTime}</p>
                <p className="text-sm font-semibold text-primary">
                  Valor: R$ {selectedServiceData && Number(selectedServiceData.price).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1 h-12"
              >
                Voltar
              </Button>
            )}
            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex-1 h-12 bg-gold-gradient text-primary-foreground hover:opacity-90 font-semibold"
              >
                Próximo
              </Button>
            ) : (
              <Button
                onClick={() => mutation.mutate()}
                disabled={!canProceed() || mutation.isPending}
                className="flex-1 h-12 bg-gold-gradient text-primary-foreground hover:opacity-90 font-semibold"
              >
                {mutation.isPending ? "Agendando..." : "Confirmar Agendamento"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BookingForm;
