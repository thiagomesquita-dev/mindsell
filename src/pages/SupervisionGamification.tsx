import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { useAuth } from "@/contexts/AuthContext";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";
import { useMemo } from "react";
import { startOfWeek, endOfWeek, format, subDays, startOfDay, parseISO, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, Trophy, Users, Activity, TrendingDown, Info, Dumbbell } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

function getWeekRange() {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });
  return { start, end };
}

function getReliability(count: number) {
  if (count >= 10) return { label: "Alta", color: "🟢", variant: "default" as const, tooltip: "10+ análises — amostra confiável" };
  if (count >= 5) return { label: "Média", color: "🟡", variant: "secondary" as const, tooltip: "5–9 análises — amostra moderada" };
  return { label: "Baixa", color: "🔴", variant: "destructive" as const, tooltip: "0–4 análises — amostra insuficiente" };
}

function calcScore(count: number, avgQuality: number) {
  const volumeFactor = Math.min(1, count / 10);
  return (avgQuality * 10 * volumeFactor) + (count * 2);
}

export default function SupervisionGamification() {
  const { profile } = useAuth();
  const { filterByDate } = useDateFilter();
  const { getEmpresaFilter, isFounder } = useCompanyFilter();
  const empresaFilter = getEmpresaFilter();
  const { start, end } = getWeekRange();

  const { data: weekAnalyses = [], isLoading } = useQuery({
    queryKey: ["gamification-week", empresaFilter, isFounder, start.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("analyses")
        .select("id, user_id, score, created_at")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isFounder || !!empresaFilter,
  });

  const { data: allProfiles = [] } = useQuery({
    queryKey: ["gamification-profiles", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, nome, email, status")
        .eq("status", "ativo");
      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isFounder || !!empresaFilter,
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ["gamification-roles", empresaFilter, isFounder],
    queryFn: async () => {
      const profileIds = allProfiles.map((p) => p.id);
      if (profileIds.length === 0) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", profileIds);
      if (error) throw error;
      return data;
    },
    enabled: (isFounder || !!empresaFilter) && allProfiles.length > 0,
  });

  const companyProfiles = useMemo(() => {
    const supervisorIds = new Set(
      allRoles.filter((r) => r.role === "supervisor").map((r) => r.user_id)
    );
    return allProfiles.filter((p) => supervisorIds.has(p.id));
  }, [allProfiles, allRoles]);

  const { data: last7DaysAnalyses = [] } = useQuery({
    queryKey: ["gamification-7days", empresaFilter, isFounder],
    queryFn: async () => {
      const sevenDaysAgo = startOfDay(subDays(new Date(), 6));
      let query = supabase
        .from("analyses")
        .select("id, created_at")
        .gte("created_at", sevenDaysAgo.toISOString());
      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isFounder || !!empresaFilter,
  });

  // Training sessions KPIs
  const { data: trainingSessions = [] } = useQuery({
    queryKey: ["training-sessions-radar", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("training_sessions")
        .select("id, status, nota_final, entendimento, supervisor_id");
      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isFounder || !!empresaFilter,
  });

  const trainingKpis = useMemo(() => {
    const total = trainingSessions.length;
    const responded = trainingSessions.filter((t: any) => t.status === "respondido");
    const taxa = total > 0 ? Math.round((responded.length / total) * 100) : 0;
    const notas = responded.filter((t: any) => t.nota_final != null).map((t: any) => Number(t.nota_final));
    const notaMedia = notas.length > 0 ? Math.round((notas.reduce((a: number, b: number) => a + b, 0) / notas.length) * 10) / 10 : 0;
    return { total, respondidos: responded.length, taxa, notaMedia };
  }, [trainingSessions]);

  const trainingBySupervisor = useMemo(() => {
    const map: Record<string, { gerados: number; respondidos: number }> = {};
    for (const t of trainingSessions) {
      const sid = (t as any).supervisor_id as string;
      if (!sid) continue;
      if (!map[sid]) map[sid] = { gerados: 0, respondidos: 0 };
      map[sid].gerados += 1;
      if (t.status === "respondido") map[sid].respondidos += 1;
    }
    return map;
  }, [trainingSessions]);

  const ranking = useMemo(() => {
    const byUser: Record<string, { count: number; totalScore: number }> = {};

    for (const a of weekAnalyses) {
      if (!byUser[a.user_id]) byUser[a.user_id] = { count: 0, totalScore: 0 };
      byUser[a.user_id].count += 1;
      byUser[a.user_id].totalScore += Number(a.score ?? 0);
    }

    return companyProfiles
      .map((p) => {
        const stats = byUser[p.id] || { count: 0, totalScore: 0 };
        const avgQuality = stats.count > 0 ? stats.totalScore / stats.count : 0;
        const finalScore = calcScore(stats.count, avgQuality);
        const reliability = getReliability(stats.count);
        const training = trainingBySupervisor[p.id] || { gerados: 0, respondidos: 0 };
        return {
          id: p.id,
          nome: p.nome || p.email,
          count: stats.count,
          avgQuality: Math.round(avgQuality * 10) / 10,
          finalScore: Math.round(finalScore * 10) / 10,
          reliability,
          treinosGerados: training.gerados,
          treinosRespondidos: training.respondidos,
        };
      })
      .sort((a, b) => b.finalScore - a.finalScore);
  }, [weekAnalyses, companyProfiles, trainingBySupervisor]);

  const totalAnalyses = weekAnalyses.length;
  const activeSupervisors = ranking.filter((r) => r.count > 0).length;
  const totalSupervisors = ranking.length;
  const avgAnalyses = totalSupervisors > 0 ? Math.round(totalAnalyses / totalSupervisors) : 0;
  const pctActive = totalSupervisors > 0 ? Math.round((activeSupervisors / totalSupervisors) * 100) : 0;
  const pctInactive = 100 - pctActive;

  const inactiveSupervisors = ranking.filter((r) => r.count === 0);

  const chartData = useMemo(() => {
    if (last7DaysAnalyses.length === 0) return [];

    const parsedDays = last7DaysAnalyses
      .map((a) => startOfDay(parseISO(a.created_at)))
      .sort((a, b) => a.getTime() - b.getTime());

    const startDate = parsedDays[0];
    const endDate = parsedDays[parsedDays.length - 1];

    const counts = new Map<string, number>();
    for (const a of last7DaysAnalyses) {
      const key = format(parseISO(a.created_at), "yyyy-MM-dd");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return eachDayOfInterval({ start: startDate, end: endDate }).map((day) => {
      const key = format(day, "yyyy-MM-dd");
      return {
        dia: format(day, "EEE dd/MM", { locale: ptBR }),
        análises: counts.get(key) ?? 0,
      };
    });
  }, [last7DaysAnalyses]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-8 p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Radar da Supervisão"
          description="Engajamento e performance da equipe de supervisão"
        />

        {/* Explicação do ranking */}
        <div className="bg-muted/50 border border-border rounded-xl p-5 flex gap-3 items-start">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-heading text-sm font-semibold text-foreground mb-1">
              Como funciona o ranking?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O ranking considera dois fatores principais: <strong>qualidade das análises (AIDA)</strong> e{" "}
              <strong>volume de análises realizadas</strong>. A qualidade só tem peso total quando há volume
              suficiente. Supervisores com poucas análises têm sua nota ajustada automaticamente, evitando
              distorções no ranking. Isso garante que o ranking reflita <strong>consistência</strong>, não
              apenas desempenho pontual.
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Análises na Semana"
            value={totalAnalyses}
            icon={<Activity className="h-5 w-5" />}
            tooltip="Total de análises realizadas na semana corrente"
          />
          <KpiCard
            title="Média por Supervisor"
            value={avgAnalyses}
            icon={<Users className="h-5 w-5" />}
            tooltip="Média de análises por supervisor ativo"
          />
          <KpiCard
            title="Supervisores Ativos"
            value={`${pctActive}%`}
            icon={<Trophy className="h-5 w-5" />}
            tooltip="Percentual de supervisores com pelo menos 1 análise"
          />
          <KpiCard
            title="Supervisores Inativos"
            value={`${pctInactive}%`}
            icon={<TrendingDown className="h-5 w-5" />}
            tooltip="Percentual de supervisores sem análises na semana"
          />
        </div>

        {/* Training KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Treinos Gerados"
            value={trainingKpis.total}
            icon={<Dumbbell className="h-5 w-5" />}
            tooltip="Total de treinos gerados via link"
          />
          <KpiCard
            title="Treinos Respondidos"
            value={trainingKpis.respondidos}
            icon={<Dumbbell className="h-5 w-5" />}
            tooltip="Treinos que os operadores responderam"
          />
          <KpiCard
            title="Taxa de Conclusão"
            value={`${trainingKpis.taxa}%`}
            icon={<Activity className="h-5 w-5" />}
            tooltip="Percentual de treinos respondidos"
          />
          <KpiCard
            title="Nota Média Treinos"
            value={trainingKpis.notaMedia}
            icon={<Trophy className="h-5 w-5" />}
            tooltip="Nota média das avaliações de treino"
          />
        </div>

        {inactiveSupervisors.length > 0 && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Supervisores sem análises nesta semana</AlertTitle>
            <AlertDescription>
              {inactiveSupervisors.map((s) => s.nome).join(", ")}
            </AlertDescription>
          </Alert>
        )}

        {/* Ranking */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
            Ranking Semanal de Supervisão
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead className="text-center">Análises</TableHead>
                <TableHead className="text-center">Treinos Aplicados</TableHead>
                <TableHead className="text-center">Treinos Respondidos</TableHead>
                <TableHead className="text-center">Qualidade Média</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Confiabilidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell className="font-bold text-muted-foreground">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      {r.nome}
                      {r.count < 5 && r.count > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                          Amostra baixa
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{r.count}</TableCell>
                  <TableCell className="text-center">{r.treinosGerados}</TableCell>
                  <TableCell className="text-center">{r.treinosRespondidos}</TableCell>
                  <TableCell className="text-center">{r.avgQuality}</TableCell>
                  <TableCell className="text-center font-bold">{r.finalScore}</TableCell>
                  <TableCell className="text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Badge variant={r.reliability.variant}>
                            {r.reliability.color} {r.reliability.label}
                          </Badge>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{r.reliability.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {ranking.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhum supervisor encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Evolução - últimos 7 dias */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
            Evolução — Últimos 7 dias
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dia" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} allowDecimals={false} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="análises"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </TooltipProvider>
  );
}
