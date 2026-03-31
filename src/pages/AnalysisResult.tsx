import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AnalysisRow, AidaEvaluation } from "@/types/analysis";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Volume2, Link2, Copy, ArrowLeft, Bug, RefreshCw, History, Sparkles } from "lucide-react";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { TranscriptionDialogue, type TranscriptionMarker } from "@/components/TranscriptionDialogue";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { Dumbbell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function SectionTitle({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold font-heading">{number}</span>
      <h2 className="font-heading text-lg font-semibold text-foreground uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function DataField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-body font-semibold mb-2">{label}</h3>
      <div className="text-sm text-foreground font-body leading-relaxed">{children}</div>
    </div>
  );
}

function EmptyField({ message = "Dados não disponíveis para este campo." }: { message?: string }) {
  return <p className="text-sm text-muted-foreground italic">{message}</p>;
}

function AudioPlayers({ audioUrls, audioRefs }: { audioUrls: string[]; audioRefs: React.RefObject<HTMLAudioElement[]> }) {
  const [signedUrls, setSignedUrls] = useState<string[]>([]);

  useEffect(() => {
    async function getSignedUrls() {
      const urls: string[] = [];
      for (const rawPath of audioUrls) {
        // Extract storage path: either a raw path or a full URL
        let storagePath = rawPath;
        if (rawPath.startsWith("http")) {
          const match = rawPath.match(/\/storage\/v1\/object\/(?:public|sign)\/audios\/([^?]+)/);
          if (match) {
            storagePath = match[1];
          } else {
            // Can't extract path, skip
            continue;
          }
        }
        // Remove accidental bucket prefix
        if (storagePath.startsWith("audios/")) {
          storagePath = storagePath.substring("audios/".length);
        }
        const { data } = await supabase.storage.from("audios").createSignedUrl(storagePath, 86400);
        if (data?.signedUrl) {
          urls.push(data.signedUrl);
        }
      }
      setSignedUrls(urls);
    }
    if (audioUrls.length > 0) getSignedUrls();
  }, [audioUrls]);

  if (signedUrls.length === 0 && audioUrls.length > 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-heading text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" /> Áudio da Negociação
        </h3>
        <p className="text-sm text-muted-foreground">Carregando áudios...</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-heading text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <Volume2 className="h-5 w-5 text-primary" /> Áudio da Negociação
      </h3>
      <div className="space-y-3">
        {signedUrls.map((url, i) => (
          <div key={i} className="bg-secondary rounded-lg p-3">
            {audioUrls.length > 1 && <p className="text-xs text-muted-foreground mb-2 font-body">Áudio {i + 1}</p>}
            <audio
              ref={(el) => { if (el && audioRefs.current) audioRefs.current[i] = el; }}
              controls
              className="w-full"
              preload="metadata"
            >
              <source src={url} type="audio/mpeg" />
            </audio>
          </div>
        ))}
      </div>
    </div>
  );
}

function AudioDebugPanel({ analysis }: { analysis: AnalysisRow }) {
  const [open, setOpen] = useState(false);
  const duration = analysis.duracao_audio_total;
  const modelo = analysis.modelo_usado;

  return (
    <div className="bg-card border border-border rounded-xl p-4 mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <Bug className="h-3.5 w-3.5" />
        <span className="font-semibold uppercase tracking-wider">Debug de Áudio</span>
        <span className="ml-auto text-[10px]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-secondary rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Duração Total</p>
            <p className="text-sm font-mono font-semibold text-foreground">
              {duration ? `${Math.round(duration)}s` : "—"}
            </p>
          </div>
          <div className="bg-secondary rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Modelo IA</p>
            <p className="text-sm font-mono font-semibold text-foreground">{modelo || "—"}</p>
          </div>
          <div className="bg-secondary rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Formato</p>
            <p className="text-sm font-mono font-semibold text-foreground">
              {analysis.audio_urls?.[0]?.endsWith(".wav") ? "WAV (pré-processado)" : "MP3 (original)"}
            </p>
          </div>
          <div className="bg-secondary rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Arquivos</p>
            <p className="text-sm font-mono font-semibold text-foreground">{analysis.audio_urls?.length || 0}</p>
          </div>
          <div className="bg-secondary rounded-lg p-3 col-span-2 md:col-span-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Pipeline</p>
            <p className="text-xs font-mono text-foreground/80">
              MP3 → Web Audio API (decode) → Mono downmix → Normalize (-3dB) → Resample 16kHz → WAV PCM 16-bit → Whisper
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Primeiros 5s preservados integralmente. Sem remoção de silêncio inicial.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const aidaLabels = [
  { key: "aida_atencao", letter: "A", label: "ATENÇÃO", color: "bg-primary", description: "Abertura humanizada, identificação do atendente, confirmação de titularidade e contextualização do contato" },
  { key: "aida_interesse", letter: "I", label: "INTERESSE", color: "bg-success", description: "Ancoragem de valor, apresentação de economia ou desconto, clareza na explicação da dívida e escolha guiada" },
  { key: "aida_desejo", letter: "D", label: "DESEJO", color: "bg-primary/60", description: "Construção da proposta, empatia, personalização, investigação da situação e tratamento de objeções" },
  { key: "aida_acao", letter: "A", label: "AÇÃO", color: "bg-success", description: "Fechamento assumido, confirmação de valor/parcela, data de pagamento e encaminhamento para pagamento" },
];

const REANALYSIS_PROVIDERS = [
  { id: "openai", label: "OpenAI (GPT-4.1)", description: "Modelo padrão — equilíbrio entre custo e qualidade" },
  { id: "gemini", label: "Gemini 2.5", description: "Google — bom em contextos longos" },
  { id: "claude", label: "Claude Sonnet", description: "Anthropic — detalhista e analítico" },
  { id: "opus", label: "Claude Opus", description: "Anthropic — máxima qualidade (custo alto)" },
];

function ReanalysisPanel({ analysisId, currentModel, onReanalysisComplete }: { analysisId: string; currentModel: string | null; onReanalysisComplete: (newId: string) => void }) {
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  const { data: reanalyses = [] } = useQuery({
    queryKey: ["reanalyses", analysisId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_reanalyses" as any)
        .select("*")
        .eq("analysis_id", analysisId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleReanalyze = async (provider: string) => {
    setIsReanalyzing(true);
    setActiveProvider(provider);
    try {
      const { data, error } = await supabase.functions.invoke("reanalisar", {
        body: { analysis_id: analysisId, provider },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Reanálise com ${provider} concluída!`);
      if (data?.new_analysis_id) {
        onReanalysisComplete(data.new_analysis_id);
      }
    } catch (err: unknown) {
      toast.error("Erro na reanálise: " + getErrorMessage(err));
    } finally {
      setIsReanalyzing(false);
      setActiveProvider(null);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-heading text-base font-semibold text-foreground">Reanalisar com outra IA</h3>
        <Badge variant="outline" className="ml-auto text-xs">Founder only</Badge>
      </div>

      {currentModel && (
        <p className="text-xs text-muted-foreground mb-4">
          Modelo atual: <span className="font-mono font-semibold text-foreground">{currentModel}</span>
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {REANALYSIS_PROVIDERS.map((p) => (
          <Button
            key={p.id}
            variant="outline"
            className="justify-start h-auto py-3 px-4 text-left"
            disabled={isReanalyzing}
            onClick={() => handleReanalyze(p.id)}
          >
            <div className="flex items-center gap-3 w-full">
              {isReanalyzing && activeProvider === p.id ? (
                <RefreshCw className="h-4 w-4 animate-spin text-primary shrink-0" />
              ) : (
                <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{p.label}</p>
                <p className="text-xs text-muted-foreground truncate">{p.description}</p>
              </div>
            </div>
          </Button>
        ))}
      </div>

      {reanalyses.length > 0 && (
        <div className="border-t border-border pt-3">
          <div className="flex items-center gap-2 mb-2">
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Histórico de reanálises</p>
          </div>
          <div className="space-y-1.5">
            {reanalyses.slice(0, 5).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-xs bg-secondary rounded-lg px-3 py-2">
                <span className="font-mono font-semibold text-foreground">{r.provider}/{r.model}</span>
                <span className="text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")} {new Date(r.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  {r.custo_estimado != null && ` • $${r.custo_estimado}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalysisResult() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const returnTo = searchParams.get("returnTo") || "/analysis-history";
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const [isGeneratingTraining, setIsGeneratingTraining] = useState(false);
  const [trainingLink, setTrainingLink] = useState<string | null>(null);
  const { profile, user } = useAuth();
  const isFounder = user?.email === "thiago@thiagoanalytics.com.br";

  const { data: analysis, isLoading } = useQuery({
    queryKey: ["analysis", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("analyses").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });



  const handleGenerateTraining = async () => {
    if (!analysis) return;
    setIsGeneratingTraining(true);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-treino", {
        body: {
          erro_principal: analysis.erro_principal,
          objecao: analysis.objecao,
          resumo: analysis.resumo,
          aida_atencao: analysis.aida_atencao,
          aida_interesse: analysis.aida_interesse,
          aida_desejo: analysis.aida_desejo,
          aida_acao: analysis.aida_acao,
          operador: analysis.operador,
          carteira: analysis.carteira,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Save training session with origem=manual
      if (profile?.empresa_id && id) {
        const { data: sessionData, error: sessionErr } = await supabase
          .from("training_sessions")
          .insert({
            analysis_id: id,
            empresa_id: profile.empresa_id,
            operador: analysis.operador,
            supervisor_id: profile.id,
            supervisor_nome: profile.nome || profile.email,
            carteira: analysis.carteira,
            training_content: data.training,
            origem: "pontual" as const,
          })
          .select("token")
          .single();

        if (!sessionErr && sessionData?.token) {
          const link = `https://app.cobramind.ia.br/treino/${sessionData.token}`;
          setTrainingLink(link);
        }

        // Auto-training removed — trainings are now generated intentionally from Operator Evolution
      }

      toast.success("Treino gerado com sucesso!");
    } catch (err: unknown) {
      toast.error("Erro ao gerar treino: " + getErrorMessage(err));
    } finally {
      setIsGeneratingTraining(false);
    }
  };

  if (!id) {
    return (
      <div>
        <PageHeader title="Resultado da Análise" description="Selecione uma análise no histórico para ver o resultado" />
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">Nenhuma análise selecionada. Vá ao Histórico para selecionar uma análise.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div>
        <PageHeader title="Resultado da Análise" />
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">Análise não encontrada.</p>
        </div>
      </div>
    );
  }

  const pontos_fortes = analysis.pontos_fortes ?? [];
  const pontos_melhorar = analysis.pontos_melhorar ?? [];
  const sugestoes = analysis.sugestoes ?? [];
  const audio_urls = analysis.audio_urls ?? [];
  const marcacoes = ((analysis as any).marcacoes_transcricao ?? []) as TranscriptionMarker[];

  return (
    <div className="space-y-10">
      <Button variant="ghost" size="sm" onClick={() => navigate(returnTo)} className="text-muted-foreground hover:text-primary -ml-2 mb-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para o Histórico
      </Button>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Resultado da Análise</h1>
          <p className="text-sm text-muted-foreground mt-1 font-body">
            Operador: {analysis.operador} • Carteira: {analysis.carteira} • Canal: {analysis.canal}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportPdfButton analysis={analysis as any} />
        </div>
      </div>

      {isFounder && id && (
        <ReanalysisPanel
          analysisId={id}
          currentModel={analysis.modelo_usado}
          onReanalysisComplete={(newId) => {
            queryClient.invalidateQueries({ queryKey: ["reanalyses", id] });
            navigate(`/analysis-result/${newId}`);
          }}
        />
      )}


      {/* SEÇÃO 1 — RESULTADO DA NEGOCIAÇÃO */}
      <section>
        <SectionTitle number={1} title="Resultado da Negociação" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Qualidade da Negociação" value={analysis.nota_qa} tooltip="Representa a qualidade da condução da negociação, considerando cordialidade, profissionalismo, clareza, conformidade e postura do operador durante o atendimento." color="text-primary" />
          <MetricCard label="Prob. Pagamento" value={analysis.chance_pagamento} suffix="%" color="text-success" />
          <MetricCard label="Risco de Quebra" value={analysis.risco_quebra} suffix="%" color="text-destructive" />
          <MetricCard label="Efetividade da Negociação" value={analysis.score} tooltip="Representa a eficácia da negociação, considerando tratamento de objeções, condução da conversa, potencial de fechamento e probabilidade de pagamento." color="text-primary" />
        </div>
      </section>

      {/* SEÇÃO 2 — LEITURA */}
      <section>
        <SectionTitle number={2} title="Leitura" />
        <div className="bg-card border border-border rounded-xl p-8">
          <h3 className="font-heading text-base font-semibold text-foreground mb-3">Resumo da Negociação</h3>
          <p className="text-sm text-foreground/90 leading-relaxed font-body">
            {analysis.resumo || <EmptyField message="Resumo não disponível." />}
          </p>
        </div>
      </section>

      {/* SEÇÃO 3 — DIAGNÓSTICO DA NEGOCIAÇÃO */}
      <section>
        <SectionTitle number={3} title="Diagnóstico da Negociação" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            {pontos_fortes.length > 0 && (
              <DataField label="Pontos Fortes">
                <ul className="space-y-2">
                  {pontos_fortes.map((s, i) => (
                    <li key={i} className="flex items-start gap-2"><span className="text-success mt-0.5">■</span><span>{s}</span></li>
                  ))}
                </ul>
              </DataField>
            )}
            {pontos_melhorar.length > 0 && (
              <DataField label="Pontos de Melhoria">
                <ul className="space-y-2">
                  {pontos_melhorar.map((s, i) => (
                    <li key={i} className="flex items-start gap-2"><span className="text-destructive mt-0.5">■</span><span>{s}</span></li>
                  ))}
                </ul>
              </DataField>
            )}
            {!pontos_fortes.length && !pontos_melhorar.length && <EmptyField message="Dados qualitativos não disponíveis." />}
          </div>
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <DataField label="Erro Principal">
              {analysis.erro_principal ? (
                <div className="bg-destructive/10 rounded-lg p-4 border-l-4 border-destructive text-foreground/90">{analysis.erro_principal}</div>
              ) : (
                <EmptyField message="Nenhum erro principal identificado." />
              )}
            </DataField>
          </div>
        </div>
      </section>

      {/* SEÇÃO 4 — COMO CONDUZIR MELHOR */}
      <section>
        <SectionTitle number={4} title="Como Conduzir Melhor" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <DataField label="Mensagem Ideal">
              {analysis.mensagem_ideal ? (
                <div className="bg-success/10 rounded-lg p-4 border-l-4 border-success italic text-foreground/90">"{analysis.mensagem_ideal}"</div>
              ) : (
                <EmptyField message="Mensagem ideal não gerada." />
              )}
            </DataField>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <DataField label="Orientação ao Operador">
              {analysis.feedback_orientacao ? (
                <div className="bg-secondary rounded-lg p-4 border-l-4 border-accent text-foreground/90">{analysis.feedback_orientacao}</div>
              ) : (
                <EmptyField message="Orientação não disponível." />
              )}
            </DataField>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <DataField label="Exemplo de Abordagem">
              {analysis.feedback_exemplo ? (
                <div className="bg-success/10 rounded-lg p-4 border-l-4 border-success italic text-foreground/90">"{analysis.feedback_exemplo}"</div>
              ) : (
                <EmptyField message="Exemplo não disponível." />
              )}
            </DataField>
          </div>
        </div>
        {sugestoes.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6 mt-6">
            <DataField label="Sugestões de Melhoria">
              <ul className="space-y-2">
                {sugestoes.map((s, i) => (
                  <li key={i} className="flex items-start gap-2"><span className="text-primary mt-0.5">■</span><span>{s}</span></li>
                ))}
              </ul>
            </DataField>
          </div>
        )}
      </section>

      {/* SEÇÃO 5 — ANÁLISE TÉCNICA */}
      <section>
        <SectionTitle number={5} title="Análise Técnica" />
        <div className="space-y-6">
          {/* AIDA */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-heading text-base font-semibold text-foreground mb-4">Análise AIDA</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {aidaLabels.map((item) => {
                const data = analysis[item.key as keyof AnalysisRow] as AidaEvaluation | null;
                return (
                  <div key={item.key} className="bg-secondary rounded-xl p-5 border border-border">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center text-primary-foreground text-sm font-bold`}>{item.letter}</div>
                      <div>
                        <h4 className="font-heading font-bold text-sm text-foreground">{item.label}</h4>
                        {data?.nota != null && <span className="text-xs text-muted-foreground">Nota: {Number(data.nota).toFixed(1)}/10</span>}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 italic">{item.description}</p>
                    <p className="text-sm text-foreground/90 leading-relaxed font-body">{data?.comentario || <EmptyField message="Avaliação não disponível para esta etapa." />}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conformidade + Tom + Estratégia */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-heading text-base font-semibold text-foreground mb-4">Conformidade Legal</h3>
              <div className="flex items-center gap-3 mb-4">
                <Badge className={`border-0 font-body text-sm px-3 py-1 ${
                  analysis.conformidade === "Conforme" ? "bg-success text-success-foreground" :
                  analysis.conformidade === "Parcialmente Conforme" ? "bg-warning text-warning-foreground" :
                  analysis.conformidade === "Não Conforme" ? "bg-destructive text-destructive-foreground" :
                  "bg-muted text-muted-foreground"
                }`}>{analysis.conformidade || "Pendente"}</Badge>
              </div>
              <DataField label="Justificativa">{analysis.justificativa_conformidade || <EmptyField message="Justificativa não disponível." />}</DataField>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <DataField label="Tom do Operador">{analysis.tom_operador || <EmptyField />}</DataField>
              <DataField label="Objeção do Cliente">{analysis.objecao || <EmptyField />}</DataField>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <DataField label="Nível de Habilidade">{analysis.nivel_habilidade || <EmptyField />}</DataField>
              <DataField label="Estratégia de Condução">{analysis.tecnica_usada || <EmptyField />}</DataField>
            </div>
          </div>

          {/* Feedback Supervisor extras */}
          {analysis.feedback_diagnostico && (
            <div className="bg-card border border-border rounded-xl p-6">
              <DataField label="Diagnóstico do Supervisor">
                <div className="bg-secondary rounded-lg p-4 border-l-4 border-primary text-foreground/90">{analysis.feedback_diagnostico}</div>
              </DataField>
              {analysis.feedback_exercicio && (
                <div>
                  <DataField label="Exercício Prático">
                    <div className="bg-secondary rounded-lg p-4 border-l-4 border-success text-foreground/90">{analysis.feedback_exercicio}</div>
                  </DataField>
                  <div className="mt-4">
                    <Button
                      onClick={handleGenerateTraining}
                      disabled={isGeneratingTraining}
                      className="gap-2"
                    >
                      <Dumbbell className={`h-4 w-4 ${isGeneratingTraining ? "animate-pulse" : ""}`} />
                      {isGeneratingTraining ? "Gerando treino..." : "Gerar Treino Inteligente"}
                    </Button>
                    {trainingLink && (
                      <div className="mt-3 flex items-center gap-2 bg-secondary rounded-lg p-3 border border-border">
                        <Link2 className="h-4 w-4 text-primary shrink-0" />
                        <input
                          readOnly
                          value={trainingLink}
                          className="flex-1 bg-transparent text-xs text-foreground truncate outline-none"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 gap-1 text-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(trainingLink);
                            toast.success("Link copiado!");
                          }}
                        >
                          <Copy className="h-3 w-3" /> Copiar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </section>

      {/* SEÇÃO 6 — ÁUDIO E TRANSCRIÇÃO */}
      <section>
        <SectionTitle number={6} title="Áudio e Transcrição" />

        {audio_urls.length > 0 && (
          <AudioPlayers audioUrls={audio_urls} audioRefs={audioRefs} />
        )}

        {isFounder && audio_urls.length > 0 && (
          <AudioDebugPanel analysis={analysis} />
        )}
        <div className={`bg-card border border-border rounded-xl p-6 ${audio_urls.length > 0 ? "mt-6" : ""}`}>
          <h3 className="font-heading text-base font-semibold text-foreground mb-4">Transcrição da Negociação</h3>
          {analysis.transcricao ? (
            <div className="max-h-[600px] overflow-y-auto pr-2">
              <TranscriptionDialogue
                transcricao={analysis.transcricao}
                marcacoes={marcacoes}
                audioRefs={audioRefs}
                operadorName={analysis.operador}
                canal={analysis.canal}
              />
            </div>
          ) : (
            <EmptyField message="Transcrição não disponível." />
          )}
        </div>
      </section>
    </div>
  );
}

/* ── Metric Card ── */
function MetricCard({ label, value, suffix, tooltip, color }: { label: string; value: number | null; suffix?: string; tooltip?: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground cursor-help" /></TooltipTrigger>
            <TooltipContent className="max-w-xs bg-secondary text-foreground border-border"><p className="text-xs">{tooltip}</p></TooltipContent>
          </Tooltip>
        )}
      </div>
      <p className={`text-2xl font-heading font-bold ${color}`}>{value != null ? `${value}${suffix ?? ""}` : "—"}</p>
    </div>
  );
}
