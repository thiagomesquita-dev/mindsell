import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "gpt-4.1-mini";
const PROVIDER = "openai";

function estimateCost(promptTokens: number, completionTokens: number): number {
  return Math.round(((promptTokens / 1_000_000) * 0.4 + (completionTokens / 1_000_000) * 1.6) * 10000) / 10000;
}

const SYSTEM_PROMPT = `Você é um supervisor sênior de cobrança. Gere um treino consolidado baseado em múltiplas análises do mesmo operador.
Responda APENAS com JSON válido, sem explicações. Seja extremamente conciso.
Limite cada campo de texto a no máximo 2 frases.
O treino deve focar nos PADRÕES recorrentes identificados nas análises.`;

const TOOL_DEFINITION = {
  type: "function",
  function: {
    name: "generate_training",
    description: "Generate a consolidated training exercise based on patterns",
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
        script_ideal: { type: "string" },
        erro_comum: { type: "string" },
        padrao_erros: { type: "string" },
        padrao_objecoes: { type: "string" },
        licao_central: { type: "string" },
        prioridade_correcao: { type: "string" },
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
        "padrao_erros", "padrao_objecoes", "licao_central", "prioridade_correcao",
      ],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let tokensPrompt = 0;
  let tokensResposta = 0;

  try {
    const { operador, empresa_id, supervisor_id, supervisor_nome, carteira, tipo } = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get latest analyses
    const { data: analyses, error: fetchErr } = await supabase
      .from("analyses")
      .select("id, erro_principal, objecao, resumo, aida_atencao, aida_interesse, aida_desejo, aida_acao, score, carteira")
      .eq("operador", operador)
      .eq("empresa_id", empresa_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (fetchErr) throw fetchErr;
    if (!analyses || analyses.length < 3) {
      return new Response(JSON.stringify({ skipped: true, reason: "Menos de 3 análises disponíveis" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check already used analyses
    const { data: existingTrainings } = await supabase
      .from("training_sessions")
      .select("auto_analysis_ids")
      .eq("operador", operador)
      .eq("empresa_id", empresa_id)
      .eq("origem", "automatico");

    const usedIds = new Set<string>();
    for (const t of existingTrainings || []) {
      if (Array.isArray(t.auto_analysis_ids)) {
        for (const aid of t.auto_analysis_ids) usedIds.add(aid as string);
      }
    }

    const available = analyses.filter((a) => !usedIds.has(a.id));
    if (available.length < 3) {
      return new Response(JSON.stringify({ skipped: true, reason: "Não há 3 análises novas para treino automático" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const batch = available.slice(0, 3);
    const batchIds = batch.map((a) => a.id);

    const analysesSummary = batch.map((a, i) => `
Análise ${i + 1}:
- Erro: ${a.erro_principal || "N/A"}
- Objeção: ${a.objecao || "N/A"}
- Resumo: ${a.resumo || "N/A"}
- Score: ${a.score || "N/A"}
`).join("\n");

    const userPrompt = `Operador: ${operador}
Carteira: ${carteira || batch[0]?.carteira || "N/A"}

Resumo de 3 análises recentes:
${analysesSummary}

Com base nesses padrões, gere um treino consolidado usando a tool.`;

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
      console.error("OpenAI error:", response.status, errText);
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

    // Dedup check
    const sortedIds = [...batchIds].sort();
    const autoHash = sortedIds.join("|");

    const { data: existing } = await supabase
      .from("training_sessions")
      .select("id")
      .eq("auto_analysis_hash", autoHash)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "Treino automático já gerado para essas análises" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: sessionData, error: insertErr } = await supabase
      .from("training_sessions")
      .insert({
        analysis_id: batchIds[0],
        empresa_id,
        operador,
        supervisor_id,
        supervisor_nome: supervisor_nome || "Sistema",
        carteira: carteira || batch[0]?.carteira || "",
        training_content: training,
        origem: tipo === "completo" ? "completo" : "pontual",
        auto_analysis_ids: batchIds,
        auto_analysis_hash: autoHash,
      })
      .select("token, id")
      .single();

    if (insertErr) throw insertErr;

    // Log AI usage
    try {
      const cost = estimateCost(tokensPrompt, tokensResposta);
      await supabase.from("ai_usage_logs").insert({
        empresa_id,
        user_id: supervisor_id || null,
        training_id: sessionData.id,
        action_type: "training_generation",
        provider: PROVIDER,
        model: MODEL,
        input_tokens: tokensPrompt,
        output_tokens: tokensResposta,
        estimated_cost_usd: cost,
        status: "success",
        metadata: { operador, carteira, origem: tipo === "completo" ? "completo" : "pontual", batch_size: batchIds.length },
      });
    } catch (logErr) {
      console.error("[gerar-treino-automatico] Failed to log AI usage:", logErr);
    }

    const link = `https://app.cobramind.ia.br/treino/${sessionData.token}`;

    return new Response(JSON.stringify({ success: true, token: sessionData.token, link, training }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("gerar-treino-automatico error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
