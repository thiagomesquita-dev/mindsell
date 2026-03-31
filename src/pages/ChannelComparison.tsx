import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PortfolioFilter } from "@/components/PortfolioFilter";
import { usePortfolioFilter } from "@/hooks/usePortfolioFilter";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";
import { Phone, MessageSquare, ArrowUpRight, ArrowDownRight, Minus, Calendar, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AidaJson = { nota?: number } | null;

interface AnalysisRow {
  canal: string;
  carteira: string;
  operador: string;
  score: number | null;
  aida_atencao: AidaJson;
  aida_interesse: AidaJson;
  aida_desejo: AidaJson;
  aida_acao: AidaJson;
  objecao: string | null;
  created_at: string;
}

const PERIODS = [
  { label: "Últimos 7 dias", days: 7 },
  { label: "Últimos 15 dias", days: 15 },
  { label: "Últimos 30 dias", days: 30 },
  { label: "Últimos 90 dias", days: 90 },
];

function getAidaScore(val: AidaJson): number | null {
  if (!val || typeof val !== "object") return null;
  const nota = (val as { nota?: number }).nota;
  return nota != null ? Number(nota) : null;
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

interface ChannelStats {
  count: number;
  avgScore: number;
  avgAtencao: number;
  avgInteresse: number;
  avgDesejo: number;
  avgAcao: number;
  objectionRate: number;
}

function computeStats(items: AnalysisRow[]): ChannelStats {
  const scores = items.map((a) => a.score).filter((v): v is number => v != null).map(Number);
  const atencao = items.map((a) => getAidaScore(a.aida_atencao)).filter((v): v is number => v != null);
  const interesse = items.map((a) => getAidaScore(a.aida_interesse)).filter((v): v is number => v != null);
  const desejo = items.map((a) => getAidaScore(a.aida_desejo)).filter((v): v is number => v != null);
  const acao = items.map((a) => getAidaScore(a.aida_acao)).filter((v): v is number => v != null);
  const withObjection = items.filter((a) => !!a.objecao).length;

  return {
    count: items.length,
    avgScore: +avg(scores).toFixed(1),
    avgAtencao: +avg(atencao).toFixed(1),
    avgInteresse: +avg(interesse).toFixed(1),
    avgDesejo: +avg(desejo).toFixed(1),
    avgAcao: +avg(acao).toFixed(1),
    objectionRate: items.length ? Math.round((withObjection / items.length) * 100) : 0,
  };
}

function DiffBadge({ a, b, suffix = "", invert = false }: { a: number; b: number; suffix?: string; invert?: boolean }) {
  const diff = a - b;
  if (Math.abs(diff) < 0.1) return <Minus className="h-3.5 w-3.5 text-muted-foreground inline" />;
  const positive = invert ? diff < 0 : diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? "text-success" : "text-destructive"}`}>
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(diff).toFixed(1)}{suffix}
    </span>
  );
}

interface MetricRowProps {
  label: string;
  ligacao: number;
  whatsapp: number;
  suffix?: string;
  invert?: boolean;
}

function MetricRow({ label, ligacao, whatsapp, suffix = "", invert = false }: MetricRowProps) {
  return (
    <div className="grid grid-cols-3 items-center py-3 border-b border-border/50 last:border-0">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="text-center">
        <span className="text-lg font-heading font-bold text-foreground">{ligacao}{suffix}</span>
      </div>
      <div className="text-center flex items-center justify-center gap-2">
        <span className="text-lg font-heading font-bold text-foreground">{whatsapp}{suffix}</span>
        <DiffBadge a={whatsapp} b={ligacao} suffix={suffix} invert={invert} />
      </div>
    </div>
  );
}

export default function ChannelComparison() {
  const { profile } = useAuth();
  const { carteiras, selected, setSelected, showAllOption } = usePortfolioFilter();
  const { filterByDate } = useDateFilter();
  const { getEmpresaFilter, isFounder } = useCompanyFilter();
  const empresaFilter = getEmpresaFilter();
  const [periodDays, setPeriodDays] = useState(30);
  const [operador, setOperador] = useState("Todos");

  const { data: analyses = [] } = useQuery({
    queryKey: ["channel-comparison", empresaFilter, isFounder, periodDays],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - periodDays);
      let query = supabase
        .from("analyses")
        .select("canal, carteira, operador, score, aida_atencao, aida_interesse, aida_desejo, aida_acao, objecao, created_at")
        .gte("created_at", since.toISOString());
      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AnalysisRow[];
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  const operators = useMemo(() => {
    const set = new Set(analyses.map((a) => a.operador));
    return Array.from(set).sort();
  }, [analyses]);

  const filtered = useMemo(() => {
    let items = filterByDate(analyses);
    if (selected !== "Todas") items = items.filter((a) => a.carteira === selected);
    if (operador !== "Todos") items = items.filter((a) => a.operador === operador);
    return items;
  }, [analyses, selected, operador, filterByDate]);

  const ligacaoItems = useMemo(() => filtered.filter((a) => a.canal === "call"), [filtered]);
  const whatsappItems = useMemo(() => filtered.filter((a) => a.canal === "whatsapp"), [filtered]);

  const ligacao = computeStats(ligacaoItems);
  const whatsapp = computeStats(whatsappItems);
  const total = ligacao.count + whatsapp.count;

  return (
    <div>
      <PageHeader
        title="Comparação por Canal"
        description="Desempenho lado a lado: Ligação vs WhatsApp"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <PortfolioFilter carteiras={carteiras} selected={selected} onSelect={setSelected} showAllOption={showAllOption} />

        <div className="flex items-center gap-3">
          <User className="h-4 w-4 text-muted-foreground" />
          <Select value={operador} onValueChange={setOperador}>
            <SelectTrigger className="w-48 bg-secondary border-border text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="Todos" className="text-sm">Todos os operadores</SelectItem>
              {operators.map((op) => (
                <SelectItem key={op} value={op} className="text-sm">{op}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={String(periodDays)} onValueChange={(v) => setPeriodDays(Number(v))}>
            <SelectTrigger className="w-44 bg-secondary border-border text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {PERIODS.map((p) => (
                <SelectItem key={p.days} value={String(p.days)} className="text-sm">{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {total === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">Nenhuma análise encontrada para o período e filtros selecionados.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground">Ligação</h3>
                  <p className="text-xs text-muted-foreground">{ligacao.count} negociações</p>
                </div>
              </div>
              <div className="text-3xl font-heading font-bold text-primary">{ligacao.avgScore}</div>
              <p className="text-xs text-muted-foreground mt-1">Qualidade média</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-success/10">
                  <MessageSquare className="h-5 w-5 text-success" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground">WhatsApp</h3>
                  <p className="text-xs text-muted-foreground">{whatsapp.count} negociações</p>
                </div>
              </div>
              <div className="text-3xl font-heading font-bold text-success">{whatsapp.avgScore}</div>
              <p className="text-xs text-muted-foreground mt-1">Qualidade média</p>
            </div>
          </div>

          {/* Side by side table */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-6">Comparação Detalhada</h2>

            {/* Header */}
            <div className="grid grid-cols-3 items-center pb-3 border-b border-border mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Métrica</span>
              <div className="text-center flex items-center justify-center gap-2">
                <Phone className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ligação</span>
              </div>
              <div className="text-center flex items-center justify-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-success" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">WhatsApp</span>
              </div>
            </div>

            <MetricRow label="Negociações" ligacao={ligacao.count} whatsapp={whatsapp.count} />
            <MetricRow label="Qualidade Média" ligacao={ligacao.avgScore} whatsapp={whatsapp.avgScore} />
            <MetricRow label="Média Atenção" ligacao={ligacao.avgAtencao} whatsapp={whatsapp.avgAtencao} />
            <MetricRow label="Média Interesse" ligacao={ligacao.avgInteresse} whatsapp={whatsapp.avgInteresse} />
            <MetricRow label="Média Desejo" ligacao={ligacao.avgDesejo} whatsapp={whatsapp.avgDesejo} />
            <MetricRow label="Média Ação" ligacao={ligacao.avgAcao} whatsapp={whatsapp.avgAcao} />
            <MetricRow label="Taxa de Objeções" ligacao={ligacao.objectionRate} whatsapp={whatsapp.objectionRate} suffix="%" invert />
          </div>
        </>
      )}
    </div>
  );
}
