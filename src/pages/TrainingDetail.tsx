import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, CheckCircle2, XCircle, Brain, Lightbulb, MessageSquareDiff, Wrench, GraduationCap, Target, MessageSquareText, Info } from "lucide-react";
import { getGradeBand, TRAINING_TOOLTIPS } from "@/lib/trainingMetrics";

interface MCQuestion {
  pergunta: string;
  alternativas: string[];
  resposta_correta: number;
}

interface TrainingContent {
  cenario?: { fala_cliente?: string; contexto_emocional?: string };
  objetivo_operador?: string[];
  script_ideal?: string;
  erro_comum?: string;
  nivel_dificuldade?: string;
  pergunta_interpretacao?: MCQuestion;
  pergunta_decisao?: MCQuestion;
}

interface AidaEval {
  atencao: number;
  atencao_justificativa?: string;
  interesse: number;
  interesse_justificativa?: string;
  desejo: number;
  desejo_justificativa?: string;
  acao: number;
  acao_justificativa?: string;
}

interface Evaluation {
  aida?: AidaEval;
  resumo_nota?: string;
  nota_final?: number;
  qualidade_resposta?: string;
  entendimento?: string;
  coerencia?: string;
  nivel_aprendizado?: string;
  diagnostico?: string;
  ponto_forte?: string;
  principal_erro?: string;
  como_corrigir?: string;
  resposta_recomendada?: string;
  licao_esperada?: string;
  feedback?: string;
  interpretacao_correta?: string;
  explicacao_interpretacao?: string;
  decisao_ideal?: string;
  explicacao_decisao?: string;
}

function qualityBadge(val?: string | null) {
  if (!val) return null;
  if (val === "alta" || val === "alto") return <Badge className="bg-success/20 text-success border-0 text-xs">Alto</Badge>;
  if (val === "media" || val === "medio") return <Badge className="bg-warning/20 text-warning border-0 text-xs">Médio</Badge>;
  return <Badge className="bg-destructive/20 text-destructive border-0 text-xs">Baixo</Badge>;
}

function AidaBar({ label, value, justification }: { label: string; value: number; justification?: string }) {
  const pct = (value / 10) * 100;
  const color = value >= 7 ? "bg-success" : value >= 4 ? "bg-warning" : "bg-destructive";
  const textColor = value >= 7 ? "text-success" : value >= 4 ? "text-warning" : "text-destructive";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-heading font-bold text-foreground">{value}/10</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {justification && (
        <p className={`text-xs italic ${textColor} leading-snug`}>
          "{justification}"
        </p>
      )}
    </div>
  );
}

