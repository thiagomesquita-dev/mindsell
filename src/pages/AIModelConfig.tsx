import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, History, Cpu, Brain, Dumbbell, Radar, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// --- Provider / Model catalog ---
const PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "google", label: "Google" },
  { id: "anthropic", label: "Anthropic" },
] as const;

const MODELS_BY_PROVIDER: Record<string, { id: string; label: string }[]> = {
  openai: [
    { id: "gpt-5.4", label: "GPT-5.4" },
    { id: "gpt-5.3-chat-latest", label: "GPT-5.3" },
    { id: "gpt-4.1", label: "GPT-4.1" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  ],
  google: [
    { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { id: "claude-opus-4-6", label: "Claude Opus 4" },
  ],
};

const ACTION_META: Record<string, { label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  analysis: { label: "Análise", description: "Modelo usado na análise de negociações", icon: Brain },
  training_generation: { label: "Geração de Treino", description: "Modelo usado para gerar cenários de treinamento", icon: Dumbbell },
  training_evaluation: { label: "Avaliação de Treino", description: "Modelo usado para avaliar respostas do operador", icon: Cpu },
  radar_diagnostic: { label: "Diagnóstico Radar", description: "Modelo usado no diagnóstico do radar da operação", icon: Radar },
};

interface ConfigRow {
  id: string;
  action_type: string;
  provider: string;
  model: string;
  fallback_provider: string | null;
  fallback_model: string | null;
  is_active: boolean;
  updated_at: string;
  updated_by: string | null;
}

interface HistoryRow {
  id: string;
  action_type: string;
  previous_provider: string | null;
  previous_model: string | null;
  new_provider: string;
  new_model: string;
  previous_fallback_provider: string | null;
  previous_fallback_model: string | null;
  new_fallback_provider: string | null;
  new_fallback_model: string | null;
  changed_at: string;
  changed_by: string | null;
}

function getModelLabel(provider: string, model: string): string {
  const models = MODELS_BY_PROVIDER[provider];
  const found = models?.find((m) => m.id === model);
  return found ? found.label : model;
}

function getProviderLabel(provider: string): string {
  return PROVIDERS.find((p) => p.id === provider)?.label ?? provider;
}

export default function AIModelConfig() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["ai-model-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_model_config")
        .select("*")
        .order("action_type");
      if (error) throw error;
      return data as ConfigRow[];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["ai-model-config-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_model_config_history")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as HistoryRow[];
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuração de IA"
        description="Controle dinâmico dos modelos de IA usados em cada fluxo do sistema"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {configs.map((cfg) => (
          <ConfigCard key={cfg.id} config={cfg} userId={user?.id} queryClient={queryClient} />
        ))}
      </div>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> Histórico de Alterações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma alteração registrada.</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {history.map((h) => {
                const meta = ACTION_META[h.action_type];
                return (
                  <div key={h.id} className="flex flex-col gap-1 border-b border-border pb-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{meta?.label ?? h.action_type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(h.changed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        {h.previous_provider ? `${getProviderLabel(h.previous_provider)} / ${h.previous_model}` : "—"}
                      </span>
                      {" → "}
                      <span className="font-medium">
                        {getProviderLabel(h.new_provider)} / {h.new_model}
                      </span>
                    </div>
                    {(h.previous_fallback_model || h.new_fallback_model) && (
                      <div className="text-xs text-muted-foreground">
                        Fallback: {h.previous_fallback_model ?? "—"} → {h.new_fallback_model ?? "—"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Individual config card ----

function ConfigCard({ config, userId, queryClient }: { config: ConfigRow; userId?: string; queryClient: ReturnType<typeof useQueryClient> }) {
  const [provider, setProvider] = useState(config.provider);
  const [model, setModel] = useState(config.model);
  const [fbProvider, setFbProvider] = useState(config.fallback_provider ?? "");
  const [fbModel, setFbModel] = useState(config.fallback_model ?? "");
  const [isActive, setIsActive] = useState(config.is_active);
  const [dirty, setDirty] = useState(false);

  const meta = ACTION_META[config.action_type];
  const Icon = meta?.icon ?? Cpu;
  const availableModels = MODELS_BY_PROVIDER[provider] ?? [];
  const fbModels = fbProvider ? (MODELS_BY_PROVIDER[fbProvider] ?? []) : [];

  const handleProviderChange = (v: string) => {
    setProvider(v);
    const first = MODELS_BY_PROVIDER[v]?.[0];
    setModel(first?.id ?? "");
    setDirty(true);
  };

  const handleFbProviderChange = (v: string) => {
    if (v === "__none__") {
      setFbProvider("");
      setFbModel("");
    } else {
      setFbProvider(v);
      const first = MODELS_BY_PROVIDER[v]?.[0];
      setFbModel(first?.id ?? "");
    }
    setDirty(true);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!model) throw new Error("Modelo obrigatório");
      if (fbProvider && !fbModel) throw new Error("Modelo de fallback obrigatório quando provider selecionado");
      if (fbProvider === provider && fbModel === model) throw new Error("Fallback não pode ser igual ao modelo principal");

      const { error } = await supabase
        .from("ai_model_config")
        .update({
          provider,
          model,
          fallback_provider: fbProvider || null,
          fallback_model: fbModel || null,
          is_active: isActive,
          updated_by: userId ?? null,
        })
        .eq("id", config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Configuração de ${meta?.label} salva`);
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["ai-model-config"] });
      queryClient.invalidateQueries({ queryKey: ["ai-model-config-history"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <Card className={!isActive ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{meta?.label}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`active-${config.id}`} className="text-xs text-muted-foreground">Ativo</Label>
            <Switch
              id={`active-${config.id}`}
              checked={isActive}
              onCheckedChange={(v) => { setIsActive(v); setDirty(true); }}
            />
          </div>
        </div>
        <CardDescription className="text-xs">{meta?.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">Provider</Label>
          <Select value={provider} onValueChange={handleProviderChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">Modelo</Label>
          <Select value={model} onValueChange={(v) => { setModel(v); setDirty(true); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableModels.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label} <span className="text-muted-foreground ml-1 text-xs">({m.id})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">Model ID: {model}</p>
        </div>

        {/* Fallback Provider */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">Fallback Provider <span className="text-muted-foreground">(opcional)</span></Label>
          <Select value={fbProvider || "__none__"} onValueChange={handleFbProviderChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fallback Model */}
        {fbProvider && (
          <div className="space-y-1">
            <Label className="text-xs font-medium">Fallback Modelo</Label>
            <Select value={fbModel} onValueChange={(v) => { setFbModel(v); setDirty(true); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {fbModels.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label} <span className="text-muted-foreground ml-1 text-xs">({m.id})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Fallback Model ID: {fbModel}</p>
          </div>
        )}

        {/* Current config summary */}
        <div className="rounded-md bg-muted/50 p-2 text-xs space-y-1">
          <p><strong>Configuração salva:</strong> {getProviderLabel(config.provider)} / {config.model}</p>
          {config.fallback_model && (
            <p><strong>Fallback:</strong> {getProviderLabel(config.fallback_provider ?? "")} / {config.fallback_model}</p>
          )}
          <p className="text-muted-foreground">
            Atualizado em {format(new Date(config.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </p>
        </div>

        {/* Validation warning */}
        {dirty && fbProvider === provider && fbModel === model && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" /> Fallback não pode ser igual ao modelo principal
          </div>
        )}

        <Button
          className="w-full"
          disabled={!dirty || mutation.isPending || (!model)}
          onClick={() => mutation.mutate()}
        >
          <Save className="h-4 w-4 mr-2" />
          {mutation.isPending ? "Salvando..." : "Salvar Configuração"}
        </Button>
      </CardContent>
    </Card>
  );
}
