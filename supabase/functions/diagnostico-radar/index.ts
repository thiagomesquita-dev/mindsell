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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const { metricas_atual, metricas_anterior } = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada");

    const prompt = `Você é um analista de qualidade de operações de cobrança.

Analise a comparação entre dois períodos de negociações e gere um diagnóstico curto (máximo 4 frases).

Métricas do período atual:
${JSON.stringify(metricas_atual, null, 2)}

Métricas do período anterior:
${JSON.stringify(metricas_anterior, null, 2)}

Responda em português brasileiro. Explique:
- Quais métricas melhoraram
- Quais pioraram
- Possíveis causas para as variações

Responda APENAS com o texto do diagnóstico, sem títulos ou formatação markdown.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "Você é um analista de qualidade de operações de cobrança brasileiro. Seja direto e objetivo." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("OpenAI error:", response.status, t);
      throw new Error("Erro na API de IA");
    }

    const result = await response.json();
    const usage = result.usage || {};
    const tokensPrompt = usage.prompt_tokens || 0;
    const tokensResposta = usage.completion_tokens || 0;
    const diagnostico = result.choices?.[0]?.message?.content || "Não foi possível gerar o diagnóstico.";

    // Log AI usage
    try {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: profile } = await supabaseAdmin.from("profiles").select("empresa_id").eq("id", userId).single();
      const cost = estimateCost(tokensPrompt, tokensResposta);
      await supabaseAdmin.from("ai_usage_logs").insert({
        empresa_id: profile?.empresa_id || null,
        user_id: userId,
        action_type: "radar_diagnosis",
        provider: PROVIDER,
        model: MODEL,
        input_tokens: tokensPrompt,
        output_tokens: tokensResposta,
        estimated_cost_usd: cost,
        status: "success",
      });
    } catch (logErr) {
      console.error("[diagnostico-radar] Failed to log AI usage:", logErr);
    }

    return new Response(JSON.stringify({ diagnostico }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("diagnostico-radar error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
