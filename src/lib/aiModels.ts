/**
 * Central source of truth for AI models available in MindSell.
 *
 * Both the frontend (NewAnalysis, AnalysisResult) and backend (edge functions)
 * must stay aligned with these definitions.
 *
 * The `providerId` is what gets sent to the backend as `provider`.
 * The backend resolves it to the actual `modelId` for the API call.
 */

export interface AIModelDef {
  /** Key sent to backend as `provider` value */
  providerId: string;
  /** Actual model identifier used in the API call */
  modelId: string;
  /** User-facing label */
  label: string;
  /** Short description for UI cards */
  description: string;
  /** Provider company name */
  provider: "OpenAI" | "Google" | "Anthropic";
  /** Available in "Nova Análise" dropdown */
  activeForAnalysis: boolean;
  /** Available in "Reanalisar" cards */
  activeForReanalysis: boolean;
}

export const AI_MODELS: AIModelDef[] = [
  {
    providerId: "openai",
    modelId: "gpt-4.1",
    label: "GPT-4.1",
    description: "OpenAI — equilíbrio entre custo e qualidade",
    provider: "OpenAI",
    activeForAnalysis: true,
    activeForReanalysis: true,
  },
  {
    providerId: "gpt53",
    modelId: "gpt-5.3-chat-latest",
    label: "GPT-5.3",
    description: "OpenAI — última geração, alta qualidade",
    provider: "OpenAI",
    activeForAnalysis: true,
    activeForReanalysis: true,
  },
  {
    providerId: "gemini",
    modelId: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro Preview",
    description: "Google — bom em contextos longos",
    provider: "Google",
    activeForAnalysis: true,
    activeForReanalysis: true,
  },
  {
    providerId: "gemini25pro",
    modelId: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    description: "Google — modelo estável e versátil",
    provider: "Google",
    activeForAnalysis: true,
    activeForReanalysis: true,
  },
  {
    providerId: "claude",
    modelId: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    description: "Anthropic — detalhista e analítico",
    provider: "Anthropic",
    activeForAnalysis: true,
    activeForReanalysis: true,
  },
  {
    providerId: "opus",
    modelId: "claude-opus-4-6",
    label: "Claude Opus 4",
    description: "Anthropic — máxima qualidade (custo alto)",
    provider: "Anthropic",
    activeForAnalysis: true,
    activeForReanalysis: true,
  },
];

/** Models available for the "Nova Análise" form */
export const ANALYSIS_MODELS = AI_MODELS.filter((m) => m.activeForAnalysis);

/** Models available for the "Reanalisar" panel */
export const REANALYSIS_MODELS = AI_MODELS.filter((m) => m.activeForReanalysis);

/** Resolve a modelId (from DB) to a friendly label */
export function getModelLabel(modelId: string | null | undefined): string {
  if (!modelId) return "Não identificado";
  const found = AI_MODELS.find(
    (m) => m.modelId === modelId || m.providerId === modelId
  );
  return found ? `${found.label} (${found.modelId})` : modelId;
}

/** Resolve a providerId to its modelId */
export function getModelIdFromProvider(providerId: string): string {
  const found = AI_MODELS.find((m) => m.providerId === providerId);
  return found?.modelId ?? providerId;
}
