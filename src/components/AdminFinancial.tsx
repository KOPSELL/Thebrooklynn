import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarIcon, TrendingUp, DollarSign, Scissors, Trophy, Filter,
  Users, ClipboardList, Clock, ChevronLeft, ChevronRight, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Barber {
  id: string;
  name: string;
}

interface AdminFinancialProps {
  barbers: Barber[] | undefined;
}

type PeriodMode = "day" | "month";

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const AdminFinancial = ({ barbers }: AdminFinancialProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterBarber, setFilterBarber] = useState<string | null>(null);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("day");
  const rangeStart = format(periodMode === "day" ? selectedDate : startOfMonth(selectedDate), "yyyy-MM-dd");
  const rangeEnd = format(periodMode === "day" ? selectedDate : endOfMonth(selectedDate), "yyyy-MM-dd");

  const { data: appointments, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["financial-detail", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, client_name, client_phone, appointment_date, appointment_time, status, final_price, barber_id, barbers(name), services(name, price)")
        .eq("status", "completed")
        .gte("appointment_date", rangeStart)
        .lte("appointment_date", rangeEnd)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(
    () => (appointments ?? []).filter((a) => !filterBarber || a.barber_id === filterBarber),
    [appointments, filterBarber],
  );
  const amount = (a: (typeof filtered)[number]) =>
    Number((a as any).final_price ?? (a.services as any)?.price ?? 0);
  const total = filtered.reduce((sum, a) => sum + amount(a), 0);
  const average = filtered.length ? total / filtered.length : 0;
  const uniqueClients = new Set(filtered.map((a) => a.client_phone || a.client_name)).size;

  const serviceStats = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filtered.forEach((a) => {
      const name = (a.services as any)?.name || "Serviço não informado";
      const item = map.get(name) ?? { count: 0, total: 0 };
      item.count += 1;
      item.total += amount(a);
      map.set(name, item);
    });
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [filtered]);

  const barberStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number }>();
    filtered.forEach((a) => {
      const id = a.barber_id;
      const name = (a.barbers as any)?.name || "Barbeiro não informado";
      const item = map.get(id) ?? { name, count: 0, total: 0 };
      item.count += 1;
      item.total += amount(a);
      map.set(id, item);
    });
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [filtered]);

  const periodLabel = periodMode === "day"
    ? format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });

  const shiftDate = (direction: number) => {
    const next = new Date(selectedDate);
    if (periodMode === "day") {
      next.setDate(next.getDate() + direction);
    } else {
      next.setDate(1);
      next.setMonth(next.getMonth() + direction);
    }
    setSelectedDate(next);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <span className="text-gold-gradient">Relatório Financeiro</span>
          </h2>
          <p className="text-sm text-muted-foreground">Escolha se quer ver um dia específico ou o mês inteiro. Todos os valores abaixo consideram apenas atendimentos concluídos.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant={periodMode === "day" ? "default" : "outline"} onClick={() => setPeriodMode("day")} className={periodMode === "day" ? "bg-gold-gradient text-primary-foreground" : ""}>
            <CalendarDays className="mr-2 h-4 w-4" /> Dia específico
          </Button>
          <Button variant={periodMode === "month" ? "default" : "outline"} onClick={() => setPeriodMode("month")} className={periodMode === "month" ? "bg-gold-gradient text-primary-foreground" : ""}>
            <CalendarIcon className="mr-2 h-4 w-4" /> Mês inteiro
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Período anterior" onClick={() => shiftDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start gap-2 flex-1 min-w-0">
                <CalendarIcon className="h-4 w-4 shrink-0" />
                <span className="truncate capitalize">{periodLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar mode="single" selected={selectedDate} onSelect={(date) => { if (date) { setSelectedDate(date); setPeriodMode("day"); } }} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" aria-label="Próximo período" onClick={() => shiftDate(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="secondary" onClick={() => setSelectedDate(new Date())}>Hoje</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Período consultado: {format(new Date(rangeStart + "T12:00:00"), "dd/MM/yyyy")} a {format(new Date(rangeEnd + "T12:00:00"), "dd/MM/yyyy")}
        </p>

        <div className="flex items-center gap-2 flex-wrap border-t border-border pt-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground mr-1">Barbeiro:</span>
          <Button variant={filterBarber === null ? "default" : "outline"} size="sm" onClick={() => setFilterBarber(null)} className={filterBarber === null ? "bg-gold-gradient text-primary-foreground" : ""}>Todos</Button>
          {barbers?.map((barber) => (
            <Button key={barber.id} variant={filterBarber === barber.id ? "default" : "outline"} size="sm" onClick={() => setFilterBarber(barber.id)} className={filterBarber === barber.id ? "bg-gold-gradient text-primary-foreground" : ""}>{barber.name}</Button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">Carregando relatório...</div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/40 bg-card p-6 space-y-3">
          <p className="font-semibold">Não foi possível carregar o relatório financeiro.</p>
          <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Verifique sua conexão e tente novamente."}</p>
          <Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-bold capitalize">{periodMode === "day" ? "Resumo do dia" : "Resumo do mês"} — {periodLabel}</h3>
              <p className="text-sm text-muted-foreground">{filterBarber ? `Filtro: ${barbers?.find((b) => b.id === filterBarber)?.name ?? "barbeiro selecionado"}` : "Todos os barbeiros"} · somente concluídos</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>{isFetching ? "Atualizando..." : "Atualizar dados"}</Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-primary/30 bg-card p-4">
              <DollarSign className="h-5 w-5 text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Faturamento no período</p>
              <p className="text-xl md:text-2xl font-bold text-primary break-words">{money(total)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <ClipboardList className="h-5 w-5 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Atendimentos concluídos</p>
              <p className="text-2xl font-bold">{filtered.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <Users className="h-5 w-5 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Clientes únicos</p>
              <p className="text-2xl font-bold">{uniqueClients}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <TrendingUp className="h-5 w-5 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Média por atendimento</p>
              <p className="text-xl md:text-2xl font-bold break-words">{money(average)}</p>
            </div>
          </div>

          <section className="rounded-xl border border-border bg-card p-4 md:p-5">
            <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><ClipboardList className="h-5 w-5 text-primary" />Atendimentos contabilizados</h3>
            {filtered.length === 0 ? (
              <div className="py-8 text-center">
                <Scissors className="h-9 w-9 mx-auto mb-2 text-muted-foreground/50" />
                <p className="font-medium">Nenhum atendimento concluído neste período</p>
                <p className="text-sm text-muted-foreground mt-1">Tente outra data, outro mês ou selecione “Todos” os barbeiros.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((apt) => (
                  <div key={apt.id} className="rounded-lg border border-border p-3 md:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold break-words">{apt.client_name || "Cliente não informado"}</p>
                        <p className="text-sm text-muted-foreground">{(apt.services as any)?.name || "Serviço não informado"} · {(apt.barbers as any)?.name || "Barbeiro não informado"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="h-3 w-3" />{format(new Date(apt.appointment_date + "T12:00:00"), "dd/MM/yyyy")} às {String(apt.appointment_time).slice(0, 5)}{apt.client_phone ? ` · ${apt.client_phone}` : ""}</p>
                      </div>
                      <p className="text-lg font-bold text-primary shrink-0">{money(amount(apt))}</p>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center gap-3 border-t border-primary/30 pt-4">
                  <div><p className="font-bold text-lg">Total do período</p><p className="text-xs text-muted-foreground">{filtered.length} atendimento(s)</p></div>
                  <p className="text-2xl font-bold text-primary">{money(total)}</p>
                </div>
              </div>
            )}
          </section>

          <div className="grid lg:grid-cols-2 gap-4">
            <section className="rounded-xl border border-border bg-card p-4 md:p-5">
              <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><Scissors className="h-5 w-5 text-primary" />Faturamento por serviço</h3>
              {serviceStats.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados para este filtro.</p> : <div className="space-y-4">
                {serviceStats.map(([name, stat]) => (
                  <div key={name}>
                    <div className="flex justify-between gap-3 text-sm mb-1"><span className="font-medium">{name} <span className="text-muted-foreground">({stat.count})</span></span><span className="font-semibold whitespace-nowrap">{money(stat.total)}</span></div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full bg-gold-gradient" style={{ width: `${total ? (stat.total / total) * 100 : 0}%` }} /></div>
                  </div>
                ))}
              </div>}
            </section>

            <section className="rounded-xl border border-border bg-card p-4 md:p-5">
              <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><Trophy className="h-5 w-5 text-primary" />Faturamento por barbeiro</h3>
              {barberStats.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados para este filtro.</p> : <div className="space-y-3">
                {barberStats.map(([id, stat], index) => (
                  <div key={id} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0">
                    <div className="min-w-0"><p className="font-medium">{index === 0 && <Trophy className="inline h-3.5 w-3.5 text-primary mr-1" />}{stat.name}</p><p className="text-xs text-muted-foreground">{stat.count} atendimento(s)</p></div>
                    <div className="text-right shrink-0"><p className="font-bold text-primary">{money(stat.total)}</p><p className="text-xs text-muted-foreground">{total ? ((stat.total / total) * 100).toFixed(1) : "0.0"}% do período</p></div>
                  </div>
                ))}
              </div>}
            </section>
          </div>
          <p className="text-xs text-muted-foreground">Observação: o relatório usa o valor final registrado no atendimento. Se não houver valor final, utiliza o preço atual cadastrado no serviço.</p>
        </>
      )}
    </div>
  );
};

export default AdminFinancial;
