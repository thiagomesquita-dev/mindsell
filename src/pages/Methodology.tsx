import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, BarChart3, Users, GraduationCap, Trophy, Eye, Zap, Heart, Target } from "lucide-react";

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
        <h2 className="font-heading text-lg font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function WeightRow({ label, weight }: { label: string; weight: string }) {
  return (
    <div className="flex items-center justify-between bg-secondary/50 rounded-lg px-4 py-2.5">
      <span className="text-sm text-foreground">{label}</span>
      <span className="text-sm font-semibold text-primary">{weight}</span>
    </div>
  );
}

export default function Methodology() {
  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Como o CobraMind Avalia"
        description="Entenda como cada métrica e análise é calculada dentro do sistema"
      />

      {/* SEÇÃO 1 — Visão Geral */}
      <Section title="Visão Geral" icon={<BookOpen className="h-5 w-5" />}>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              O CobraMind analisa negociações com base em padrões comportamentais, estrutura de conversa e sinais de decisão do cliente, transformando cada interação em dados acionáveis.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              Cada análise passa por um motor de inteligência artificial que avalia a condução do operador em quatro dimensões (AIDA), identifica barreiras do cliente, detecta erros operacionais e calcula probabilidades de pagamento e risco.
            </p>
          </CardContent>
        </Card>
      </Section>

      {/* SEÇÃO 2 — Metodologia AIDA */}
      <Section title="Metodologia AIDA" icon={<Target className="h-5 w-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: <Eye className="h-5 w-5" />, title: "Atenção", desc: "Avalia a abertura da conversa, validação de identidade e criação de conexão com o cliente." },
            { icon: <Zap className="h-5 w-5" />, title: "Interesse", desc: "Mede a clareza da explicação da situação, da dívida e da proposta apresentada ao cliente." },
            { icon: <Heart className="h-5 w-5" />, title: "Desejo", desc: "Analisa o tratamento de objeções, empatia e adaptação da proposta à realidade do cliente." },
            { icon: <Target className="h-5 w-5" />, title: "Ação", desc: "Avalia o fechamento da negociação, confirmação de dados e o compromisso assumido pelo cliente." },
          ].map((item) => (
            <Card key={item.title}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="text-primary">{item.icon}</div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* SEÇÃO 3 — Métricas da Operação */}
      <Section title="Métricas da Operação" icon={<BarChart3 className="h-5 w-5" />}>
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Chance de Pagamento</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">A IA analisa sinais na conversa que indicam intenção real de pagamento, capacidade financeira percebida e o quão claro foi o acordo final.</p>
              <WeightRow label="Intenção do cliente" weight="40%" />
              <WeightRow label="Capacidade de pagamento" weight="35%" />
              <WeightRow label="Clareza do compromisso" weight="25%" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Risco de Quebra</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">Mesmo após o acordo, a IA identifica sinais de risco com base na qualidade do fechamento e na segurança demonstrada pelo cliente.</p>
              <WeightRow label="Insegurança do cliente" weight="30%" />
              <WeightRow label="Falta de clareza no fechamento" weight="30%" />
              <WeightRow label="Inconsistência na negociação" weight="20%" />
              <WeightRow label="Objeções não resolvidas" weight="20%" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Qualidade Média</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Calculada pela média das quatro etapas da metodologia AIDA, avaliando a condução completa da negociação pelo operador.</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* SEÇÃO 4 — Como o CobraMind Avalia os Treinamentos */}
      <Section title="Como o CobraMind Avalia os Treinamentos" icon={<GraduationCap className="h-5 w-5" />}>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Os treinamentos do CobraMind avaliam não apenas a resposta do operador, mas também sua capacidade de interpretar o cenário, tomar a decisão correta e refletir sobre a lição aprendida.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Nota Final */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Nota Final</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">A Nota Final representa a qualidade geral do desempenho no treino, considerando aderência ao objetivo, clareza da resposta, consistência da abordagem e adequação da condução.</p>
              <div className="space-y-1.5">
                <WeightRow label="9.0 a 10" weight="🟢 Excelente" />
                <WeightRow label="7.0 a 8.9" weight="🔵 Bom" />
                <WeightRow label="5.0 a 6.9" weight="🟡 Regular" />
                <WeightRow label="0 a 4.9" weight="🔴 Crítico" />
              </div>
            </CardContent>
          </Card>

          {/* Qualidade da Resposta */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Qualidade da Resposta</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Avalia a qualidade prática da resposta do operador, incluindo clareza, objetividade e aplicabilidade.</p>
              <div className="flex gap-3 text-sm mt-3">
                <span className="text-success font-medium">🟢 Alta</span>
                <span className="text-warning font-medium">🟡 Média</span>
                <span className="text-destructive font-medium">🔴 Baixa</span>
              </div>
            </CardContent>
          </Card>

          {/* Entendimento */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Entendimento</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Mede se o operador entendeu corretamente a necessidade do cliente e o foco da negociação.</p>
              <div className="flex gap-3 text-sm mt-3">
                <span className="text-success font-medium">🟢 Alto</span>
                <span className="text-warning font-medium">🟡 Médio</span>
                <span className="text-destructive font-medium">🔴 Baixo</span>
              </div>
            </CardContent>
          </Card>

          {/* Coerência */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Coerência</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Avalia se a resposta é lógica, consistente e alinhada ao cenário apresentado.</p>
              <div className="flex gap-3 text-sm mt-3">
                <span className="text-success font-medium">🟢 Alta</span>
                <span className="text-warning font-medium">🟡 Média</span>
                <span className="text-destructive font-medium">🔴 Baixa</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Nível de Aprendizado, Interpretação/Decisão, Resposta/Reflexão */}
        <div className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Nível de Aprendizado</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Indica o quanto o operador transformou o cenário em aprendizado prático, demonstrando capacidade de corrigir erros e aplicar a abordagem esperada.</p>
              <div className="flex gap-3 text-sm mt-3">
                <span className="text-success font-medium">🟢 Alto</span>
                <span className="text-warning font-medium">🟡 Médio</span>
                <span className="text-destructive font-medium">🔴 Baixo</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Interpretação e Decisão</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">As perguntas de múltipla escolha ajudam a medir se o operador conseguiu interpretar corretamente o cenário e escolher a melhor ação antes mesmo de responder.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Resposta e Reflexão</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">O CobraMind analisa tanto a resposta prática quanto a lição que o operador tirou da negociação, para diferenciar execução de entendimento real.</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* SEÇÃO 5 — Ranking e Supervisão */}
      <Section title="Ranking e Supervisão" icon={<Trophy className="h-5 w-5" />}>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-muted-foreground">O ranking dos supervisores combina qualidade e volume para refletir o impacto real na operação.</p>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Fórmula do Score</p>
              <div className="bg-secondary/50 rounded-lg px-4 py-3">
                <code className="text-sm text-primary font-mono">
                  Score = (Qualidade Média × 10 × FatorVolume) + (Qtd Análises × 2)
                </code>
              </div>
              <p className="text-sm text-muted-foreground">Onde FatorVolume = min(1, Qtd Análises / 10)</p>
            </div>
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-sm font-medium text-foreground">Confiabilidade</p>
              <p className="text-sm text-muted-foreground">Indica o grau de certeza dos indicadores baseado no volume de análises:</p>
              <WeightRow label="Alta (10+ análises)" weight="🟢" />
              <WeightRow label="Média (5–9 análises)" weight="🟡" />
              <WeightRow label="Baixa (< 5 análises)" weight="🔴" />
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* SEÇÃO 6 — Sobre o CobraMind */}
      <Section title="Sobre a Metodologia" icon={<Users className="h-5 w-5" />}>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              O CobraMind não é apenas uma ferramenta — é uma metodologia de análise de negociações de cobrança baseada em inteligência artificial. Cada métrica foi projetada para transformar conversas em dados acionáveis, permitindo que supervisores e gestores tomem decisões baseadas em evidências, não em impressões.
            </p>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
