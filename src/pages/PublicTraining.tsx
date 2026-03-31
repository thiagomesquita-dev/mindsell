import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Target, MessageSquareText, Send, CheckCircle, Clock,
  AlertTriangle, Dumbbell, Brain, Zap, BookOpen, MessageCircle,
  ThumbsUp, ThumbsDown, Lightbulb, CheckCircle2, XCircle,
  GraduationCap, MessageSquareDiff, Wrench
} from "lucide-react";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface MCQuestion {
  pergunta: string;
  alternativas: string[];
  resposta_correta: number;
}

interface TrainingContent {
  cenario?: { fala_cliente?: string; contexto_emocional?: string };
  objetivo_operador?: string[];
  script_ideal?: string;
  nivel_dificuldade?: string;
  pergunta_interpretacao?: MCQuestion;
  pergunta_decisao?: MCQuestion;
}

interface Evaluation {
  aida?: { atencao: number; interesse: number; desejo: number; acao: number };
  nota_final?: number;
  qualidade_resposta?: string;
  entendimento?: string;
  coerencia?: string;
  acerto_interpretacao?: boolean | null;
  acerto_decisao?: boolean | null;
  interpretacao_correta?: string;
  explicacao_interpretacao?: string;
  decisao_ideal?: string;
  explicacao_decisao?: string;
  nivel_aprendizado?: string;
  diagnostico?: string;
  ponto_forte?: string;
  principal_erro?: string;
  como_corrigir?: string;
  resposta_recomendada?: string;
  licao_esperada?: string;
  feedback?: string;
  resposta_operador?: string;
  reflexao_operador?: string;
}

interface TrainingSession {
  id: string;
  token: string;
  operador: string;
  supervisor_nome: string;
  carteira: string;
  training_content: TrainingContent;
  status: string;
  expires_at: string;
  avaliacao_ia?: Evaluation;
  resposta_operador?: string;
  reflexao_operador?: string;
  resposta_interpretacao?: string;
  resposta_decisao?: string;
  origem?: string;
}

function qualityColor(val?: string) {
  if (val === "alta" || val === "alto") return "bg-green-500/20 text-green-700 border-green-500/30";
  if (val === "media" || val === "medio") return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
  return "bg-red-500/20 text-red-700 border-red-500/30";
}

function levelIcon(val?: string) {
  if (val === "alto") return <span className="text-green-600">🟢 Alto</span>;
  if (val === "medio") return <span className="text-yellow-600">🟡 Médio</span>;
  return <span className="text-red-600">🔴 Baixo</span>;
}

