import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";

const APPROACH_OPTIONS = [
  { value: "fechamento", label: "Fechamento" },
  { value: "retencao", label: "Retenção" },
  { value: "triagem", label: "Triagem" },
  { value: "encaminhamento", label: "Encaminhamento" },
  { value: "cobranca_com_proposta", label: "Cobrança com proposta" },
  { value: "cobranca_informativa", label: "Cobrança informativa" },
];

const EVALUATION_CRITERIA_OPTIONS = [
  { value: "fechamento", label: "Fechamento" },
  { value: "contorno_objecoes", label: "Contorno de objeções" },
  { value: "tentativa_compromisso", label: "Tentativa de compromisso" },
  { value: "confirmacao_data", label: "Confirmação de data" },
  { value: "proposta_financeira", label: "Proposta financeira" },
  { value: "orientacao_correta", label: "Orientação correta" },
  { value: "encaminhamento_correto", label: "Encaminhamento correto" },
];

interface RuleForm {
  can_offer_discount: boolean;
  can_offer_installments: boolean;
  can_confirm_payment_date: boolean;
  can_generate_boleto: boolean;
  can_discuss_reactivation: boolean;
  can_promise_plan_maintenance: boolean;
  can_close_on_first_contact: boolean;
  negotiation_possible_conditions: string;
  non_negotiable_cases: string;
  forbidden_terms: string;
  mandatory_guidelines: string;
  approach_objective: string;
  evaluation_criteria: string[];
  exclude_from_score_conditions: string;
  observations: string;
}

const DEFAULT_FORM: RuleForm = {
  can_offer_discount: true,
  can_offer_installments: true,
  can_confirm_payment_date: true,
  can_generate_boleto: true,
  can_discuss_reactivation: false,
  can_promise_plan_maintenance: false,
  can_close_on_first_contact: true,
  negotiation_possible_conditions: "",
  non_negotiable_cases: "",
  forbidden_terms: "",
  mandatory_guidelines: "",
  approach_objective: "fechamento",
  evaluation_criteria: ["fechamento", "contorno_objecoes", "tentativa_compromisso", "confirmacao_data", "proposta_financeira", "orientacao_correta"],
  exclude_from_score_conditions: "",
  observations: "",
};