export default function TrainingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const returnTo = searchParams.get("returnTo") || "/training-history";

  const { data: session, isLoading } = useQuery({
    queryKey: ["training-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!profile?.empresa_id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20 text-muted-foreground">Treinamento não encontrado.</div>
    );
  }

  const content = session.training_content as unknown as TrainingContent;
  const evaluation = session.avaliacao_ia as unknown as Evaluation | null;
  const interpQ = content?.pergunta_interpretacao;
  const decisaoQ = content?.pergunta_decisao;
  const chosenInterp = session.resposta_interpretacao != null ? Number(session.resposta_interpretacao) : null;
  const chosenDecisao = session.resposta_decisao != null ? Number(session.resposta_decisao) : null;
  const origem = (session as Record<string, unknown>)?.origem as string || "pontual";

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate(returnTo)} className="mb-4 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para Treinamentos
      </Button>

      <PageHeader
        title={`Treino — ${session.operador}`}
        description={`Carteira: ${session.carteira} • Supervisor: ${session.supervisor_nome} • ${new Date(session.created_at).toLocaleDateString("pt-BR")}`}
      />

      {/* Origin badge */}
      <div className="mb-4">
        <Badge className={`border-0 text-xs ${origem === "completo" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
          {origem === "completo" ? "📘 Treino Completo — Baseado na evolução do operador" : "📌 Treino Pontual — Focado em uma análise específica"}
        </Badge>
      </div>

      {/* Status row */}
      <TooltipProvider>
        <div className="flex flex-wrap gap-3 mb-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className={`border-0 ${getGradeBand(session.nota_final).color}`}>
                Nota: {session.nota_final ?? "—"} {session.nota_final != null && `(${getGradeBand(session.nota_final).label})`}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs whitespace-pre-line text-xs">{TRAINING_TOOLTIPS.nota_final}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>{qualityBadge(session.qualidade_resposta)}</TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{TRAINING_TOOLTIPS.qualidade_resposta}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>{qualityBadge(session.entendimento)}</TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{TRAINING_TOOLTIPS.entendimento}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>{qualityBadge(session.coerencia)}</TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{TRAINING_TOOLTIPS.coerencia}</TooltipContent>
          </Tooltip>
          {session.nivel_aprendizado && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className={`border-0 text-xs ${
                  session.nivel_aprendizado === "alto" ? "bg-success/20 text-success" :
                  session.nivel_aprendizado === "medio" ? "bg-warning/20 text-warning" :
                  "bg-destructive/20 text-destructive"
                }`}>
                  Aprendizado: {session.nivel_aprendizado === "alto" ? "Alto" : session.nivel_aprendizado === "medio" ? "Médio" : "Baixo"}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">{TRAINING_TOOLTIPS.nivel_aprendizado}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>

      <div className="grid gap-4">
        {/* Auto-training patterns (only for automatic) */}
        {origem === "automatico" && (
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-primary"><Brain className="h-4 w-4" /> Padrões Identificados (3 análises)</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
              {(content as Record<string, unknown>)?.padrao_erros && (
                <div className="p-3 bg-destructive/5 rounded-lg">
                  <p className="font-medium text-foreground mb-1">Padrão de Erros</p>
                  <p className="text-muted-foreground">{(content as Record<string, unknown>).padrao_erros as string}</p>
                </div>
              )}
              {(content as Record<string, unknown>)?.padrao_objecoes && (
                <div className="p-3 bg-warning/5 rounded-lg">
                  <p className="font-medium text-foreground mb-1">Objeções Frequentes</p>
                  <p className="text-muted-foreground">{(content as Record<string, unknown>).padrao_objecoes as string}</p>
                </div>
              )}
              {(content as Record<string, unknown>)?.licao_central && (
                <div className="p-3 bg-success/5 rounded-lg">
                  <p className="font-medium text-foreground mb-1">Lição Central</p>
                  <p className="text-muted-foreground">{(content as Record<string, unknown>).licao_central as string}</p>
                </div>
              )}
              {(content as Record<string, unknown>)?.prioridade_correcao && (
                <div className="p-3 bg-primary/5 rounded-lg">
                  <p className="font-medium text-foreground mb-1">Prioridade de Correção</p>
                  <p className="text-muted-foreground">{(content as Record<string, unknown>).prioridade_correcao as string}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {/* Cenário + Objetivo */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground"><Target className="h-4 w-4 text-primary" /> Cenário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {content?.cenario?.fala_cliente && <p>💬 {content.cenario.fala_cliente}</p>}
              {content?.cenario?.contexto_emocional && <p>🎭 {content.cenario.contexto_emocional}</p>}
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground"><MessageSquareText className="h-4 w-4 text-primary" /> Objetivo</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {(content?.objetivo_operador || []).map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* AIDA + Como essa nota foi formada */}
        {evaluation?.aida && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground"><Brain className="h-4 w-4 text-primary" /> Como essa nota foi formada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {evaluation.resumo_nota && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm text-foreground font-medium leading-relaxed">
                    💡 {evaluation.resumo_nota}
                  </p>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <AidaBar label="Atenção (abertura e conexão)" value={evaluation.aida.atencao} justification={evaluation.aida.atencao_justificativa} />
                <AidaBar label="Interesse (clareza da explicação)" value={evaluation.aida.interesse} justification={evaluation.aida.interesse_justificativa} />
                <AidaBar label="Desejo (tratamento de objeções)" value={evaluation.aida.desejo} justification={evaluation.aida.desejo_justificativa} />
                <AidaBar label="Ação (fechamento e compromisso)" value={evaluation.aida.acao} justification={evaluation.aida.acao_justificativa} />
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Média AIDA</span>
                <span className="text-sm font-heading font-bold text-primary">
                  {((evaluation.aida.atencao + evaluation.aida.interesse + evaluation.aida.desejo + evaluation.aida.acao) / 4).toFixed(1)}/10
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gabarito Comentado */}
        {(interpQ || decisaoQ) && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground"><GraduationCap className="h-4 w-4 text-primary" /> Gabarito Comentado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {interpQ && (
                <div className="space-y-2 p-3 bg-secondary/50 rounded-lg">
                  <p className="font-medium text-foreground">Interpretação: {interpQ.pergunta}</p>
                  <div className="flex items-center gap-2">
                    {session.acerto_interpretacao ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                    <span className="text-muted-foreground">
                      Resposta do operador: {chosenInterp != null ? interpQ.alternativas[chosenInterp] : "—"}
                    </span>
                  </div>
                  <p className="text-success">✓ Correta: {interpQ.alternativas[interpQ.resposta_correta]}</p>
                  {evaluation?.explicacao_interpretacao && <p className="text-muted-foreground italic">{evaluation.explicacao_interpretacao}</p>}
                </div>
              )}
              {decisaoQ && (
                <div className="space-y-2 p-3 bg-secondary/50 rounded-lg">
                  <p className="font-medium text-foreground">Decisão: {decisaoQ.pergunta}</p>
                  <div className="flex items-center gap-2">
                    {session.acerto_decisao ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                    <span className="text-muted-foreground">
                      Resposta do operador: {chosenDecisao != null ? decisaoQ.alternativas[chosenDecisao] : "—"}
                    </span>
                  </div>
                  <p className="text-success">✓ Correta: {decisaoQ.alternativas[decisaoQ.resposta_correta]}</p>
                  {evaluation?.explicacao_decisao && <p className="text-muted-foreground italic">{evaluation.explicacao_decisao}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Comparação de Resposta */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-foreground"><MessageSquareDiff className="h-4 w-4 text-primary" /> Comparação de Resposta</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-secondary/50 rounded-lg space-y-1">
              <p className="font-medium text-foreground">Resposta do Operador</p>
              <p className="text-muted-foreground">{session.resposta_operador || "—"}</p>
            </div>
            <div className="p-3 bg-primary/5 rounded-lg space-y-1 border border-primary/20">
              <p className="font-medium text-primary">Resposta Ideal — CobraMind</p>
              <p className="text-muted-foreground">{evaluation?.resposta_recomendada || "—"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Aprendizado */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-foreground"><Lightbulb className="h-4 w-4 text-warning" /> Aprendizado</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-secondary/50 rounded-lg space-y-1">
              <p className="font-medium text-foreground">Lição do Operador</p>
              <p className="text-muted-foreground">{session.reflexao_operador || "—"}</p>
            </div>
            <div className="p-3 bg-warning/5 rounded-lg space-y-1 border border-warning/20">
              <p className="font-medium text-warning">Lição Esperada — CobraMind</p>
              <p className="text-muted-foreground">{evaluation?.licao_esperada || "—"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Final */}
        {evaluation && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground"><Wrench className="h-4 w-4 text-primary" /> Feedback Final</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {evaluation.ponto_forte && (
                <div className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /><p className="text-muted-foreground"><span className="font-medium text-foreground">Ponto forte:</span> {evaluation.ponto_forte}</p></div>
              )}
              {evaluation.principal_erro && (
                <div className="flex gap-2"><XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" /><p className="text-muted-foreground"><span className="font-medium text-foreground">Erro principal:</span> {evaluation.principal_erro}</p></div>
              )}
              {evaluation.como_corrigir && (
                <div className="flex gap-2"><Wrench className="h-4 w-4 text-primary shrink-0 mt-0.5" /><p className="text-muted-foreground"><span className="font-medium text-foreground">Como corrigir:</span> {evaluation.como_corrigir}</p></div>
              )}
              {evaluation.feedback && (
                <p className="text-muted-foreground mt-2 p-3 bg-secondary/50 rounded-lg">{evaluation.feedback}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
