import { Brain, Clock, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  trialDaysLeft: number | null;
  completedCount: number;
  loading: boolean;
}

export function GuideWelcome({ trialDaysLeft, completedCount, loading }: Props) {
  const navigate = useNavigate();
  const progress = Math.round((completedCount / 7) * 100);

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-shrink-0 rounded-2xl bg-primary/10 p-4">
            <Brain className="h-10 w-10 text-primary" />
          </div>

          <div className="flex-1 space-y-3">
            <h2 className="text-2xl font-heading font-bold text-foreground">
              Bem-vindo ao MindSell! 🎉
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Configure sua operação, faça sua primeira análise e veja como o MindSell transforma
              negociação em inteligência operacional.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              {trialDaysLeft !== null && (
                <div className="flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
                  <Clock className="h-4 w-4" />
                  {trialDaysLeft > 0
                    ? `${trialDaysLeft} dia${trialDaysLeft > 1 ? "s" : ""} restante${trialDaysLeft > 1 ? "s" : ""} de teste`
                    : "Período de teste encerrado"}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Rocket className="h-4 w-4" />
                {completedCount}/7 etapas concluídas
              </div>
            </div>

            <div className="pt-2 max-w-md">
              <Progress value={progress} className="h-2" />
            </div>
          </div>

          <Button size="lg" className="shrink-0 font-heading font-semibold" onClick={() => {
            const section = document.getElementById("checklist");
            section?.scrollIntoView({ behavior: "smooth" });
          }}>
            Começar agora
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
