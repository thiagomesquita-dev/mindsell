import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Brain, CheckCircle2, Eye, MessageSquareWarning, Send, Shield, Sparkles, Target, TrendingUp, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const APP_URL = "https://app.cobramind.ia.br";

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-7 w-7 text-primary" />
          <span className="text-xl font-heading font-bold text-foreground">CobraMind</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#como-funciona" className="hover:text-foreground transition-colors">Como funciona</a>
          <a href="#resultados" className="hover:text-foreground transition-colors">Resultados</a>
          <Link to="/planos" className="hover:text-foreground transition-colors">Planos</Link>
        </nav>
        <a href={APP_URL}>
          <Button variant="outline" size="sm">Entrar</Button>
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="pt-32 pb-20 sm:pt-40 sm:pb-28 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-foreground leading-tight tracking-tight">
          Pare de perder acordos<br className="hidden sm:block" /> por erro de operador
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          O CobraMind analisa negociações, identifica falhas e transforma sua equipe em uma máquina de conversão.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/planos">
            <Button size="lg" className="text-base px-8 gap-2">
              Ver planos <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href={APP_URL}>
            <Button variant="outline" size="lg" className="text-base px-8">
              Acessar sistema
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

function PainSection() {
  const pains = [
    "Quem está performando bem",
    "Onde estão os erros",
    "Quais negociações poderiam ter sido fechadas",
  ];

  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-muted/50">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
          Você sabe quanto está perdendo em cada negociação?
        </h2>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Sua equipe negocia todos os dias, mas você não sabe:
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          {pains.map((pain) => (
            <div key={pain} className="flex items-center gap-3 text-left">
              <MessageSquareWarning className="h-5 w-5 text-destructive shrink-0" />
              <span className="text-foreground font-medium">{pain}</span>
            </div>
          ))}
        </div>
        <p className="mt-8 text-lg font-semibold text-foreground">
          O dinheiro está sendo perdido dentro das conversas.
        </p>
      </div>
    </section>
  );
}

function SolutionSection() {
  const items = [
    { icon: BarChart3, text: "Análise automática de conversas" },
    { icon: Target, text: "Diagnóstico claro de erros" },
    { icon: TrendingUp, text: "Chance de pagamento e risco de quebra" },
    { icon: Users, text: "Treinamento automático da equipe" },
    { icon: Eye, text: "Visão completa da operação" },
  ];

  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
          O CobraMind transforma cada negociação em inteligência
        </h2>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(({ icon: Icon, text }) => (
            <div key={text} className="rounded-lg border border-border bg-card p-6 text-left hover:shadow-md transition-shadow">
              <Icon className="h-8 w-8 text-primary mb-4" />
              <p className="text-foreground font-semibold">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { num: "1", title: "Envie a negociação", desc: "Texto ou áudio da conversa com o cliente.", icon: Send },
    { num: "2", title: "O CobraMind analisa com IA", desc: "Análise completa em segundos usando inteligência artificial.", icon: Brain },
    { num: "3", title: "Receba diagnóstico completo", desc: "Score, chance de pagamento, erros, sugestões práticas.", icon: Sparkles },
    { num: "4", title: "Gere treino para o operador", desc: "Treinamento automático com avaliação pedagógica.", icon: Zap },
  ];

  return (
    <section id="como-funciona" className="py-20 sm:py-28 px-4 sm:px-6 bg-muted/50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground text-center">
          Como funciona
        </h2>
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map(({ num, title, desc, icon: Icon }) => (
            <div key={num} className="text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-primary flex items-center justify-center mb-4">
                <Icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Passo {num}</span>
              <h3 className="mt-2 text-lg font-heading font-bold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ResultsSection() {
  const results = [
    "Mais acordos fechados",
    "Menos quebra de acordo",
    "Operadores mais preparados",
    "Supervisão com controle real",
  ];

  return (
    <section id="resultados" className="py-20 sm:py-28 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
          Não é sobre análise. É sobre resultado.
        </h2>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-xl mx-auto">
          {results.map((r) => (
            <div key={r} className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              <span className="text-foreground font-medium text-left">{r}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VisionSection() {
  const items = [
    "Erros da operação",
    "Padrões de comportamento",
    "Operadores com dificuldade",
    "Oportunidades perdidas",
  ];

  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-muted/50">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
          O que você passa a enxergar
        </h2>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-xl mx-auto">
          {items.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
              <Shield className="h-5 w-5 text-primary shrink-0" />
              <span className="text-foreground font-medium text-left">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
          Comece a analisar sua operação hoje
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Escolha o plano ideal para sua empresa ou acesse o sistema agora.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/planos">
            <Button size="lg" className="text-base px-8 gap-2">
              Ver planos <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href={APP_URL}>
            <Button variant="outline" size="lg" className="text-base px-8">
              Acessar sistema
            </Button>
          </a>
        </div>
      </div>
    </section>
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <Header />
      <main>
        <Hero />
        <PainSection />
        <SolutionSection />
        <HowItWorks />
        <ResultsSection />
        <VisionSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
