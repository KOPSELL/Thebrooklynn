import { useState } from "react";
import AdminLogin from "@/components/AdminLogin";
import AdminFinancial from "@/components/AdminFinancial";
import BarberPushNotifications from "@/components/BarberPushNotifications";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  Scissors,
  Clock,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Filter,
  DollarSign,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const Admin = () => {
  const queryClient = useQueryClient();
  const [isAuthed, setIsAuthed] = useState(() => sessionStorage.getItem("el_patron_admin") === "1");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterBarber, setFilterBarber] = useState<string | null>(null);

  const { data: barbers } = useQuery({
    queryKey: ["barbers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("barbers").select("*").eq("active", true);
      if (error) throw error;
      return data;
    },
    enabled: isAuthed,
  });

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["admin-appointments", format(selectedDate, "yyyy-MM-dd"), filterBarber],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select("*, barbers(name), services(name, duration_minutes, price)")
        .eq("appointment_date", format(selectedDate, "yyyy-MM-dd"))
        .order("appointment_time", { ascending: true });

      if (filterBarber) {
        query = query.eq("barber_id", filterBarber);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isAuthed,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-appointments"] });
      toast.success("Status atualizado!");
    },
  });

  if (!isAuthed) {
    return <AdminLogin onAuth={() => setIsAuthed(true)} />;
  }

  const statusColors: Record<string, string> = {
    confirmed: "bg-primary/20 text-primary border-primary/30",
    completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    cancelled: "bg-destructive/20 text-destructive border-destructive/30",
  };

  const statusLabels: Record<string, string> = {
    confirmed: "Confirmado",
    completed: "Concluído",
    cancelled: "Cancelado",
  };

  const confirmedCount = appointments?.filter((a) => a.status === "confirmed").length || 0;
  const completedCount = appointments?.filter((a) => a.status === "completed").length || 0;
  const cancelledCount = appointments?.filter((a) => a.status === "cancelled").length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                <span className="text-gold-gradient">El Patron</span>
              </h1>
              <p className="text-xs text-muted-foreground">Painel de Administração</p>
            </div>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                {format(selectedDate, "dd MMM yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Tabs */}
        <Tabs defaultValue="agenda" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-card border border-border">
            <TabsTrigger value="agenda" className="gap-2 data-[state=active]:bg-primary/20">
              <ClipboardList className="w-4 h-4" /> Agenda
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="gap-2 data-[state=active]:bg-primary/20">
              <DollarSign className="w-4 h-4" /> Financeiro
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agenda" className="space-y-6">
            <BarberPushNotifications barbers={barbers} />
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-primary">{confirmedCount}</p>
                <p className="text-xs text-muted-foreground">Confirmados</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{completedCount}</p>
                <p className="text-xs text-muted-foreground">Concluídos</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-destructive">{cancelledCount}</p>
                <p className="text-xs text-muted-foreground">Cancelados</p>
              </div>
            </div>

            {/* Filter by barber */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Button
                variant={filterBarber === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterBarber(null)}
                className={filterBarber === null ? "bg-gold-gradient text-primary-foreground" : ""}
              >
                Todos
              </Button>
              {barbers?.map((b) => (
                <Button
                  key={b.id}
                  variant={filterBarber === b.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterBarber(b.id)}
                  className={filterBarber === b.id ? "bg-gold-gradient text-primary-foreground" : ""}
                >
                  {b.name}
                </Button>
              ))}
            </div>

            {/* Appointments list */}
            {isLoading ? (
              <div className="text-center py-10 text-muted-foreground">Carregando...</div>
            ) : !appointments?.length ? (
              <div className="text-center py-16 bg-card border border-border rounded-xl">
                <Scissors className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">Nenhum agendamento para este dia</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className={cn(
                      "bg-card border border-border rounded-xl p-4 md:p-5 transition-all",
                      apt.status === "cancelled" && "opacity-50"
                    )}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center min-w-[60px]">
                          <Clock className="w-4 h-4 text-primary mb-1" />
                          <span className="text-lg font-bold">{apt.appointment_time.slice(0, 5)}</span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-lg">{apt.client_name}</p>
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full border",
                                statusColors[apt.status] || statusColors.confirmed
                              )}
                            >
                              {statusLabels[apt.status] || apt.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {apt.client_phone}
                          </p>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-primary" />
                              {(apt.barbers as any)?.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Scissors className="w-3 h-3 text-primary" />
                              {(apt.services as any)?.name}
                            </span>
                            <span className="text-primary font-semibold">
                              R$ {Number((apt.services as any)?.price || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {apt.status === "confirmed" && (
                        <div className="flex gap-2 md:flex-col">
                          <Button
                            size="sm"
                            onClick={() => updateStatus.mutate({ id: apt.id, status: "completed" })}
                            className="bg-emerald-600 hover:bg-emerald-700 gap-1 flex-1"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Concluir
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus.mutate({ id: apt.id, status: "cancelled" })}
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1 flex-1"
                          >
                            <XCircle className="w-4 h-4" /> Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="financeiro">
            <AdminFinancial barbers={barbers} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
