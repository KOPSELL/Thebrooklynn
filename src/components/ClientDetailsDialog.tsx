import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { BARBERSHOP_ID } from "@/lib/barbershop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, Clock3, MessageCircle, Phone, Save, Scissors, UserRound, Wallet } from "lucide-react";

type Appointment = {
  id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  appointment_time: string;
  barber_id: string;
  service_id: string;
  status: string;
  final_price?: number | string | null;
  barbers?: { name?: string } | null;
  services?: { name?: string; price?: number | string; duration_minutes?: number } | null;
};

type Props = {
  appointment: Appointment | null;
  onClose: () => void;
};

const money = (value: unknown) => Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const statusText: Record<string, string> = {
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  canceled: "Cancelado",
  cancelado: "Cancelado",
  cancelada: "Cancelado",
};

export default function ClientDetailsDialog({ appointment, onClose }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("confirmed");

  useEffect(() => {
    if (!appointment) return;
    setName(appointment.client_name || "");
    setPhone(appointment.client_phone || "");
    setDate(appointment.appointment_date || "");
    setTime((appointment.appointment_time || "").slice(0, 5));
    setPrice(String(appointment.final_price ?? appointment.services?.price ?? 0));
    setStatus(appointment.status || "confirmed");
  }, [appointment]);

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["client-history", BARBERSHOP_ID, appointment?.client_phone],
    queryFn: async () => {
      if (!appointment?.client_phone) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("id, client_name, client_phone, appointment_date, appointment_time, status, final_price, barbers!inner(name, barbershop_id), services!inner(name, price, barbershop_id)")
        .eq("barbershop_id", BARBERSHOP_ID)
        .eq("barbers.barbershop_id", BARBERSHOP_ID)
        .eq("services.barbershop_id", BARBERSHOP_ID)
        .eq("client_phone", appointment.client_phone)
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!appointment?.client_phone,
  });

  const completedVisits = useMemo(
    () => history?.filter((item: any) => item.status === "completed") || [],
    [history],
  );
  const totalSpent = completedVisits.reduce(
    (sum: number, item: any) => sum + Number(item.final_price ?? item.services?.price ?? 0),
    0,
  );

  const saveMutation = useMutation({
    mutationFn: async (statusOverride?: string) => {
      if (!appointment) return;
      const normalizedPhone = phone.trim();
      const parsedPrice = Number(price.replace(",", "."));
      if (!name.trim() || !normalizedPhone || !date || !time) throw new Error("Preencha nome, telefone, data e horário.");
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) throw new Error("Informe um valor válido.");
      const { error } = await supabase
        .from("appointments")
        .update({
          client_name: name.trim(),
          client_phone: normalizedPhone,
          appointment_date: date,
          appointment_time: time.length === 5 ? time + ":00" : time,
          final_price: parsedPrice,
          status: statusOverride ?? status,
        } as any)
        .eq("id", appointment.id)
        .eq("barbershop_id", BARBERSHOP_ID);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["client-history"] }),
        queryClient.invalidateQueries({ queryKey: ["financial-monthly"] }),
        queryClient.invalidateQueries({ queryKey: ["financial-today"] }),
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      ]);
      toast.success("Dados do cliente e agendamento salvos!");
      onClose();
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível salvar."),
  });

  const whatsappUrl = useMemo(() => {
    const digits = (phone || "").replace(/\D/g, "");
    if (!digits) return "";
    const international = digits.startsWith("55") ? digits : "55" + digits;
    const message = encodeURIComponent(
      `Olá, ${name || appointment?.client_name}! Aqui é da The Brooklyn. Sobre seu agendamento de ${date ? format(parseISO(date), "dd/MM/yyyy") : ""} às ${time || ""}.`,
    );
    return `https://wa.me/${international}?text=${message}`;
  }, [phone, name, date, time, appointment?.client_name]);

  if (!appointment) return null;

  return (
    <Dialog open={!!appointment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserRound className="h-5 w-5 text-primary" /> Ficha completa do cliente
          </DialogTitle>
          <DialogDescription>
            Edite os dados, ajuste data e horário, altere o valor, finalize o atendimento e consulte o histórico.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[1fr_0.9fr]">
          <section className="space-y-4">
            <h3 className="font-semibold">Dados e agendamento</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">Nome do cliente<Input value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label className="space-y-1 text-sm">WhatsApp / telefone<Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></label>
              <label className="space-y-1 text-sm">Data<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
              <label className="space-y-1 text-sm">Horário<Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
              <label className="space-y-1 text-sm">Valor cobrado (R$)<Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
              <label className="space-y-1 text-sm">Status
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="confirmed">Confirmado</option>
                  <option value="completed">Concluído</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </label>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-2">
              <p className="flex items-center gap-2"><Scissors className="h-4 w-4 text-primary" /> Serviço: <strong>{appointment.services?.name || "—"}</strong></p>
              <p className="flex items-center gap-2"><UserRound className="h-4 w-4 text-primary" /> Barbeiro: <strong>{appointment.barbers?.name || "—"}</strong></p>
              <p className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Valor atual: <strong>{money(appointment.final_price ?? appointment.services?.price)}</strong></p>
            </div>
            <div className="flex flex-wrap gap-2">
              {whatsappUrl && <Button asChild className="gap-2 bg-green-600 hover:bg-green-700"><a href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> Chamar no WhatsApp</a></Button>}
              {status !== "completed" && status !== "cancelled" && (
                <Button variant="outline" className="gap-2" onClick={() => saveMutation.mutate("completed")}><CheckCircle2 className="h-4 w-4" /> Finalizar atendimento</Button>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold">Resumo e histórico</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Cortes/serviços concluídos</p>
                <p className="text-2xl font-bold text-primary">{historyLoading ? "…" : completedVisits.length}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Total gasto</p>
                <p className="text-lg font-bold">{historyLoading ? "…" : money(totalSpent)}</p>
              </div>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {historyLoading ? <p className="text-sm text-muted-foreground">Carregando histórico…</p> : !history?.length ? (
                <p className="text-sm text-muted-foreground">Nenhum histórico encontrado para este telefone.</p>
              ) : history.map((item: any) => (
                <div key={item.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.services?.name || "Serviço"}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3 w-3" /> {item.appointment_date ? format(parseISO(item.appointment_date), "dd/MM/yyyy", { locale: ptBR }) : "—"} <Clock3 className="ml-1 h-3 w-3" /> {(item.appointment_time || "").slice(0, 5)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.barbers?.name || "Barbeiro não informado"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{money(item.final_price ?? item.services?.price)}</p>
                      <span className="text-xs text-muted-foreground">{statusText[item.status] || item.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
            <Save className="h-4 w-4" /> {saveMutation.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