// ─── RESULT SCREEN ───
function TrainingResult({ evaluation, session }: { evaluation: Evaluation; session: TrainingSession }) {
  const content = session.training_content;
  const interpQ = content?.pergunta_interpretacao;
  const decisaoQ = content?.pergunta_decisao;

  const operadorResposta = evaluation.resposta_operador || session.resposta_operador || "";
  const operadorReflexao = evaluation.reflexao_operador || session.reflexao_operador || "";
  const chosenInterp = session.resposta_interpretacao != null ? Number(session.resposta_interpretacao) : null;
  const chosenDecisao = session.resposta_decisao != null ? Number(session.resposta_decisao) : null;

  return (
    <div className="max-w-lg mx-auto space-y-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-slate-800">Treino Concluído!</h1>
        <p className="text-sm text-slate-500 mt-1">Veja sua avaliação pedagógica abaixo</p>
      </div>

      {/* 1 — Nota Final */}
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-slate-500 mb-1">Nota Final</p>
          <p className={`text-4xl font-bold ${
            (evaluation.nota_final ?? 0) >= 9 ? "text-green-600" :
            (evaluation.nota_final ?? 0) >= 7 ? "text-blue-600" :
            (evaluation.nota_final ?? 0) >= 5 ? "text-yellow-600" : "text-red-600"
          }`}>
            {evaluation.nota_final?.toFixed(1) ?? "—"}
          </p>
          {evaluation.nota_final != null && (
            <Badge className={`mt-2 border ${
              evaluation.nota_final >= 9 ? "bg-green-500/20 text-green-700 border-green-500/30" :
              evaluation.nota_final >= 7 ? "bg-blue-500/20 text-blue-700 border-blue-500/30" :
              evaluation.nota_final >= 5 ? "bg-yellow-500/20 text-yellow-700 border-yellow-500/30" :
              "bg-red-500/20 text-red-700 border-red-500/30"
            }`}>
              {evaluation.nota_final >= 9 ? "Excelente" :
               evaluation.nota_final >= 7 ? "Bom" :
               evaluation.nota_final >= 5 ? "Regular" : "Crítico"}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* 1.5 — Como essa nota foi formada */}
      {evaluation.aida && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-600" />
              Como essa nota foi formada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Atenção (abertura e conexão)", value: evaluation.aida.atencao },
              { label: "Interesse (clareza da explicação)", value: evaluation.aida.interesse },
              { label: "Desejo (tratamento de objeções)", value: evaluation.aida.desejo },
              { label: "Ação (fechamento e compromisso)", value: evaluation.aida.acao },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{item.label}</span>
                <span className={`font-semibold ${
                  item.value >= 7 ? "text-green-600" : item.value >= 5 ? "text-yellow-600" : "text-red-600"
                }`}>{item.value}/10</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 2 — Tags de Status */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Badge className={`border ${qualityColor(evaluation.qualidade_resposta)}`}>
          Resposta: {evaluation.qualidade_resposta}
        </Badge>
        <Badge className={`border ${qualityColor(evaluation.entendimento)}`}>
          Entendimento: {evaluation.entendimento}
        </Badge>
        <Badge className={`border ${qualityColor(evaluation.coerencia)}`}>
          Coerência: {evaluation.coerencia}
        </Badge>
      </div>

      {/* 3 — Avaliação AIDA */}
      {evaluation.aida && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Avaliação AIDA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(["atencao", "interesse", "desejo", "acao"] as const).map((key) => {
              const val = evaluation.aida![key];
              const label = key === "atencao" ? "Atenção" : key === "interesse" ? "Interesse" : key === "desejo" ? "Desejo" : "Ação";
              return (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${val >= 7 ? "bg-green-500" : val >= 5 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${val * 10}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-8 text-right">{val}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 4 — Gabarito Comentado */}
      {(interpQ || decisaoQ) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600" />
              Gabarito Comentado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Interpretação */}
            {interpQ && (
              <div className="space-y-2">
                <p className="text-xs uppercase font-semibold text-purple-600">Interpretação</p>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        {evaluation.interpretacao_correta || interpQ.alternativas[interpQ.resposta_correta]}
                      </p>
                      {evaluation.explicacao_interpretacao && (
                        <p className="text-xs text-green-600 mt-1">{evaluation.explicacao_interpretacao}</p>
                      )}
                    </div>
                  </div>
                </div>
                {chosenInterp != null && (
                  <div className={`rounded-lg p-3 border ${
                    evaluation.acerto_interpretacao
                      ? "bg-green-50/50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}>
                    <div className="flex items-start gap-2">
                      {evaluation.acerto_interpretacao
                        ? <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        : <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      }
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Sua resposta</p>
                        <p className={`text-sm ${evaluation.acerto_interpretacao ? "text-green-700" : "text-red-700"}`}>
                          {interpQ.alternativas[chosenInterp]}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Decisão */}
            {decisaoQ && (
              <div className="space-y-2">
                <p className="text-xs uppercase font-semibold text-amber-600">Decisão</p>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        {evaluation.decisao_ideal || decisaoQ.alternativas[decisaoQ.resposta_correta]}
                      </p>
                      {evaluation.explicacao_decisao && (
                        <p className="text-xs text-green-600 mt-1">{evaluation.explicacao_decisao}</p>
                      )}
                    </div>
                  </div>
                </div>
                {chosenDecisao != null && (
                  <div className={`rounded-lg p-3 border ${
                    evaluation.acerto_decisao
                      ? "bg-green-50/50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}>
                    <div className="flex items-start gap-2">
                      {evaluation.acerto_decisao
                        ? <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        : <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      }
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Sua resposta</p>
                        <p className={`text-sm ${evaluation.acerto_decisao ? "text-green-700" : "text-red-700"}`}>
                          {decisaoQ.alternativas[chosenDecisao]}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5 — Comparação de Resposta */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquareDiff className="h-4 w-4 text-blue-600" />
            Comparação de Resposta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {operadorResposta && (
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold mb-1">Sua resposta</p>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-sm text-slate-700">"{operadorResposta}"</p>
              </div>
            </div>
          )}
          {evaluation.resposta_recomendada && (
            <div>
              <p className="text-xs uppercase text-primary font-semibold mb-1 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" /> Resposta ideal do CobraMind
              </p>
              <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                <p className="text-sm text-slate-700 italic">"{evaluation.resposta_recomendada}"</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6 — Aprendizado */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-teal-600" />
            Aprendizado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {operadorReflexao && (
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold mb-1">Lição que você tirou</p>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-sm text-slate-700">"{operadorReflexao}"</p>
              </div>
            </div>
          )}
          {evaluation.licao_esperada && (
            <div>
              <p className="text-xs uppercase text-teal-600 font-semibold mb-1 flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> Lição esperada pelo CobraMind
              </p>
              <div className="bg-teal-50 rounded-lg p-3 border border-teal-200">
                <p className="text-sm text-teal-800">"{evaluation.licao_esperada}"</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium text-slate-600">Nível de Aprendizado</span>
            <span className="text-lg font-bold">{levelIcon(evaluation.nivel_aprendizado)}</span>
          </div>
        </CardContent>
      </Card>

      {/* 7 — Feedback Final */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wrench className="h-4 w-4 text-slate-600" />
            Feedback Final
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {evaluation.ponto_forte && (
            <div className="flex items-start gap-2">
              <ThumbsUp className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs uppercase text-green-600 font-semibold mb-0.5">O que você fez bem</p>
                <p className="text-sm text-slate-700">{evaluation.ponto_forte}</p>
              </div>
            </div>
          )}
          {evaluation.diagnostico && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs uppercase text-yellow-600 font-semibold mb-0.5">O que faltou</p>
                <p className="text-sm text-slate-700">{evaluation.diagnostico}</p>
              </div>
            </div>
          )}
          {(evaluation.como_corrigir || evaluation.principal_erro) && (
            <div className="flex items-start gap-2">
              <ThumbsDown className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs uppercase text-red-600 font-semibold mb-0.5">Como corrigir agora</p>
                <p className="text-sm text-slate-700">
                  {evaluation.como_corrigir || evaluation.principal_erro}
                </p>
              </div>
            </div>
          )}
          {evaluation.feedback && (
            <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500 mt-2">
              <p className="text-sm text-slate-700">{evaluation.feedback}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── MAIN ───
export default function PublicTraining() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [resposta, setResposta] = useState("");
  const [reflexao, setReflexao] = useState("");
  const [interpretacao, setInterpretacao] = useState<string | undefined>();
  const [decisao, setDecisao] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchSession();
  }, [token]);

  async function fetchSession() {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/get_training_by_token`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ p_token: token }),
        }
      );
      const data = await res.json();
      if (!data || data.length === 0) { setError("Treino não encontrado."); return; }
      const s = data[0] as TrainingSession;
      if (s.status === "respondido") {
        setSession(s); setSubmitted(true); setEvaluation(s.avaliacao_ia || null);
      } else if (new Date(s.expires_at) < new Date()) {
        setError("Este treino expirou.");
      } else {
        setSession(s);
      }
    } catch {
      setError("Erro ao carregar treino.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    const content = session?.training_content;
    const hasInterp = !!content?.pergunta_interpretacao;
    const hasDecisao = !!content?.pergunta_decisao;

    if (!resposta.trim() || !reflexao.trim()) { toast.error("Preencha todos os campos."); return; }
    if (hasInterp && interpretacao == null) { toast.error("Selecione a resposta de interpretação."); return; }
    if (hasDecisao && decisao == null) { toast.error("Selecione a resposta de decisão."); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/avaliar-treino`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          token,
          resposta: resposta.trim(),
          reflexao: reflexao.trim(),
          resposta_interpretacao: interpretacao != null ? Number(interpretacao) : null,
          resposta_decisao: decisao != null ? Number(decisao) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar");
      setSubmitted(true);
      setEvaluation(data.evaluation);
      toast.success("Resposta enviada com sucesso!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar resposta.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Sonner />
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Treino Indisponível</h2>
            <p className="text-sm text-slate-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) return null;

  const content = session.training_content;

  // Result screen
  if (submitted && evaluation) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <Sonner />
        <TrainingResult evaluation={evaluation} session={session} />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Sonner />
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Treino já respondido</h2>
            <p className="text-sm text-slate-500">Sua resposta foi registrada com sucesso.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canSubmit = resposta.trim() && reflexao.trim()
    && (!content.pergunta_interpretacao || interpretacao != null)
    && (!content.pergunta_decisao || decisao != null);

  // Training form
  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <Sonner />
      <div className="max-w-lg mx-auto space-y-4 py-6">
        {/* Header */}
        <div className="text-center mb-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Dumbbell className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-800">Treino CobraMind</h1>
          </div>
          <p className="text-sm text-slate-500">
            Operador: <span className="font-medium">{session.operador}</span>
          </p>
          <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mt-1">
            <Clock className="h-3 w-3" />
            <span>Expira em {new Date(session.expires_at).toLocaleDateString("pt-BR")}</span>
          </div>
        </div>

        {/* Blocos consolidados para treino automático */}
        {session.origem === "automatico" && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4 text-blue-600" />
                Padrões Identificados (3 análises)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(content as Record<string, unknown>)?.padrao_erros && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs font-semibold text-red-600 mb-1">Padrão de Erros</p>
                  <p className="text-sm text-slate-700">{(content as Record<string, unknown>).padrao_erros as string}</p>
                </div>
              )}
              {(content as Record<string, unknown>)?.padrao_objecoes && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                  <p className="text-xs font-semibold text-yellow-600 mb-1">Objeções Frequentes</p>
                  <p className="text-sm text-slate-700">{(content as Record<string, unknown>).padrao_objecoes as string}</p>
                </div>
              )}
              {(content as Record<string, unknown>)?.licao_central && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-xs font-semibold text-green-600 mb-1">Lição Central</p>
                  <p className="text-sm text-slate-700">{(content as Record<string, unknown>).licao_central as string}</p>
                </div>
              )}
              {(content as Record<string, unknown>)?.prioridade_correcao && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 mb-1">Prioridade de Correção</p>
                  <p className="text-sm text-slate-700">{(content as Record<string, unknown>).prioridade_correcao as string}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* SEÇÃO 1 — Cenário */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-blue-600" />
              Cenário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-100 rounded-lg p-3 mb-2">
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-red-600">Cliente:</span> "{content.cenario?.fala_cliente}"
              </p>
            </div>
            {content.cenario?.contexto_emocional && (
              <p className="text-xs text-slate-500 italic">{content.cenario.contexto_emocional}</p>
            )}
          </CardContent>
        </Card>

        {/* SEÇÃO 2 — Objetivo */}
        {content.objetivo_operador && content.objetivo_operador.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-green-600" />
                Objetivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {content.objetivo_operador.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-green-500 mt-0.5">■</span>{obj}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* SEÇÃO 3 — Interpretação (MC) */}
        {content.pergunta_interpretacao && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-600" />
                Interpretação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 mb-3 font-medium">
                {content.pergunta_interpretacao.pergunta}
              </p>
              <RadioGroup value={interpretacao} onValueChange={setInterpretacao} className="space-y-2">
                {content.pergunta_interpretacao.alternativas.map((alt, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <RadioGroupItem value={String(i)} id={`interp-${i}`} className="mt-0.5" />
                    <Label htmlFor={`interp-${i}`} className="text-sm text-slate-700 cursor-pointer leading-relaxed">
                      {alt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* SEÇÃO 4 — Decisão (MC) */}
        {content.pergunta_decisao && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-600" />
                Decisão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 mb-3 font-medium">
                {content.pergunta_decisao.pergunta}
              </p>
              <RadioGroup value={decisao} onValueChange={setDecisao} className="space-y-2">
                {content.pergunta_decisao.alternativas.map((alt, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <RadioGroupItem value={String(i)} id={`decisao-${i}`} className="mt-0.5" />
                    <Label htmlFor={`decisao-${i}`} className="text-sm text-slate-700 cursor-pointer leading-relaxed">
                      {alt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* SEÇÃO 5 — Resposta Aberta */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-blue-600" />
              Como você responderia esse cliente agora?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Digite sua resposta ao cliente..."
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{resposta.length}/1000</p>
          </CardContent>
        </Card>

        {/* SEÇÃO 6 — Reflexão */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-teal-600" />
              Qual lição você tirou dessa negociação?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Reflita sobre o que aprendeu..."
              value={reflexao}
              onChange={(e) => setReflexao(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{reflexao.length}/1000</p>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className="w-full gap-2"
          size="lg"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Analisando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Enviar resposta
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
