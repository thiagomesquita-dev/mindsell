import { Link } from "react-router-dom";
import { ArrowRight, Brain, Check, X, Sparkles, Users, Zap, Building2 } from "lucide-react";
import { RoiSimulator } from "@/components/RoiSimulator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const APP_URL = "https://app.cobramind.ia.br";

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/site" className="flex items-center gap-2">
          <Brain className="h-7 w-7 text-primary" />
          <span className="text-xl font-heading font-bold text-foreground">CobraMind</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link to="/site#como-funciona" className="hover:text-foreground transition-colors">Como funciona</Link>
          <Link to="/planos" className="hover:text-foreground transition-colors text-foreground">Planos</Link>
        </nav>
        <a href={APP_URL}>
          <Button variant="outline" size="sm">Entrar</Button>
        </a>
      </div>
    </header>
  );
}

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  icon: React.ElementType;
  description: string;
  price: string;
  priceSuffix?: string;
  limits: string[];
  features: PlanFeature[];
  note: string;
  highlighted?: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    name: "Essencial",
    icon: Zap,
    description: "Para começar a enxergar a operação com clareza",
    price: "R$ 697",
    priceSuffix: "/ mês",
    limits: ["Até 3 operadores monitorados", "Até 500 análises/mês"],
    features: [
      { text: "Análise completa de negociações", included: true },
      { text: "Score AIDA automático", included: true },
      { text: "Chance de pagamento + risco de quebra", included: true },
      { text: "Diagnóstico claro por negociação", included: true },
      { text: "Exportação de relatórios", included: true },
      { text: "Treinamento inteligente", included: false },
      { text: "Radar da supervisão", included: false },
    ],
    note: "Ideal para iniciar e organizar a operação",
  },
  {
    name: "Profissional",
    icon: Sparkles,
    description: "Para transformar sua equipe em performance",
    price: "R$ 1.497",
    priceSuffix: "/ mês",
    limits: ["Até 10 operadores monitorados", "Até 2.000 análises/mês"],
    features: [
      { text: "Tudo do Essencial", included: true },
      { text: "Treinamento inteligente automático", included: true },
      { text: "Radar da operação (erros e padrões)", included: true },
      { text: "Evolução da equipe por dados", included: true },
    ],
    note: "Aqui a operação começa a melhorar de verdade",
    highlighted: true,
    badge: "Mais escolhido",
  },
  {
    name: "Performance",
    icon: Users,
    description: "Para operações que não podem perder dinheiro",
    price: "R$ 2.997",
    priceSuffix: "/ mês",
    limits: ["Até 20 operadores monitorados", "Até 5.000 análises/mês"],
    features: [
      { text: "Tudo do Profissional", included: true },
      { text: "Prioridade de processamento", included: true },
      { text: "Visão avançada de performance", included: true },
      { text: "Gestão mais estratégica da supervisão", included: true },
      { text: "Insights acionáveis da operação", included: true },
    ],
    note: "Para escalar resultado com consistência",
  },
  {
    name: "Enterprise",
    icon: Building2,
    description: "Para quem quer controle total da operação",
    price: "Sob consulta",
    limits: ["Operadores sob medida", "Volume sob medida"],
    features: [
      { text: "Tudo do Performance", included: true },
      { text: "Customizações específicas", included: true },
      { text: "Suporte prioritário", included: true },
      { text: "Acompanhamento estratégico", included: true },
    ],
    note: "O CobraMind adaptado à sua operação",
  },
];

const additionalOperators = [
  { plan: "Essencial", price: "R$ 79" },
  { plan: "Profissional", price: "R$ 69" },
  { plan: "Performance", price: "R$ 59" },
];

function PlanCard({ plan }: { plan: Plan }) {
  const Icon = plan.icon;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border bg-card p-6 sm:p-8 transition-shadow",
        plan.highlighted
          ? "border-primary shadow-lg ring-2 ring-primary/20 scale-[1.02]"
          : "border-border hover:shadow-md"
      )}
    >
      {plan.badge && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 text-xs">
          ⭐ {plan.badge}
        </Badge>
      )}

      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center",
          plan.highlighted ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-xl font-heading font-bold text-foreground">{plan.name}</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-5">{plan.description}</p>

      <div className="mb-5">
        <span className="text-3xl font-heading font-extrabold text-foreground">{plan.price}</span>
        {plan.priceSuffix && (
          <span className="text-sm text-muted-foreground ml-1">{plan.priceSuffix}</span>
        )}
      </div>

      <div className="flex flex-col gap-1 mb-6">
        {plan.limits.map((l) => (
          <span key={l} className="text-xs font-medium text-muted-foreground bg-muted rounded-md px-3 py-1.5">
            {l}
          </span>
        ))}
      </div>

      <div className="flex-1 flex flex-col gap-3 mb-6">
        {plan.features.map((f) => (
          <div key={f.text} className="flex items-start gap-2.5">
            {f.included ? (
              <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
            ) : (
              <X className="h-4 w-4 text-destructive/50 shrink-0 mt-0.5" />
            )}
            <span className={cn("text-sm", f.included ? "text-foreground" : "text-muted-foreground line-through")}>
              {f.text}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-5 flex items-start gap-1.5">
        <span>💡</span> {plan.note}
      </p>

      <a href={APP_URL} className="mt-auto">
        <Button
          className="w-full"
          variant={plan.highlighted ? "default" : "outline"}
          size="lg"
        >
          {plan.price === "Sob consulta" ? "Falar com a gente" : "Começar agora"}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </a>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span className="font-heading font-bold text-foreground">CobraMind</span>
        </div>
        <div className="flex items-center gap-6">
          <a href={APP_URL} className="hover:text-foreground transition-colors">Acessar sistema</a>
          <span>contato@cobramind.ia.br</span>
        </div>
        <span>© {new Date().getFullYear()} CobraMind. Todos os direitos reservados.</span>
      </div>
    </footer>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <Header />

      <main>
        {/* Hero */}
        <section className="pt-32 pb-16 sm:pt-40 sm:pb-20 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold text-foreground leading-tight tracking-tight">
              Planos feitos para escalar sua operação
              <br className="hidden sm:block" />
              — não limitar ela
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Escolha quantos operadores você quer evoluir e comece a transformar suas negociações em resultado.
            </p>
          </div>
        </section>

        {/* Plans Grid */}
        <section className="pb-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5 items-start">
            {plans.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </div>
        </section>

        {/* Additional Operators */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-muted/50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
              Escale conforme sua equipe cresce
            </h2>
            <p className="mt-4 text-muted-foreground">Operadores adicionais por plano:</p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
              {additionalOperators.map((item) => (
                <div key={item.plan} className="rounded-lg border border-border bg-card p-5 text-center">
                  <p className="text-sm font-medium text-muted-foreground">{item.plan}</p>
                  <p className="mt-2 text-2xl font-heading font-bold text-foreground">{item.price}</p>
                  <p className="text-xs text-muted-foreground">/ operador</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              📌 Uso justo de análises conforme perfil da operação
            </p>
          </div>
        </section>

        {/* ROI Simulator */}
        <RoiSimulator />

        {/* CTA Final */}
        <section className="py-20 sm:py-28 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
              Comece a analisar sua operação hoje
            </h2>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={APP_URL}>
                <Button size="lg" className="text-base px-8 gap-2">
                  Começar agora <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <a href="mailto:contato@cobramind.ia.br">
                <Button variant="outline" size="lg" className="text-base px-8">
                  Falar com a gente
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
