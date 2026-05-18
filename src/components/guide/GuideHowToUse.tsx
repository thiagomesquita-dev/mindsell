import { Plus, History, Dumbbell, TrendingUp, Radar, Gamepad2, Settings, ArrowRight, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCompanyPlan } from "@/hooks/useCompanyPlan";
import type { ModuleId } from "@/lib/planPermissions";

interface Area {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  url: string;
  when: string;
  moduleId: ModuleId;
}

const AREAS: Area[] = [
  { icon: Plus, title: "Nova Análise", desc: "Envie áudios ou transcrições e receba avaliação completa do MindSell sobre a negociação.", url: "/new-analysis", when: "Sempre que quiser avaliar uma negociação específica.", moduleId: "new-analysis" },
  { icon: History, title: "Histórico", desc: "Consulte todas as análises realizadas, filtre por operador, carteira ou período.", url: "/analysis-history", when: "Para revisitar análises, comparar ou buscar padrões.", moduleId: "analysis-history" },
  { icon: Dumbbell, title: "Treinamentos", desc: "Gere treinos inteligentes baseados em erros reais das análises.", url: "/training-history", when: "Para corrigir pontos fracos com exercícios práticos.", moduleId: "training-history" },
  { icon: TrendingUp, title: "Evolução do Operador", desc: "Visualize a evolução semana a semana, identifique tendências e compare desempenho.", url: "/operator-evolution", when: "Para acompanhar melhora ou queda de cada operador.", moduleId: "operator-evolution" },
  { icon: Radar, title: "Radar da Operação", desc: "Identifique erros recorrentes, objeções frequentes e gargalos de fechamento.", url: "/operation-radar", when: "Para diagnóstico geral da equipe.", moduleId: "operation-radar" },
  { icon: Gamepad2, title: "Radar da Supervisão", desc: "Priorize acompanhamento, identifique operadores que precisam de coaching.", url: "/supervision-gamification", when: "Para decidir onde atuar primeiro como supervisor.", moduleId: "supervision-gamification" },
  { icon: Settings, title: "Configurações", desc: "Gerencie seu perfil, empresa, notificações e preferências.", url: "/settings", when: "Para ajustes e manutenção do sistema.", moduleId: "settings" },
];

export function GuideHowToUse() {
  const navigate = useNavigate();
  const { canAccessModule } = useCompanyPlan();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-heading font-bold text-foreground">Como Usar o MindSell</h2>
      <p className="text-sm text-muted-foreground">Conheça as áreas principais do sistema e saiba quando usar cada uma.</p>

      <div className="grid sm:grid-cols-2 gap-4">
        {AREAS.map((area) => {
          const locked = !canAccessModule(area.moduleId);

          if (locked) {
            return (
              <Card key={area.title} className="grayscale opacity-60 cursor-not-allowed select-none border-border">
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2">
                      <area.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-heading font-semibold text-muted-foreground">{area.title}</h3>
                    <Lock className="h-3.5 w-3.5 text-muted-foreground/50 ml-auto" />
                  </div>
                  <p className="text-xs text-muted-foreground/70 leading-relaxed">{area.desc}</p>
                  <p className="text-[10px] text-muted-foreground/50 italic">Disponível em planos superiores</p>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={area.title} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <area.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-heading font-semibold text-foreground">{area.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{area.desc}</p>
                <p className="text-xs text-muted-foreground/70 italic">Quando usar: {area.when}</p>
                <Button variant="ghost" size="sm" className="self-start text-xs mt-auto" onClick={() => navigate(area.url)}>
                  Abrir <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
