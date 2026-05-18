import { BookOpen, BarChart3, Radar, TrendingUp, Dumbbell, HelpCircle, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useCompanyPlan } from "@/hooks/useCompanyPlan";
import type { ModuleId } from "@/lib/planPermissions";

interface SupportLink {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  url: string;
  moduleId?: ModuleId;
}

const LINKS: SupportLink[] = [
  { icon: BookOpen, title: "Como o MindSell avalia", desc: "Entenda a metodologia e os critérios usados pela IA.", url: "/methodology", moduleId: "methodology" },
  { icon: BarChart3, title: "Como interpretar VENDA", desc: "Validação, Exploração, Necessidade, Demonstração e Ação na prática.", url: "/guide#venda" },
  { icon: Radar, title: "Como usar os radares", desc: "Operação e Supervisão: guias de leitura prática.", url: "/guide#radar-operacao", moduleId: "operation-radar" },
  { icon: TrendingUp, title: "Como ler evolução do operador", desc: "Tendência, consistência e pontos de ação.", url: "/guide#evolucao", moduleId: "operator-evolution" },
  { icon: Dumbbell, title: "Como usar treinos inteligentes", desc: "Transforme erros em capacitação real.", url: "/guide#treinos", moduleId: "training-history" },
  { icon: HelpCircle, title: "Dúvidas frequentes", desc: "Respostas para as perguntas mais comuns.", url: "/methodology" },
];

export function GuideSupportContent() {
  const navigate = useNavigate();
  const { canAccessModule } = useCompanyPlan();

  const handleClick = (url: string) => {
    if (url.startsWith("/guide#")) {
      const id = url.replace("/guide#", "");
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        const trigger = el.querySelector("[data-state]");
        if (trigger && trigger.getAttribute("data-state") === "closed") {
          (trigger as HTMLElement).click();
        }
        return;
      }
    }
    navigate(url);
  };

  return (
    <div className="space-y-6 pb-8">
      <h2 className="text-xl font-heading font-bold text-foreground">Conteúdo de Apoio</h2>
      <p className="text-sm text-muted-foreground">Materiais complementares para aprofundar seu conhecimento no sistema.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {LINKS.map((link) => {
          const locked = link.moduleId ? !canAccessModule(link.moduleId) : false;

          if (locked) {
            return (
              <Card key={link.title} className="grayscale opacity-60 cursor-not-allowed select-none border-border">
                <CardContent className="p-5 flex items-start gap-3">
                  <div className="rounded-lg bg-muted p-2 shrink-0">
                    <link.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-medium text-muted-foreground">{link.title}</h3>
                      <Lock className="h-3 w-3 text-muted-foreground/50" />
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{link.desc}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1 italic">Disponível em planos superiores</p>
                  </div>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card
              key={link.title}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => handleClick(link.url)}
            >
              <CardContent className="p-5 flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                  <link.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground">{link.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
