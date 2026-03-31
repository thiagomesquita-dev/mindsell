import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "gpt-4.1-mini";
const PROVIDER = "openai";

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1": { input: 2.0, output: 8.0 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const costs = MODEL_COSTS[model] || { input: 0.4, output: 1.6 };
  return Math.round(((promptTokens / 1_000_000) * costs.input + (completionTokens / 1_000_000) * costs.output) * 10000) / 10000;
}

const SYSTEM_PROMPT = `Você é um supervisor sênior de cobrança com 15 anos de experiência. Gere um treino interativo baseado na análise fornecida.
Responda APENAS com JSON válido, sem explicações. Seja extremamente conciso.
Limite cada campo de texto a no máximo 2 frases.
Limite listas a no máximo 4 itens.
Para simulacao_etapas, gere exatamente 3 ou 4 etapas de roleplay progressivas.
Para quiz, gere exatamente 2 perguntas (1 aberta e 1 múltipla escolha).
IMPORTANTE: Gere também as perguntas de interpretação e decisão com 4 alternativas cada, sendo apenas 1 correta.

REGRAS CRÍTICAS PARA O CAMPO script_ideal (Resposta Ideal):
1. ANALISE A OBJEÇÃO ANTES DE TUDO: Identifique a natureza da objeção (titularidade, responsabilidade financeira, legitimidade, valor, prazo, emocional, etc.).
2. RESPEITE A ETAPA DA NEGOCIAÇÃO: Se a objeção envolve dúvida sobre titularidade, responsabilidade pelo débito, legitimidade da cobrança ou vínculo com a dívida, a resposta ideal DEVE primeiro acolher, investigar e esclarecer — NUNCA pular direto para proposta de fechamento, desconto ou parcelamento.
3. PROIBIDO FECHAMENTO PREMATURO: Só sugira fechamento, desconto ou parcelamento quando o contexto indicar que a objeção principal já foi resolvida e o cliente está pronto para negociar valores.
4. SEM PLACEHOLDERS GENÉRICOS: Não use "valor X", "Y vezes", "desconto de Z%". Use linguagem natural e estratégica baseada no cenário real.
5. A resposta ideal deve parecer uma fala real de um operador experiente, não um template.
6. ORDEM OBRIGATÓRIA: Acolhimento → Investigação/Esclarecimento → Direcionamento → (só se aplicável) Proposta.

REGRAS PARA simulacao_etapas E cenario:
- As etapas devem refletir a progressão natural da objeção identificada.
- Se a objeção é sobre titularidade/responsabilidade, as primeiras etapas devem focar em investigação e esclarecimento, não em oferta comercial.
- A resposta_ideal de cada etapa deve seguir as mesmas regras do script_ideal.`;

interface TrainingRequest {
  erro_principal: string | null;
  objecao: string | null;
  resumo: string | null;
  aida_atencao: unknown;
  aida_interesse: unknown;
  aida_desejo: unknown;
  aida_acao: unknown;
  operador: string;
  carteira: string;
  analysis_id?: string;
  empresa_id?: string;
  user_id?: string;
}

function classifyObjection(objecao: string | null): string {
  if (!objecao) return "nao_identificada";
  const lower = objecao.toLowerCase();
  const titularidade = ["titular", "nome dele", "nome dela", "não sou eu", "não é meu", "não é minha", "quem paga", "responsável", "responsabilidade", "não fui eu", "conta não é minha", "plano não é meu", "não reconheço", "não contratei"];
  const legitimidade = ["não devo", "já paguei", "cobrado errado", "valor errado", "não é justo", "indevid", "cobrança indevida", "não procede", "contestar", "contestação"];
  if (titularidade.some(t => lower.includes(t))) return "titularidade_responsabilidade";
  if (legitimidade.some(t => lower.includes(t))) return "legitimidade";
  if (lower.includes("desconto") || lower.includes("caro") || lower.includes("não tenho dinheiro") || lower.includes("não posso pagar")) return "financeira";
  if (lower.includes("depois") || lower.includes("agora não") || lower.includes("sem tempo")) return "tempo";
  return "geral";
}

