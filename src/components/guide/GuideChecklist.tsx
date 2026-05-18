import { CheckCircle2, Circle, ArrowRight, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanyPlan } from "@/hooks/useCompanyPlan";
import type { ModuleId } from "@/lib/planPermissions";
import type { ChecklistStatus } from "@/pages/GuidePage";

interface CheckItem {
  key: keyof ChecklistStatus;
  title: string;
  description: string;
  url: string;
  moduleId?: ModuleId;
}

const ETAPA_1: CheckItem[] = [
  { key: "carteiras", title: "Cadastrar carteiras", description: "Organize sua operação por segmento de vendas, faixa de atraso ou tipo de produto.", url: "/operators", moduleId: "operators" },
  { key: "supervisao", title: "Cadastrar supervisão", description: "Convide supervisores para acompanhar e treinar os operadores em tempo real.", url: "/team", moduleId: "team" },
  { key: "operadores", title: "Cadastrar operadores", description: "Registre os operadores que serão analisados pelo MindSell.", url: "/operators", moduleId: "operators" },
  { key: "regras", title: "Configurar regras da carteira", description: "Defina as diretrizes de negociação que a IA usará para avaliar cada operação.", url: "/portfolio-rules", moduleId: "portfolio-rules" },
];

const ETAPA_2: CheckItem[] = [
  { key: "analise", title: "Fazer a primeira análise", description: "Envie um áudio ou transcrição de negociação e veja a avaliação completa do MindSell.", url: "/new-analysis", moduleId: "new-analysis" },
  { key: "treino", title: "Gerar o primeiro treino", description: "Crie um treinamento inteligente baseado em erros reais identificados nas análises.", url: "/training-history", moduleId: "training-history" },
  { key: "metricas", title: "Acompanhar métricas", description: "Analise pelo menos 3 negociações para começar a visualizar tendências e padrões.", url: "/", moduleId: "dashboard" },
];

function ChecklistItem({ item, done, navigate, locked }: { item: CheckItem; done: boolean; navigate: (url: string) => void; locked: boolean }) {
  if (locked) {
    return (
      <div className="flex items-start gap-4 rounded-lg border p-4 border-border bg-muted/30 grayscale opacity-60 cursor-not-allowed select-none">
        <Lock className="h-5 w-5 text-muted-foreground/40 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">{item.description}</p>
          <p className="text-[10px] text-muted-foreground/50 mt-1 italic">Disponível em planos superiores</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${done ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      {done ? (
        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground/40 mt-0.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? "text-primary line-through" : "text-foreground"}`}>
          {item.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
      </div>
      {!done && (
        <Button variant="ghost" size="sm" className="shrink-0 text-xs" onClick={() => navigate(item.url)}>
          Abrir <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      )}
    </div>
  );
}

interface Props {
  checklist: ChecklistStatus;
  loading: boolean;
}

export function GuideChecklist({ checklist, loading }: Props) {
  const navigate = useNavigate();
  const { canAccessModule } = useCompanyPlan();

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  return (
    <div id="checklist" className="scroll-mt-8 space-y-6">
      <h2 className="text-xl font-heading font-bold text-foreground">Checklist de Ativação</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading">Etapa 1 — Configuração Inicial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ETAPA_1.map((item) => (
              <ChecklistItem
                key={item.key}
                item={item}
                done={checklist[item.key]}
                navigate={navigate}
                locked={!!item.moduleId && !canAccessModule(item.moduleId)}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading">Etapa 2 — Primeiras Ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ETAPA_2.map((item) => (
              <ChecklistItem
                key={item.key}
                item={item}
                done={checklist[item.key]}
                navigate={navigate}
                locked={!!item.moduleId && !canAccessModule(item.moduleId)}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
