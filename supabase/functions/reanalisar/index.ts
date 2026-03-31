import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FOUNDER_EMAIL = "thiago@thiagoanalytics.com.br";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate user via getClaims (faster, no network round-trip)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("[reanalisar] Auth failed:", claimsError?.message);
      return new Response(JSON.stringify({ error: "Sessão expirada. Faça login novamente." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = claimsData.claims.email as string;
    const userId = claimsData.claims.sub as string;

    // FOUNDER-ONLY CHECK
    if (userEmail !== FOUNDER_EMAIL) {
      return new Response(JSON.stringify({ error: "Acesso não autorizado para reanálise avançada" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { analysis_id, provider } = await req.json();
    if (!analysis_id || !provider) {
      return new Response(JSON.stringify({ error: "analysis_id e provider são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch original analysis
    const { data: original, error: fetchError } = await supabaseAdmin
      .from("analyses")
      .select("*")
      .eq("id", analysis_id)
      .single();

    if (fetchError || !original) {
      return new Response(JSON.stringify({ error: "Análise não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Re-run analysis using the existing edge function
    console.log(`[reanalisar] Re-analyzing ${analysis_id} with provider: ${provider}`);

    const reanalysisResp = await fetch(`${supabaseUrl}/functions/v1/analisar-negociacao`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        operador: original.operador,
        carteira: original.carteira,
        canal: original.canal,
        transcricao: original.transcricao,
        audio_urls: original.audio_urls,
        duracao_audio_total: original.duracao_audio_total,
        provider,
      }),
    });

    if (!reanalysisResp.ok) {
      const errText = await reanalysisResp.text();
      console.error("[reanalisar] Error from analisar-negociacao:", errText);
      return new Response(errText, {
        status: reanalysisResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newResult = await reanalysisResp.json();

    // Determine model from provider
    const providerModelMap: Record<string, string> = {
      openai: Deno.env.get("OPENAI_MODEL") || "gpt-4.1",
      gemini: Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash",
      claude: "claude-sonnet-4-20250514",
      opus: "claude-opus-4-6",
    };
    const model = providerModelMap[provider] || provider;

    // Log reanalysis in tracking table
    await supabaseAdmin.from("analysis_reanalyses").insert({
      analysis_id,
      user_id: userId,
      provider,
      model,
      mode: "new_version",
      tokens_prompt: newResult.tokens_prompt || null,
      tokens_resposta: newResult.tokens_resposta || null,
      custo_estimado: newResult.custo_estimado || null,
      tempo_resposta: newResult.tempo_resposta || null,
    });

    console.log(`[reanalisar] New analysis created: ${newResult.id}`);

    return new Response(JSON.stringify({
      success: true,
      new_analysis_id: newResult.id,
      provider,
      model,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: unknown) {
    console.error("[reanalisar] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
