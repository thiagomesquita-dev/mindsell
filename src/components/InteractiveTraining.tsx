import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dumbbell, Target, MessageSquareText, AlertTriangle, CheckSquare,
  Users, HelpCircle, ChevronRight, Eye, EyeOff, Award, Zap,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface SimulationStep {
  etapa: number;
  fala_cliente: string;
  tipo: string;
  resposta_ideal: string;
  dica: string;
}

interface QuizQuestion {
  pergunta: string;
  tipo: "aberta" | "multipla_escolha";
  alternativas?: string[];
  resposta_correta: string;
  explicacao: string;
}

export interface TrainingData {
  nivel_dificuldade?: string;
  cenario: { fala_cliente: string; contexto_emocional: string };
  objetivo_operador: string[];
  script_ideal: string;
  erro_comum: string;
  criterios_avaliacao: string[];
  simulacao_etapas?: SimulationStep[];
  quiz?: QuizQuestion[];
}

const tipoLabels: Record<string, string> = {
  abertura: "Abertura",
  objecao: "Objeção",
  resistencia: "Resistência",
  decisao: "Decisão Final",
};

const difficultyConfig: Record<string, { color: string; icon: string }> = {
  "Básico": { color: "bg-success/20 text-success border-success/30", icon: "🟢" },
  "Intermediário": { color: "bg-warning/20 text-warning border-warning/30", icon: "🟡" },
  "Avançado": { color: "bg-destructive/20 text-destructive border-destructive/30", icon: "🔴" },
};