export default function PortfolioRulesEdit() {
  const { carteira } = useParams<{ carteira: string }>();
  const decodedCarteira = decodeURIComponent(carteira || "");
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isCoordination, isFounderEmail, isLoading: rolesLoading } = useUserRole();
  const { isFounder, getEmpresaFilter } = useCompanyFilter();
  const empresaFilter = getEmpresaFilter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RuleForm>(DEFAULT_FORM);

  // Access check: supervisors must have carteira access
  const { data: hasAccess, isLoading: accessLoading } = useQuery({
    queryKey: ["carteira-access-check", user?.id, decodedCarteira],
    queryFn: async () => {
      // Coordination and founder always have access
      if (isCoordination || isFounderEmail) return true;

      // For supervisors, check user_portfolios
      const { data, error } = await supabase
        .from("user_portfolios")
        .select("id")
        .eq("user_id", user!.id)
        .eq("carteira", decodedCarteira)
        .maybeSingle();

      console.log("[PortfolioRulesEdit] Access check for", decodedCarteira, ":", !!data, error);
      return !!data;
    },
    enabled: !!user?.id && !!decodedCarteira && !rolesLoading,
  });

  console.log("[PortfolioRulesEdit] User:", user?.email, "| Carteira:", decodedCarteira, "| hasAccess:", hasAccess, "| isCoordination:", isCoordination);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["portfolio-rule", empresaFilter, isFounder, decodedCarteira],
    queryFn: async () => {
      let query = supabase
        .from("portfolio_negotiation_rules")
        .select("*")
        .eq("carteira", decodedCarteira);

      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: (isFounder || !!profile?.empresa_id) && !!decodedCarteira && hasAccess === true,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        can_offer_discount: existing.can_offer_discount,
        can_offer_installments: existing.can_offer_installments,
        can_confirm_payment_date: existing.can_confirm_payment_date,
        can_generate_boleto: existing.can_generate_boleto,
        can_discuss_reactivation: existing.can_discuss_reactivation,
        can_promise_plan_maintenance: existing.can_promise_plan_maintenance,
        can_close_on_first_contact: existing.can_close_on_first_contact,
        negotiation_possible_conditions: existing.negotiation_possible_conditions || "",
        non_negotiable_cases: existing.non_negotiable_cases || "",
        forbidden_terms: existing.forbidden_terms || "",
        mandatory_guidelines: existing.mandatory_guidelines || "",
        approach_objective: existing.approach_objective || "fechamento",
        evaluation_criteria: (existing.evaluation_criteria as string[]) || DEFAULT_FORM.evaluation_criteria,
        exclude_from_score_conditions: existing.exclude_from_score_conditions || "",
        observations: existing.observations || "",
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const effectiveEmpresaId = empresaFilter || profile?.empresa_id;
      if (!effectiveEmpresaId || !user?.id) throw new Error("Sem empresa");

      const payload = {
        empresa_id: effectiveEmpresaId,
        carteira: decodedCarteira,
        ...form,
        evaluation_criteria: form.evaluation_criteria,
      };

      if (existing?.id) {
        const { error } = await supabase
          .from("portfolio_negotiation_rules")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("portfolio_negotiation_rules")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Regras salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["portfolio-rule"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-rules-list"] });
    },
    onError: (err: Error) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });

  const toggleCriteria = (value: string) => {
    setForm((prev) => ({
      ...prev,
      evaluation_criteria: prev.evaluation_criteria.includes(value)
        ? prev.evaluation_criteria.filter((c) => c !== value)
        : [...prev.evaluation_criteria, value],
    }));
  };

  if (isLoading || rolesLoading || accessLoading) {
    return <div className="p-8 text-muted-foreground">Carregando...</div>;
  }

  // Block access for unauthorized supervisors
  if (hasAccess === false) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-semibold text-foreground">Acesso negado</h2>
        <p className="text-muted-foreground">
          Você não tem permissão para acessar as regras desta carteira.
        </p>
        <Button variant="outline" onClick={() => navigate("/portfolio-rules")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para listagem
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/portfolio-rules")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
      </Button>

      <PageHeader
        title={`Regras — ${decodedCarteira}`}
        description="Configure as diretrizes de negociação desta carteira"
      />

      <div className="space-y-8">
        {/* Bloco: Alçada de Negociação */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Alçada de Negociação</h2>
          <p className="text-sm text-muted-foreground">O que o operador pode fazer nesta carteira?</p>

          {[
            { key: "can_offer_discount", label: "Pode ofertar desconto?" },
            { key: "can_offer_installments", label: "Pode ofertar parcelamento?" },
            { key: "can_confirm_payment_date", label: "Pode confirmar data de pagamento?" },
            { key: "can_generate_boleto", label: "Pode gerar boleto?" },
            { key: "can_discuss_reactivation", label: "Pode falar em reativação?" },
            { key: "can_promise_plan_maintenance", label: "Pode prometer manutenção do plano/contrato?" },
            { key: "can_close_on_first_contact", label: "Pode fechar no primeiro contato?" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="text-sm">{label}</Label>
              <Switch
                checked={form[key as keyof RuleForm] as boolean}
                onCheckedChange={(v) => setForm((p) => ({ ...p, [key]: v }))}
              />
            </div>
          ))}
        </section>

        {/* Bloco: Restrições */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Restrições</h2>
          <p className="text-sm text-muted-foreground">O que o operador não pode fazer ou prometer nesta carteira.</p>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">O que o operador NÃO pode prometer?</Label>
            <Textarea
              value={form.forbidden_terms}
              onChange={(e) => setForm((p) => ({ ...p, forbidden_terms: e.target.value }))}
              placeholder="Ex: cancelar multa, isentar juros retroativos, prometer retorno de limite..."
              className="bg-card border-border"
            />
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Quando deve encaminhar para outro setor?</Label>
            <Textarea
              value={form.non_negotiable_cases}
              onChange={(e) => setForm((p) => ({ ...p, non_negotiable_cases: e.target.value }))}
              placeholder="Ex: cliente pede cancelamento judicial, pedido de estorno..."
              className="bg-card border-border"
            />
          </div>
        </section>

        {/* Bloco: Diretrizes Obrigatórias */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Diretrizes Obrigatórias</h2>
          <p className="text-sm text-muted-foreground">
            Orientações que o operador deve seguir obrigatoriamente durante a negociação. Informações aqui prevalecem sobre interpretações genéricas de restrição.
          </p>

          <Textarea
            value={form.mandatory_guidelines}
            onChange={(e) => setForm((p) => ({ ...p, mandatory_guidelines: e.target.value }))}
            placeholder="Ex: sempre confirmar CPF, informar prazo de compensação, após quitação total o cliente pode voltar a utilizar o cartão em até 5 dias úteis..."
            className="bg-card border-border min-h-[120px]"
          />
        </section>

        {/* Bloco: Objetivo da abordagem */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Objetivo da Abordagem</h2>

          <Select
            value={form.approach_objective}
            onValueChange={(v) => setForm((p) => ({ ...p, approach_objective: v }))}
          >
            <SelectTrigger className="bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {APPROACH_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        {/* Bloco: Critérios de avaliação */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Critérios de Avaliação</h2>
          <p className="text-sm text-muted-foreground">Quais aspectos devem ser avaliados pela IA?</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {EVALUATION_CRITERIA_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <Checkbox
                  checked={form.evaluation_criteria.includes(opt.value)}
                  onCheckedChange={() => toggleCriteria(opt.value)}
                />
                <Label className="text-sm cursor-pointer">{opt.label}</Label>
              </div>
            ))}
          </div>
        </section>

        {/* Bloco: Casos sem negociação elegível */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Casos sem Negociação Elegível</h2>
          <p className="text-sm text-muted-foreground">
            Situações que não devem gerar nota de fechamento nem penalizar o operador.
          </p>

          <Textarea
            value={form.exclude_from_score_conditions}
            onChange={(e) => setForm((p) => ({ ...p, exclude_from_score_conditions: e.target.value }))}
            placeholder="Ex: contrato cancelado sem alçada, atendimento apenas informativo, dependência de outro setor..."
            className="bg-card border-border min-h-[120px]"
          />
        </section>

        {/* Bloco: Condições possíveis */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Condições de Negociação Possíveis</h2>

          <Textarea
            value={form.negotiation_possible_conditions}
            onChange={(e) => setForm((p) => ({ ...p, negotiation_possible_conditions: e.target.value }))}
            placeholder="Ex: desconto de até 30% à vista, parcelamento em até 12x..."
            className="bg-card border-border"
          />
        </section>

        {/* Bloco: Observações */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Observações</h2>

          <Textarea
            value={form.observations}
            onChange={(e) => setForm((p) => ({ ...p, observations: e.target.value }))}
            placeholder="Particularidades desta carteira..."
            className="bg-card border-border"
          />
        </section>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full h-12 text-base font-semibold rounded-xl"
        >
          <Save className="h-5 w-5 mr-2" />
          {saveMutation.isPending ? "Salvando..." : "Salvar Regras"}
        </Button>
      </div>
    </div>
  );
}
