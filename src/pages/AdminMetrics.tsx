import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { KpiCard } from "@/components/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Activity, AlertTriangle, Cpu, BarChart3, Zap } from "lucide-react";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface AiUsageLog {
  id: string;
  empresa_id: string | null;
  user_id: string | null;
  analysis_id: string | null;
  training_id: string | null;
  action_type: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  audio_seconds: number;
  estimated_cost_usd: number;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  analysis: "Análise",
  reanalysis: "Reanálise",
  training_generation: "Geração de Treino",
  training_evaluation: "Avaliação de Treino",
  radar_diagnosis: "Diagnóstico Radar",
  objection_map: "Mapa de Objeções",
  financial_ai_analysis: "Análise Financeira IA",
  summary: "Resumo",
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 50%)",
  "hsl(150, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(340, 65%, 50%)",
];

export default function AdminMetrics() {
  const { isFounderEmail, isLoading: roleLoading } = useUserRole();
  const [periodFilter, setPeriodFilter] = useState("30d");
  const [actionFilter, setActionFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");

  const dateFrom = useMemo(() => {
    const d = new Date();
    if (periodFilter === "7d") d.setDate(d.getDate() - 7);
    else if (periodFilter === "30d") d.setDate(d.getDate() - 30);
    else if (periodFilter === "90d") d.setDate(d.getDate() - 90);
    else d.setFullYear(d.getFullYear() - 1);
    return d.toISOString();
  }, [periodFilter]);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["ai-usage-logs", dateFrom],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_usage_logs")
        .select("*")
        .gte("created_at", dateFrom)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as unknown as AiUsageLog[];
    },
    enabled: isFounderEmail,
  });

  // Also fetch old analysis metrics for backward compat
  const { data: legacyAnalyses = [] } = useQuery({
    queryKey: ["admin-metrics-legacy", dateFrom],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyses")
        .select("id, operador, carteira, created_at, modelo_usado, tokens_prompt, tokens_resposta, tokens_total, custo_estimado, tempo_resposta, duracao_audio_total")
        .gte("created_at", dateFrom)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    enabled: isFounderEmail,
  });

  const filtered = useMemo(() => {
    let result = logs;
    if (actionFilter !== "all") result = result.filter(l => l.action_type === actionFilter);
    if (providerFilter !== "all") result = result.filter(l => l.provider === providerFilter);
    return result;
  }, [logs, actionFilter, providerFilter]);

  const kpis = useMemo(() => {
    const totalCost = filtered.reduce((sum, l) => sum + (l.estimated_cost_usd || 0), 0);
    const analyses = filtered.filter(l => l.action_type === "analysis");
    const trainings = filtered.filter(l => l.action_type.includes("training"));
    const errors = filtered.filter(l => l.status === "error");
    const avgCostAnalysis = analyses.length > 0 ? analyses.reduce((s, l) => s + (l.estimated_cost_usd || 0), 0) / analyses.length : 0;
    const avgCostTraining = trainings.length > 0 ? trainings.reduce((s, l) => s + (l.estimated_cost_usd || 0), 0) / trainings.length : 0;

    return { totalCost, analyses: analyses.length, trainings: trainings.length, errors: errors.length, avgCostAnalysis, avgCostTraining };
  }, [filtered]);

  const byProvider = useMemo(() => {
    const map: Record<string, { count: number; cost: number }> = {};
    filtered.forEach(l => {
      if (!map[l.provider]) map[l.provider] = { count: 0, cost: 0 };
      map[l.provider].count++;
      map[l.provider].cost += l.estimated_cost_usd || 0;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v }));
  }, [filtered]);

  const byModel = useMemo(() => {
    const map: Record<string, { count: number; cost: number }> = {};
    filtered.forEach(l => {
      if (!map[l.model]) map[l.model] = { count: 0, cost: 0 };
      map[l.model].count++;
      map[l.model].cost += l.estimated_cost_usd || 0;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v, cost: Math.round(v.cost * 10000) / 10000 }));
  }, [filtered]);

  const byAction = useMemo(() => {
    const map: Record<string, { count: number; cost: number }> = {};
    filtered.forEach(l => {
      const label = ACTION_LABELS[l.action_type] || l.action_type;
      if (!map[label]) map[label] = { count: 0, cost: 0 };
      map[label].count++;
      map[label].cost += l.estimated_cost_usd || 0;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v, cost: Math.round(v.cost * 10000) / 10000 }));
  }, [filtered]);

  const uniqueProviders = useMemo(() => [...new Set(logs.map(l => l.provider))], [logs]);
  const uniqueActions = useMemo(() => [...new Set(logs.map(l => l.action_type))], [logs]);

  if (roleLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (!isFounderEmail) {
    return <Navigate to="/" replace />;
  }

  const USD_TO_BRL = 5.5;

  return (
    <div className="space-y-6">
      <PageHeader title="Métricas IA" description="Custos reais de IA por ação, empresa e modelo" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 dias</SelectItem>
            <SelectItem value="30d">30 dias</SelectItem>
            <SelectItem value="90d">90 dias</SelectItem>
            <SelectItem value="365d">1 ano</SelectItem>
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Ação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {uniqueActions.map(a => (
              <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Provider" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {uniqueProviders.map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard title="Custo Total IA" value={`R$ ${(kpis.totalCost * USD_TO_BRL).toFixed(2)}`} icon={<DollarSign className="h-4 w-4" />} />
            <KpiCard title="Custo Total (USD)" value={`$ ${kpis.totalCost.toFixed(4)}`} icon={<DollarSign className="h-4 w-4" />} />
            <KpiCard title="Análises" value={String(kpis.analyses)} icon={<Activity className="h-4 w-4" />} />
            <KpiCard title="Treinos" value={String(kpis.trainings)} icon={<Cpu className="h-4 w-4" />} />
            <KpiCard title="Custo Médio/Análise" value={`$ ${kpis.avgCostAnalysis.toFixed(4)}`} icon={<BarChart3 className="h-4 w-4" />} />
            <KpiCard title="Erros" value={String(kpis.errors)} icon={<AlertTriangle className="h-4 w-4" />} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Custo por Tipo de Ação</CardTitle></CardHeader>
              <CardContent>
                {byAction.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={byAction}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => `$ ${v.toFixed(4)}`} />
                      <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-muted-foreground text-sm text-center py-8">Sem dados</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Distribuição por Provider</CardTitle></CardHeader>
              <CardContent>
                {byProvider.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={byProvider} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, count }) => `${name} (${count})`}>
                        {byProvider.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-muted-foreground text-sm text-center py-8">Sem dados</p>}
              </CardContent>
            </Card>
          </div>

          {/* By Model table */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Consumo por Modelo</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Chamadas</TableHead>
                    <TableHead className="text-right">Custo (USD)</TableHead>
                    <TableHead className="text-right">Custo (BRL)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byModel.map(m => (
                    <TableRow key={m.name}>
                      <TableCell className="font-mono text-xs">{m.name}</TableCell>
                      <TableCell className="text-right">{m.count}</TableCell>
                      <TableCell className="text-right">$ {m.cost.toFixed(4)}</TableCell>
                      <TableCell className="text-right">R$ {(m.cost * USD_TO_BRL).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {byModel.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent logs */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" /> Histórico Detalhado</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead className="text-right">Tokens In</TableHead>
                      <TableHead className="text-right">Tokens Out</TableHead>
                      <TableHead className="text-right">Custo (USD)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 50).map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{ACTION_LABELS[l.action_type] || l.action_type}</Badge></TableCell>
                        <TableCell className="text-xs">{l.provider}</TableCell>
                        <TableCell className="font-mono text-xs">{l.model}</TableCell>
                        <TableCell className="text-right text-xs">{l.input_tokens.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-xs">{l.output_tokens.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-xs">$ {l.estimated_cost_usd.toFixed(4)}</TableCell>
                        <TableCell>
                          <Badge variant={l.status === "success" ? "default" : "destructive"} className="text-xs">
                            {l.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {filtered.length > 50 && (
                <p className="text-xs text-muted-foreground text-center mt-2">Mostrando 50 de {filtered.length} registros</p>
              )}
            </CardContent>
          </Card>

          {/* Legacy analysis metrics */}
          {legacyAnalyses.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Métricas de Análises (legado)</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Dados da tabela analyses (antes do ai_usage_logs)</p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Operador</TableHead>
                        <TableHead>Carteira</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                        <TableHead className="text-right">Custo (USD)</TableHead>
                        <TableHead className="text-right">Tempo (s)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {legacyAnalyses.slice(0, 30).map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="text-xs">{new Date(a.created_at).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell className="text-xs">{a.operador}</TableCell>
                          <TableCell className="text-xs">{a.carteira}</TableCell>
                          <TableCell className="font-mono text-xs">{a.modelo_usado || "—"}</TableCell>
                          <TableCell className="text-right text-xs">{a.tokens_total?.toLocaleString() || "—"}</TableCell>
                          <TableCell className="text-right text-xs">{a.custo_estimado ? `$ ${a.custo_estimado}` : "—"}</TableCell>
                          <TableCell className="text-right text-xs">{a.tempo_resposta || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
