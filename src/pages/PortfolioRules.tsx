import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePortfolioFilter } from "@/hooks/usePortfolioFilter";
import { PortfolioFilter } from "@/components/PortfolioFilter";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";

interface CarteiraWithStatus {
  nome: string;
  status: "configured" | "incomplete" | "default";
  updatedAt?: string;
}

export default function PortfolioRules() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { isCoordination, isFounderEmail } = useUserRole();
  const { isFounder, getEmpresaFilter } = useCompanyFilter();
  const portfolio = usePortfolioFilter();

  const empresaFilter = getEmpresaFilter();
  const roleFilteredCarteiras = portfolio.carteiras;

  const { data: rules = [] } = useQuery({
    queryKey: ["portfolio-rules-list", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("portfolio_negotiation_rules")
        .select("carteira, updated_at, mandatory_guidelines, non_negotiable_cases, exclude_from_score_conditions");

      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  const filteredCarteiras = portfolio.selected && portfolio.selected !== "Todas"
    ? roleFilteredCarteiras.filter((c) => c === portfolio.selected)
    : roleFilteredCarteiras;

  const carteirasWithStatus: CarteiraWithStatus[] = filteredCarteiras.map((nome) => {
    const rule = rules.find((r) => r.carteira === nome || r.carteira === nome.toUpperCase());
    if (!rule) return { nome, status: "default" };
    const hasContent = !!(rule.mandatory_guidelines || rule.non_negotiable_cases || rule.exclude_from_score_conditions);
    return {
      nome,
      status: hasContent ? "configured" : "incomplete",
      updatedAt: rule.updated_at,
    };
  });

  const statusConfig = {
    configured: { label: "Configurada", variant: "default" as const, icon: CheckCircle, className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    incomplete: { label: "Incompleta", variant: "secondary" as const, icon: Clock, className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    default: { label: "Usando padrão", variant: "outline" as const, icon: AlertCircle, className: "bg-muted text-muted-foreground border-border" },
  };

  return (
    <div>
      <PageHeader
        title="Regras da Carteira"
        description="Configure as regras de negociação específicas de cada carteira para personalizar a avaliação da IA"
      />

      <div className="mb-6">
        <PortfolioFilter
          carteiras={portfolio.carteiras}
          selected={portfolio.selected}
          onSelect={portfolio.setSelected}
          showAllOption={portfolio.showAllOption}
        />
      </div>

      <div className="grid gap-4">
        {carteirasWithStatus.map((c) => {
          const cfg = statusConfig[c.status];
          const Icon = cfg.icon;
          return (
            <div
              key={c.nome}
              className="flex items-center justify-between p-4 bg-card border border-border rounded-xl"
            >
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">{c.nome}</h3>
                  {c.updatedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Atualizado em {new Date(c.updatedAt).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                <Badge className={cfg.className}>
                  <Icon className="h-3 w-3 mr-1" />
                  {cfg.label}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/portfolio-rules/${encodeURIComponent(c.nome)}`)}
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Editar regras
              </Button>
            </div>
          );
        })}

        {carteirasWithStatus.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma carteira encontrada. Cadastre carteiras na gestão de operadores.
          </div>
        )}
      </div>
    </div>
  );
}
