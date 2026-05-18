import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { GuideWelcome } from "@/components/guide/GuideWelcome";
import { GuideChecklist } from "@/components/guide/GuideChecklist";
import { GuideHowToUse } from "@/components/guide/GuideHowToUse";
import { GuideInterpretResults } from "@/components/guide/GuideInterpretResults";
import { GuideSupportContent } from "@/components/guide/GuideSupportContent";

export interface ChecklistStatus {
  carteiras: boolean;
  supervisao: boolean;
  operadores: boolean;
  regras: boolean;
  analise: boolean;
  treino: boolean;
  metricas: boolean;
}

export default function GuidePage() {
  const { profile } = useAuth();
  const [checklist, setChecklist] = useState<ChecklistStatus>({
    carteiras: false,
    supervisao: false,
    operadores: false,
    regras: false,
    analise: false,
    treino: false,
    metricas: false,
  });
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.empresa_id) return;
    const empresaId = profile.empresa_id;

    async function loadStatus() {
      setLoading(true);
      try {
        const [carteiras, operadores, regras, analises, treinos, supervisao] = await Promise.all([
          supabase.from("company_carteiras").select("id", { count: "exact", head: true }).eq("empresa_id", empresaId),
          supabase.from("operators").select("id", { count: "exact", head: true }).eq("empresa_id", empresaId),
          supabase.from("portfolio_negotiation_rules").select("id", { count: "exact", head: true }).eq("empresa_id", empresaId),
          supabase.from("analyses").select("id", { count: "exact", head: true }).eq("empresa_id", empresaId),
          supabase.from("training_sessions").select("id", { count: "exact", head: true }).eq("empresa_id", empresaId),
          supabase.from("company_memberships").select("id", { count: "exact", head: true }).eq("company_id", empresaId).in("role", ["gestor", "supervisor"]),
        ]);

        // Check trial
        const { data: sub } = await supabase
          .from("company_subscriptions")
          .select("trial_ends_at, status")
          .eq("empresa_id", empresaId)
          .maybeSingle();

        if (sub?.trial_ends_at) {
          const diff = Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          setTrialDaysLeft(Math.max(0, diff));
        }

        setChecklist({
          carteiras: (carteiras.count ?? 0) > 0,
          supervisao: (supervisao.count ?? 0) > 1, // at least gestor + 1 supervisor
          operadores: (operadores.count ?? 0) > 0,
          regras: (regras.count ?? 0) > 0,
          analise: (analises.count ?? 0) > 0,
          treino: (treinos.count ?? 0) > 0,
          metricas: (analises.count ?? 0) >= 3,
        });
      } catch (err) {
        console.error("Error loading guide status:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, [profile?.empresa_id]);

  const completedCount = Object.values(checklist).filter(Boolean).length;

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <PageHeader
        title="Primeiros Passos"
        description="Configure sua operação e comece a transformar negociações em inteligência."
      />

      <GuideWelcome trialDaysLeft={trialDaysLeft} completedCount={completedCount} loading={loading} />
      <GuideChecklist checklist={checklist} loading={loading} />
      <GuideHowToUse />
      <GuideInterpretResults />
      <GuideSupportContent />
    </div>
  );
}