const TOOL_DEFINITION = {
  type: "function",
  function: {
    name: "generate_training",
    description: "Generate a structured interactive training exercise",
    parameters: {
      type: "object",
      properties: {
        nivel_dificuldade: { type: "string", enum: ["Básico", "Intermediário", "Avançado"] },
        cenario: {
          type: "object",
          properties: { fala_cliente: { type: "string" }, contexto_emocional: { type: "string" } },
          required: ["fala_cliente", "contexto_emocional"],
        },
        objetivo_operador: { type: "array", items: { type: "string" }, maxItems: 4 },
        pergunta_interpretacao: {
          type: "object",
          properties: {
            pergunta: { type: "string" },
            alternativas: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
            resposta_correta: { type: "integer" },
          },
          required: ["pergunta", "alternativas", "resposta_correta"],
        },
        pergunta_decisao: {
          type: "object",
          properties: {
            pergunta: { type: "string" },
            alternativas: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
            resposta_correta: { type: "integer" },
          },
          required: ["pergunta", "alternativas", "resposta_correta"],
        },
        script_ideal: { type: "string", description: "Resposta ideal do operador. DEVE respeitar a etapa da negociação." },
        erro_comum: { type: "string" },
        criterios_avaliacao: { type: "array", items: { type: "string" }, maxItems: 5 },
        simulacao_etapas: {
          type: "array",
          items: {
            type: "object",
            properties: {
              etapa: { type: "integer" },
              fala_cliente: { type: "string" },
              tipo: { type: "string", enum: ["abertura", "objecao", "resistencia", "decisao"] },
              resposta_ideal: { type: "string" },
              dica: { type: "string" },
            },
            required: ["etapa", "fala_cliente", "tipo", "resposta_ideal", "dica"],
          },
          minItems: 3, maxItems: 4,
        },
        quiz: {
          type: "array",
          items: {
            type: "object",
            properties: {
              pergunta: { type: "string" },
              tipo: { type: "string", enum: ["aberta", "multipla_escolha"] },
              alternativas: { type: "array", items: { type: "string" } },
              resposta_correta: { type: "string" },
              explicacao: { type: "string" },
            },
            required: ["pergunta", "tipo", "resposta_correta", "explicacao"],
          },
          minItems: 2, maxItems: 2,
        },
      },
      required: [
        "nivel_dificuldade", "cenario", "objetivo_operador", "script_ideal",
        "erro_comum", "criterios_avaliacao", "simulacao_etapas", "quiz",
        "pergunta_interpretacao", "pergunta_decisao",
      ],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let logStatus = "success";
  let logError: string | null = null;
  let tokensPrompt = 0;
  let tokensResposta = 0;

  try {
    const body: TrainingRequest = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const aidaSummary = [
      body.aida_atencao ? `Atenção: ${JSON.stringify(body.aida_atencao)}` : null,
      body.aida_interesse ? `Interesse: ${JSON.stringify(body.aida_interesse)}` : null,
      body.aida_desejo ? `Desejo: ${JSON.stringify(body.aida_desejo)}` : null,
      body.aida_acao ? `Ação: ${JSON.stringify(body.aida_acao)}` : null,
    ].filter(Boolean).join("\n");

    const objectionType = classifyObjection(body.objecao);

    const userPrompt = `Dados da análise:
- Erro principal: ${body.erro_principal || "Não identificado"}
- Objeção do cliente: ${body.objecao || "Não identificada"}
- Tipo de objeção identificado: ${objectionType}
- Resumo da negociação: ${body.resumo || "Sem resumo"}
- Operador: ${body.operador || "Não informado"}
- Carteira: ${body.carteira || "Não informada"}
- AIDA:
${aidaSummary}

ATENÇÃO: ${objectionType === "titularidade_responsabilidade"
  ? "A objeção envolve TITULARIDADE ou RESPONSABILIDADE FINANCEIRA. A resposta ideal (script_ideal) DEVE focar em acolhimento, investigação e esclarecimento antes de qualquer proposta comercial."
  : objectionType === "legitimidade"
  ? "A objeção envolve LEGITIMIDADE DA COBRANÇA. A resposta ideal DEVE primeiro validar e esclarecer a situação antes de propor negociação."
  : "Gere a resposta ideal adequada à etapa da negociação."}

Gere um treino interativo com a estrutura JSON especificada na tool.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        tools: [TOOL_DEFINITION],
        tool_choice: { type: "function", function: { name: "generate_training" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[gerar-treino] OpenAI error ${response.status}:`, errText);
      logStatus = "error";
      logError = `OpenAI ${response.status}: ${errText.substring(0, 200)}`;
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const aiResult = await response.json();
    const usage = aiResult.usage || {};
    tokensPrompt = usage.prompt_tokens || 0;
    tokensResposta = usage.completion_tokens || 0;

    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    let training;
    if (toolCall?.function?.arguments) {
      training = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      const content = aiResult.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        training = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Resposta da IA não contém treino estruturado");
      }
    }

    // Log AI usage
    try {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const cost = estimateCost(MODEL, tokensPrompt, tokensResposta);
      await supabaseAdmin.from("ai_usage_logs").insert({
        empresa_id: body.empresa_id || null,
        user_id: body.user_id || null,
        analysis_id: body.analysis_id || null,
        action_type: "training_generation",
        provider: PROVIDER,
        model: MODEL,
        input_tokens: tokensPrompt,
        output_tokens: tokensResposta,
        estimated_cost_usd: cost,
        status: logStatus,
        error_message: logError,
        metadata: { operador: body.operador, carteira: body.carteira, objection_type: objectionType },
      });
    } catch (logErr) {
      console.error("[gerar-treino] Failed to log AI usage:", logErr);
    }

    return new Response(JSON.stringify({ training }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("gerar-treino error:", err);

    // Log error
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      await supabaseAdmin.from("ai_usage_logs").insert({
        action_type: "training_generation",
        provider: PROVIDER,
        model: MODEL,
        input_tokens: tokensPrompt,
        output_tokens: tokensResposta,
        estimated_cost_usd: 0,
        status: "error",
        error_message: err instanceof Error ? err.message : String(err),
      });
    } catch (_) { /* ignore */ }

    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
