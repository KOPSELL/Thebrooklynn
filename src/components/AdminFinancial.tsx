import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarIcon,
  TrendingUp,
  DollarSign,
  Scissors,
  Trophy,
  Star,
  Flame,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Barber {
  id: string;
  name: string;
}

interface AdminFinancialProps {
  barbers: Barber[] | undefined;
}

const getMotivationalMessage = (total: number) => {
  if (total >= 5000) return { msg: "🔥 MÊS LENDÁRIO! Vocês são monstros!", icon: Flame, color: "text-orange-400" };
  if (total >= 3000) return { msg: "🏆 Mês incrível! Continuem assim, reis!", icon: Trophy, color: "text-yellow-400" };
  if (total >= 2000) return { msg: "⭐ Ótimo mês! O patrão tá orgulhoso!", icon: Star, color: "text-primary" };
  if (total >= 1000) return { msg: "💪 Bom trabalho! Bora bater a meta!", icon: TrendingUp, color: "text-emerald-400" };
  return { msg: "📈 Início de mês! Bora pra cima que o mês é nosso!", icon: TrendingUp, color: "text-muted-foreground" };
};

const AdminFinancial = ({ barbers }: AdminFinancialProps) => {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [filterBarber, setFilterBarber] = useState<string | null>(null);

  const monthStart = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedMonth), "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Monthly appointments (completed only)
  const { data: monthlyAppointments } = useQuery({
    queryKey: ["financial-monthly", monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, barbers(name), services(name, price)")
        .eq("status", "completed")
        .gte("appointment_date", monthStart)
        .lte("appointment_date", monthEnd)
        .order("appointment_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Today's completed appointments
  const { data: todayAppointments } = useQuery({
    queryKey: ["financial-today", todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, barbers(name), services(name, price)")
        .eq("status", "completed")
        .eq("appointment_date", todayStr)
        .order("appointment_time", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filtered = filterBarber
    ? monthlyAppointments?.filter((a) => a.barber_id === filterBarber)
    : monthlyAppointments;

  const todayFiltered = filterBarber
    ? todayAppointments?.filter((a) => a.barber_id === filterBarber)
    : todayAppointments;

  // Service breakdown
  const serviceBreakdown = (data: typeof filtered) => {
    const map: Record<string, { count: number; total: number }> = {};
    data?.forEach((a) => {
      const name = (a.services as any)?.name || "Outro";
      const price = Number((a.services as any)?.price || 0);
      if (!map[name]) map[name] = { count: 0, total: 0 };
      map[name].count++;
      map[name].total += price;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  };

  // Barber breakdown
  const barberBreakdown = () => {
    const map: Record<string, { name: string; count: number; total: number }> = {};
    monthlyAppointments?.forEach((a) => {
      const barberId = a.barber_id;
      const barberName = (a.barbers as any)?.name || "Desconhecido";
      const price = Number((a.services as any)?.price || 0);
      if (!map[barberId]) map[barberId] = { name: barberName, count: 0, total: 0 };
      map[barberId].count++;
      map[barberId].total += price;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  };

  const monthlyTotal = filtered?.reduce((sum, a) => sum + Number((a.services as any)?.price || 0), 0) || 0;
  const todayTotal = todayFiltered?.reduce((sum, a) => sum + Number((a.services as any)?.price || 0), 0) || 0;
  const monthlyServices = serviceBreakdown(filtered);
  const todayServices = serviceBreakdown(todayFiltered);
  const barberStats = barberBreakdown();
  const motivation = getMotivationalMessage(monthlyTotal);
  const MotivationIcon = motivation.icon;

  return (
    <div className="space-y-6">
      {/* Month selector + filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          <span className="text-gold-gradient">Fechamento Financeiro</span>
        </h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedMonth}
              onSelect={(d) => d && setSelectedMonth(d)}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Barber filter */}
      <div className="flex items-center gap-2 flex-wrap">
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

      {/* Motivational message */}
      <div className={cn(
        "bg-card border border-border rounded-xl p-4 flex items-center gap-3",
        monthlyTotal >= 3000 && "border-primary/40"
      )}>
        <MotivationIcon className={cn("w-8 h-8 shrink-0", motivation.color)} />
        <div>
          <p className="font-bold text-lg">{motivation.msg}</p>
          <p className="text-sm text-muted-foreground">
            Faturamento do mês: <span className="text-primary font-bold text-base">R$ {monthlyTotal.toFixed(2)}</span>
          </p>
        </div>
      </div>

      {/* Today's closing */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Scissors className="w-5 h-5 text-primary" />
          Fechamento de Hoje
        </h3>
        {todayServices.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum serviço concluído hoje</p>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              {todayServices.map(([name, data]) => (
                <div key={name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{name}</span>
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                      {data.count}x
                    </span>
                  </div>
                  <span className="font-bold text-primary">R$ {data.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-primary/30">
              <span className="font-bold text-lg">Total do Dia</span>
              <span className="font-bold text-xl text-primary">R$ {todayTotal.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      {/* Monthly breakdown by service */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Detalhamento do Mês — {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
        </h3>
        {monthlyServices.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum serviço concluído neste mês</p>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {monthlyServices.map(([name, data]) => {
                const percentage = monthlyTotal > 0 ? (data.total / monthlyTotal) * 100 : 0;
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{name}</span>
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          {data.count} serviços
                        </span>
                      </div>
                      <span className="font-bold text-primary">R$ {data.total.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-gold-gradient h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-primary/30">
              <span className="font-bold text-lg">Total do Mês</span>
              <span className="font-bold text-2xl text-primary">R$ {monthlyTotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filtered?.length || 0} serviços concluídos
            </p>
          </>
        )}
      </div>

      {/* Per-barber breakdown */}
      {!filterBarber && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Faturamento por Barbeiro — {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
          </h3>
          {barberStats.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum dado disponível</p>
          ) : (
            <div className="space-y-4">
              {barberStats.map(([id, data], index) => {
                const totalAll = barberStats.reduce((s, [, d]) => s + d.total, 0);
                const percentage = totalAll > 0 ? (data.total / totalAll) * 100 : 0;
                return (
                  <div key={id} className={cn(
                    "p-4 rounded-lg border",
                    index === 0 ? "border-primary/40 bg-primary/5" : "border-border"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Trophy className="w-4 h-4 text-primary" />}
                        <span className="font-bold text-lg">{data.name}</span>
                      </div>
                      <span className="font-bold text-xl text-primary">R$ {data.total.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                      <span>{data.count} serviços concluídos</span>
                      <span>{percentage.toFixed(0)}% do total</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-gold-gradient h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between items-center pt-3 border-t border-primary/30">
                <span className="font-bold text-lg">Total Geral</span>
                <span className="font-bold text-2xl text-primary">
                  R$ {barberStats.reduce((s, [, d]) => s + d.total, 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminFinancial;
