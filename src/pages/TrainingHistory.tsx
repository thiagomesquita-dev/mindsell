import { useState, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PortfolioFilter } from "@/components/PortfolioFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, Info, Copy, Check } from "lucide-react";
import { getGradeBand, TRAINING_TOOLTIPS } from "@/lib/trainingMetrics";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePortfolioFilter } from "@/hooks/usePortfolioFilter";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";
import { toast } from "sonner";

type TrainingRow = {
  id: string;
  created_at: string;
  operador: string;
  carteira: string;
  supervisor_nome: string;
  status: string;
  nota_final: number | null;
  entendimento: string | null;
  coerencia: string | null;
  nivel_aprendizado: string | null;
  qualidade_resposta: string | null;
  training_content: Record<string, unknown> | null;
  origem: string;
  token: string;
};

function statusBadge(status: string) {
  if (status === "respondido") return <Badge className="bg-success/20 text-success border-0 text-xs">Respondido</Badge>;
  if (status === "expirado") return <Badge className="bg-muted text-muted-foreground border-0 text-xs">Expirado</Badge>;
  return <Badge className="bg-warning/20 text-warning border-0 text-xs">Pendente</Badge>;
}

function levelBadge(val?: string | null) {
  if (!val) return <span className="text-muted-foreground">—</span>;
  if (val === "alto" || val === "alta") return <Badge className="bg-success/20 text-success border-0 text-xs">Alto</Badge>;
  if (val === "medio" || val === "media") return <Badge className="bg-warning/20 text-warning border-0 text-xs">Médio</Badge>;
  return <Badge className="bg-destructive/20 text-destructive border-0 text-xs">Baixo</Badge>;
}