export function InteractiveTraining({ training }: { training: TrainingData }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [revealedSteps, setRevealedSteps] = useState<Set<number>>(new Set());
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [revealedQuiz, setRevealedQuiz] = useState<Set<number>>(new Set());
  const [showGabarito, setShowGabarito] = useState(false);

  const steps = training.simulacao_etapas ?? [];
  const quiz = training.quiz ?? [];
  const difficulty = training.nivel_dificuldade || "Intermediário";
  const diffCfg = difficultyConfig[difficulty] || difficultyConfig["Intermediário"];

  const toggleStepReveal = (idx: number) => {
    setRevealedSteps(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleQuizReveal = (idx: number) => {
    setRevealedQuiz(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" /> Treinamento Interativo
        </h3>
        <Badge className={`border ${diffCfg.color} font-body`}>
          {diffCfg.icon} {difficulty}
        </Badge>
      </div>

      {/* Cenário */}
      <div className="bg-secondary rounded-lg p-4 border-l-4 border-primary">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-4 w-4 text-primary" />
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Cenário de Roleplay</h4>
        </div>
        <p className="text-sm text-foreground/90 font-body mb-2">
          <span className="font-semibold">Cliente:</span> "{training.cenario.fala_cliente}"
        </p>
        <p className="text-xs text-muted-foreground italic">{training.cenario.contexto_emocional}</p>
      </div>

      {/* Objetivo */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-success" />
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Objetivo do Operador</h4>
        </div>
        <ul className="space-y-1">
          {training.objetivo_operador.map((obj, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
              <span className="text-success mt-0.5">■</span><span>{obj}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Simulação em Etapas */}
      {steps.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-primary" />
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Simulação em Etapas</h4>
          </div>
          <div className="space-y-3">
            {steps.map((step, idx) => {
              const isActive = idx <= currentStep;
              const isRevealed = revealedSteps.has(idx);
              return (
                <div
                  key={idx}
                  className={`rounded-lg border transition-all ${
                    isActive
                      ? "border-primary/40 bg-secondary"
                      : "border-border bg-muted/30 opacity-60"
                  } p-4`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {step.etapa}
                      </span>
                      <Badge variant="outline" className="text-xs font-body">
                        {tipoLabels[step.tipo] || step.tipo}
                      </Badge>
                    </div>
                    {isActive && idx < steps.length - 1 && !revealedSteps.has(idx) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs gap-1"
                        onClick={() => setCurrentStep(Math.max(currentStep, idx + 1))}
                      >
                        Próxima <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {isActive && (
                    <>
                      <div className="bg-card rounded-lg p-3 mb-3 border border-border">
                        <p className="text-sm text-foreground/90">
                          <span className="font-semibold text-destructive">Cliente:</span> "{step.fala_cliente}"
                        </p>
                      </div>

                      <p className="text-xs text-muted-foreground mb-3 italic">
                        💡 {step.dica}
                      </p>

                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => toggleStepReveal(idx)}
                      >
                        {isRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {isRevealed ? "Ocultar resposta" : "Ver resposta ideal"}
                      </Button>

                      {isRevealed && (
                        <div className="mt-3 bg-success/10 rounded-lg p-3 border-l-4 border-success">
                          <p className="text-sm text-foreground/90 italic">
                            <span className="font-semibold not-italic text-success">Operador:</span> "{step.resposta_ideal}"
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {currentStep < steps.length - 1 && (
            <div className="mt-3 text-center">
              <Button
                size="sm"
                onClick={() => setCurrentStep(steps.length - 1)}
                variant="outline"
                className="text-xs"
              >
                Revelar todas as etapas
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Quiz */}
      {quiz.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="h-4 w-4 text-primary" />
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Perguntas para o Operador</h4>
          </div>
          <div className="space-y-4">
            {quiz.map((q, idx) => {
              const isRevealed = revealedQuiz.has(idx);
              return (
                <div key={idx} className="bg-secondary rounded-lg p-4 border border-border">
                  <p className="text-sm font-semibold text-foreground mb-3">
                    {idx + 1}. {q.pergunta}
                  </p>

                  {q.tipo === "multipla_escolha" && q.alternativas && (
                    <RadioGroup
                      value={quizAnswers[idx] || ""}
                      onValueChange={(v) => setQuizAnswers(prev => ({ ...prev, [idx]: v }))}
                      className="mb-3"
                    >
                      {q.alternativas.map((alt, ai) => {
                        const letter = String.fromCharCode(65 + ai);
                        const isCorrect = isRevealed && (
                          q.resposta_correta.toLowerCase().startsWith(letter.toLowerCase()) ||
                          q.resposta_correta.toLowerCase() === alt.toLowerCase()
                        );
                        const isWrong = isRevealed && quizAnswers[idx] === letter && !isCorrect;
                        return (
                          <label
                            key={ai}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                              isCorrect ? "bg-success/15 border border-success/30" :
                              isWrong ? "bg-destructive/15 border border-destructive/30" :
                              "hover:bg-muted"
                            }`}
                          >
                            <RadioGroupItem value={letter} disabled={isRevealed} />
                            <span className="text-sm text-foreground/90">{letter}) {alt}</span>
                          </label>
                        );
                      })}
                    </RadioGroup>
                  )}

                  {q.tipo === "aberta" && !isRevealed && (
                    <p className="text-xs text-muted-foreground italic mb-3">
                      Reflita sobre a resposta antes de ver o gabarito.
                    </p>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs"
                    onClick={() => toggleQuizReveal(idx)}
                  >
                    {isRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {isRevealed ? "Ocultar gabarito" : "Ver gabarito"}
                  </Button>

                  {isRevealed && (
                    <div className="mt-3 space-y-2">
                      <div className="bg-success/10 rounded-lg p-3 border-l-4 border-success">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Resposta correta</p>
                        <p className="text-sm text-foreground/90">{q.resposta_correta}</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3 border-l-4 border-muted-foreground/30">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Explicação</p>
                        <p className="text-sm text-foreground/90">{q.explicacao}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Script Ideal */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MessageSquareText className="h-4 w-4 text-primary" />
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Script Ideal (AIDA)</h4>
        </div>
        <div className="bg-success/10 rounded-lg p-4 border-l-4 border-success italic text-sm text-foreground/90">
          "{training.script_ideal}"
        </div>
      </div>

      {/* Erro Comum */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Erro Comum</h4>
        </div>
        <div className="bg-destructive/10 rounded-lg p-4 border-l-4 border-destructive text-sm text-foreground/90">
          {training.erro_comum}
        </div>
      </div>

      {/* Critérios de Avaliação */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Critérios de Avaliação</h4>
        </div>
        <ul className="space-y-1">
          {training.criterios_avaliacao.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
              <span className="text-primary mt-0.5">☑</span><span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Gabarito completo */}
      <div className="border-t border-border pt-4">
        <Button
          variant="outline"
          className="gap-2 w-full"
          onClick={() => setShowGabarito(!showGabarito)}
        >
          <Award className="h-4 w-4" />
          {showGabarito ? "Ocultar gabarito completo" : "Ver gabarito completo"}
        </Button>
        {showGabarito && (
          <div className="mt-4 space-y-4">
            {steps.length > 0 && (
              <div className="bg-secondary rounded-lg p-4">
                <h5 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Respostas da Simulação</h5>
                {steps.map((s, i) => (
                  <div key={i} className="mb-3 last:mb-0">
                    <p className="text-xs font-semibold text-foreground">Etapa {s.etapa} ({tipoLabels[s.tipo] || s.tipo})</p>
                    <p className="text-sm text-foreground/90 italic">"{s.resposta_ideal}"</p>
                  </div>
                ))}
              </div>
            )}
            {quiz.length > 0 && (
              <div className="bg-secondary rounded-lg p-4">
                <h5 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Respostas do Quiz</h5>
                {quiz.map((q, i) => (
                  <div key={i} className="mb-3 last:mb-0">
                    <p className="text-xs font-semibold text-foreground">{q.pergunta}</p>
                    <p className="text-sm text-success">{q.resposta_correta}</p>
                    <p className="text-xs text-muted-foreground">{q.explicacao}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
