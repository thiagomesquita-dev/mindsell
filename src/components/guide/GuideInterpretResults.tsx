import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Eye, Target, Heart, Zap, TrendingUp, Radar, Gamepad2, Dumbbell, BarChart3, ShieldAlert, Lock } from "lucide-react";
import { useCompanyPlan } from "@/hooks/useCompanyPlan";
import type { ModuleId } from "@/lib/planPermissions";

interface Section {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  content: React.ReactNode;
  moduleId?: ModuleId; // if set, gated by plan
}

const SECTIONS: Section[] = [
  {
    id: "venda",
    icon: BarChart3,
    title: "Metodologia VENDA",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">O MindSell avalia cada negociação usando 4 dimensões da metodologia VENDA adaptada para vendas:</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: Eye, name: "Atenção", desc: "Abertura da conversa, conexão inicial, abordagem humanizada, segurança e confirmação de identidade." },
            { icon: Target, name: "Interesse", desc: "Explicação da situação, clareza da proposta, construção de contexto e manutenção do interesse do cliente." },
            { icon: Heart, name: "Desejo", desc: "Tratamento de objeções, empatia, construção de solução e adequação da proposta à realidade do cliente." },
            { icon: Zap, name: "Ação", desc: "Fechamento presumido, confirmação do próximo passo, definição de data, compromisso e condução para o pagamento." },
          ].map((d) => (
            <div key={d.name} className="rounded-lg border border-border p-3 space-y-1">
              <div className="flex items-center gap-2">
                <d.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{d.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "probabilidade",
    icon: ShieldAlert,
    title: "Probabilidade de Pagamento e Risco de Quebra",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p><strong className="text-foreground">Probabilidade de Pagamento:</strong> Indica a chance estimada do cliente realmente efetuar o pagamento, com base na condução da negociação.</p>
        <p><strong className="text-foreground">Risco de Quebra:</strong> Indica a chance do acordo firmado não ser cumprido.</p>
        <p>⚠️ Esses indicadores não devem ser lidos como certeza absoluta. Eles servem para <strong className="text-foreground">priorizar análise, coaching e acompanhamento</strong>.</p>
      </div>
    ),
  },
  {
    id: "evolucao",
    icon: TrendingUp,
    title: "Evolução do Operador",
    moduleId: "operator-evolution",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>A tela de Evolução mostra a trajetória de cada operador ao longo das semanas. Use-a para:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong className="text-foreground">Identificar melhora:</strong> Score subindo, indicadores VENDA melhorando, erros diminuindo.</li>
          <li><strong className="text-foreground">Identificar queda:</strong> Score caindo, objeções aumentando, risco de quebra crescendo.</li>
          <li><strong className="text-foreground">Usar a matriz semanal:</strong> Compare 4 semanas lado a lado para identificar tendências e consistência.</li>
          <li><strong className="text-foreground">Feedback:</strong> Use os dados para conversas objetivas de acompanhamento e coaching.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "radar-operacao",
    icon: Radar,
    title: "Radar da Operação",
    moduleId: "operation-radar",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>O Radar da Operação consolida dados da equipe inteira para revelar:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong className="text-foreground">Erros recorrentes:</strong> Quais falhas se repetem e precisam de treinamento.</li>
          <li><strong className="text-foreground">Objeções frequentes:</strong> Quais objeções os clientes mais trazem.</li>
          <li><strong className="text-foreground">Gargalos de fechamento:</strong> Onde os operadores mais perdem oportunidades.</li>
          <li><strong className="text-foreground">Padrões da equipe:</strong> Tom predominante, técnicas mais usadas, pontos fortes coletivos.</li>
        </ul>
        <p>Use o radar para orientar treinamentos em grupo, ajustar scripts e calibrar a operação.</p>
      </div>
    ),
  },
  {
    id: "radar-supervisao",
    icon: Gamepad2,
    title: "Radar da Supervisão",
    moduleId: "supervision-gamification",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>O Radar da Supervisão ajuda a decidir onde atuar primeiro:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong className="text-foreground">Priorizar operadores:</strong> Identifique quem precisa de acompanhamento urgente.</li>
          <li><strong className="text-foreground">Onde atuar primeiro:</strong> Foque em quem tem mais impacto potencial.</li>
          <li><strong className="text-foreground">Operadores que precisam de apoio:</strong> Detecte queda de desempenho antes que vire problema.</li>
          <li><strong className="text-foreground">Coaching baseado em dados:</strong> Use métricas objetivas nas conversas de acompanhamento.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "treinos",
    icon: Dumbbell,
    title: "Treinos Inteligentes",
    moduleId: "training-history",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p><strong className="text-foreground">Como o treino é gerado:</strong> A IA analisa os erros reais identificados na negociação e cria exercícios específicos para aquele operador.</p>
        <p><strong className="text-foreground">Como usar:</strong> Envie o treino ao operador via link público. Ele responde as questões e a IA avalia as respostas.</p>
        <p><strong className="text-foreground">Resultado:</strong> Cada treino corrige pontos fracos reais com exercícios práticos, transformando análise em capacitação objetiva.</p>
      </div>
    ),
  },
];

export function GuideInterpretResults() {
  const { canAccessModule } = useCompanyPlan();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-heading font-bold text-foreground">Como Interpretar os Resultados</h2>
      <p className="text-sm text-muted-foreground">Entenda o que cada métrica significa e como transformar dados em decisão operacional.</p>

      <Accordion type="multiple" className="space-y-2">
        {SECTIONS.map((section) => {
          const locked = section.moduleId ? !canAccessModule(section.moduleId) : false;

          if (locked) {
            return (
              <div
                key={section.id}
                className="border rounded-lg px-4 py-3 grayscale opacity-60 cursor-not-allowed select-none flex items-center gap-3"
              >
                <section.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-sm font-heading font-semibold text-muted-foreground flex-1">{section.title}</span>
                <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                <span className="text-[10px] text-muted-foreground/50 italic">Disponível em planos superiores</span>
              </div>
            );
          }

          return (
            <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline gap-3">
                <div className="flex items-center gap-3">
                  <section.icon className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm font-heading font-semibold text-foreground">{section.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                {section.content}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