export default function TrainingHistory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [operatorFilter, setOperatorFilter] = useState(searchParams.get("operador") || "Todos");
  const [supervisorFilter, setSupervisorFilter] = useState(searchParams.get("supervisor") || "Todos");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "Todos");
  const navigate = useNavigate();
  const { profile } = useAuth();
  const portfolio = usePortfolioFilter(searchParams.get("carteira") || undefined);
  const { filterByDate } = useDateFilter();
  const { getEmpresaFilter, isFounder } = useCompanyFilter();
  const empresaFilter = getEmpresaFilter();

  const { data: sessions = [] } = useQuery({
    queryKey: ["training-history", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("training_sessions")
        .select("id, created_at, operador, carteira, supervisor_nome, status, nota_final, entendimento, coerencia, nivel_aprendizado, qualidade_resposta, training_content, origem, token")
        .order("created_at", { ascending: false });
      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TrainingRow[];
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  const carteiraFiltered = filterByDate(portfolio.filterByCarteira(sessions));

  const operators = useMemo(() => [...new Set(carteiraFiltered.map((s) => s.operador))].sort(), [carteiraFiltered]);
  const supervisors = useMemo(() => [...new Set(carteiraFiltered.map((s) => s.supervisor_nome).filter(Boolean))].sort(), [carteiraFiltered]);

  const effectiveOperator = operators.includes(operatorFilter) ? operatorFilter : "Todos";
  const effectiveSupervisor = supervisors.includes(supervisorFilter) ? supervisorFilter : "Todos";

  const updateParams = useCallback((carteira: string, operador: string, supervisor: string, status: string) => {
    const params = new URLSearchParams();
    if (carteira !== "Todas") params.set("carteira", carteira);
    if (operador !== "Todos") params.set("operador", operador);
    if (supervisor !== "Todos") params.set("supervisor", supervisor);
    if (status !== "Todos") params.set("status", status);
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const handleCarteiraChange = useCallback((v: string) => {
    portfolio.setSelected(v);
    setOperatorFilter("Todos");
    setSupervisorFilter("Todos");
    updateParams(v, "Todos", "Todos", statusFilter);
  }, [statusFilter, updateParams, portfolio]);

  const filtered = carteiraFiltered.filter((s) => {
    if (effectiveOperator !== "Todos" && s.operador !== effectiveOperator) return false;
    if (effectiveSupervisor !== "Todos" && s.supervisor_nome !== effectiveSupervisor) return false;
    if (statusFilter !== "Todos" && s.status !== statusFilter) return false;
    return true;
  });

  const getErro = (s: TrainingRow) => {
    const content = s.training_content as Record<string, unknown> | null;
    return (content?.erro_comum as string) || "—";
  };

  const getTipo = (s: TrainingRow): string => {
    if (s.origem === "completo") return "Completo";
    return "Pontual";
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopyLink = useCallback((row: TrainingRow) => {
    const link = `https://app.cobramind.ia.br/treino/${row.token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(row.id);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const TIPO_TOOLTIP = "Tipo do treinamento:\n\n• Pontual: focado em uma situação ou erro específico de uma análise\n• Completo: baseado na visão evolutiva e nos padrões do operador";

  const currentFilterParams = useMemo(() => {
    const params = new URLSearchParams();
    if (portfolio.selected !== "Todas") params.set("carteira", portfolio.selected);
    if (effectiveOperator !== "Todos") params.set("operador", effectiveOperator);
    if (effectiveSupervisor !== "Todos") params.set("supervisor", effectiveSupervisor);
    if (statusFilter !== "Todos") params.set("status", statusFilter);
    return params.toString();
  }, [portfolio.selected, effectiveOperator, effectiveSupervisor, statusFilter]);

  return (
    <div>
      <PageHeader title="Treinamentos" description="Acompanhe os treinamentos aplicados, respostas e evolução dos operadores" />

      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <PortfolioFilter
            carteiras={portfolio.carteiras}
            selected={portfolio.selected}
            onSelect={handleCarteiraChange}
            showAllOption={portfolio.showAllOption}
          />
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Operador:</span>
            <Select value={effectiveOperator} onValueChange={(v) => { setOperatorFilter(v); updateParams(portfolio.selected, v, effectiveSupervisor, statusFilter); }}>
              <SelectTrigger className="w-44 bg-secondary border-border text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="Todos" className="text-sm">Todos</SelectItem>
                {operators.map((op) => <SelectItem key={op} value={op} className="text-sm">{op}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Supervisor:</span>
            <Select value={effectiveSupervisor} onValueChange={(v) => { setSupervisorFilter(v); updateParams(portfolio.selected, effectiveOperator, v, statusFilter); }}>
              <SelectTrigger className="w-44 bg-secondary border-border text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="Todos" className="text-sm">Todos</SelectItem>
                {supervisors.map((s) => <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Status:</span>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); updateParams(portfolio.selected, effectiveOperator, effectiveSupervisor, v); }}>
              <SelectTrigger className="w-36 bg-secondary border-border text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="Todos" className="text-sm">Todos</SelectItem>
                <SelectItem value="respondido" className="text-sm">Respondido</SelectItem>
                <SelectItem value="pendente" className="text-sm">Pendente</SelectItem>
                <SelectItem value="expirado" className="text-sm">Expirado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="border-b border-border">
              <TooltipProvider>
                {["Data", "Operador", "Carteira", "Supervisor", "Tema", "Tipo", "Nota", "Entendimento", "Coerência", "Status", "Ações"].map((h) => {
                  const tip = h === "Nota" ? TRAINING_TOOLTIPS.nota_final
                    : h === "Entendimento" ? TRAINING_TOOLTIPS.entendimento
                    : h === "Coerência" ? TRAINING_TOOLTIPS.coerencia
                    : h === "Tipo" ? TIPO_TOOLTIP
                    : null;
                  return (
                    <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      {tip ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 cursor-help">{h} <Info className="h-3 w-3" /></span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs whitespace-pre-line text-xs">{tip}</TooltipContent>
                        </Tooltip>
                      ) : h}
                    </th>
                  );
                })}
              </TooltipProvider>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">Nenhum treinamento encontrado</td></tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{new Date(row.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3 text-foreground">{row.operador}</td>
                  <td className="px-4 py-3 text-foreground">{row.carteira}</td>
                  <td className="px-4 py-3 text-foreground">{row.supervisor_nome || "—"}</td>
                  <td className="px-4 py-3 text-foreground max-w-[200px] truncate" title={getErro(row)}>{getErro(row)}</td>
                  <td className="px-4 py-3">
                    <Badge className={`border-0 text-xs ${getTipo(row) === "Completo" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {getTipo(row)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-heading font-bold">
                    <span className={getGradeBand(row.nota_final).color}>
                      {row.nota_final ?? "—"}
                      {row.nota_final != null && <span className="text-xs font-normal ml-1">({getGradeBand(row.nota_final).label})</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">{levelBadge(row.entendimento)}</td>
                  <td className="px-4 py-3">{levelBadge(row.coerencia)}</td>
                  <td className="px-4 py-3">{statusBadge(row.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyLink(row)}
                        className="text-muted-foreground hover:text-primary"
                        title="Copiar link do treino"
                      >
                        {copiedId === row.id ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/training-detail/${row.id}${currentFilterParams ? `?returnTo=${encodeURIComponent(`/training-history?${currentFilterParams}`)}` : ''}`)}
                        className="text-muted-foreground hover:text-primary"
                        disabled={row.status !== "respondido"}
                      >
                        <Eye className="h-4 w-4 mr-1" /> Ver
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
