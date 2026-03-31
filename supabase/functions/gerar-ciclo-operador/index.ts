import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

// ─── Types ───

interface CyclePayload {
  operador: string;
}

interface CycleComparison {
  score_anterior: number | null;
  score_atual: number | null;
  chance_pagamento_anterior: number | null;
  chance_pagamento_atual: number | null;
  risco_quebra_anterior: number | null;
  risco_quebra_atual: number | null;
  erros_anteriores: string[];
  erros_atuais: string[];
  comentario: string;
}

interface CycleAIResult {
  score_medio: number;
  chance_media_pagamento: number;
  risco_medio_quebra: number;
  principais_objecoes: string[];
  principais_erros: string[];
  padrao_tom: string;
  avaliacao_geral: string;
  pontos_fortes_recorrentes: string[];
  pontos_de_melhoria: string[];
  plano_desenvolvimento: string;
  avaliacao_evolucao?: "MELHOROU" | "MANTEVE_PADRAO" | "PIOROU";
  comparacao?: CycleComparison;
}

interface AnalysisSummary {
  id: string;
  score: number | null;
  chance_pagamento: number | null;
  risco_quebra: number | null;
  categoria_objecao: string | null;
  categoria_erro: string | null;
  tom_operador: string | null;
  pontos_fortes: string[] | null;
  pontos_melhorar: string[] | null;
  erro_principal: string | null;
  objecao: string | null;
  resumo: string | null;
}

interface ClosedCycleRow {
  analysis_ids: string[];
}

interface PreviousCycleRow {
  ciclo_numero: number;
  score_medio: number | null;
  chance_media_pagamento: number | null;
  risco_medio_quebra: number | null;
  principais_erros: string[] | null;
  principais_objecoes: string[] | null;
  avaliacao_geral: string | null;
}

interface OpenCycleRow {
  id: string;
  analysis_ids: string[] | null;
}

// ─── Constants ───

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CYCLE_SIZE = 10;

const CYCLE_PROMPT = `Você é um supervisor sênior de operação de cobrança. Analise o conjunto de negociações abaixo de um mesmo operador e gere um relatório consolidado de performance.

Retorne um JSON com os seguintes campos OBRIGATÓRIOS:

- score_medio: número 0-100 (média calculada dos scores)
- chance_media_pagamento: número 0-100 (média)
- risco_medio_quebra: número 0-100 (média)
- principais_objecoes: array de strings (máx 5 objeções mais frequentes, frases curtas)
- principais_erros: array de strings (máx 5 erros mais frequentes, frases curtas)
- padrao_tom: string (tom predominante do operador ao longo das negociações)
- avaliacao_geral: string (máx 5 linhas, avaliação geral da performance do operador no ciclo)
- pontos_fortes_recorrentes: array de strings (máx 5 pontos fortes que se repetem)
- pontos_de_melhoria: array de strings (máx 5 pontos de melhoria recorrentes)
- plano_desenvolvimento: string (máx 5 linhas, plano de desenvolvimento prático para o supervisor aplicar)

Se houver dados de um ciclo anterior, gere também:
- avaliacao_evolucao: "MELHOROU", "MANTEVE_PADRAO" ou "PIOROU"
- comparacao: objeto com { score_anterior, score_atual, chance_pagamento_anterior, chance_pagamento_atual, risco_quebra_anterior, risco_quebra_atual, erros_anteriores (array), erros_atuais (array), comentario (string máx 3 linhas) }

Seja direto, prático e objetivo. Foque em ações concretas de melhoria.`;

const REQUIRED_CYCLE_FIELDS: (keyof Pick<CycleAIResult,
  "score_medio" | "chance_media_pagamento" | "risco_medio_quebra" |
  "principais_objecoes" | "principais_erros" | "padrao_tom" |
  "avaliacao_geral" | "pontos_fortes_recorrentes" | "pontos_de_melhoria" | "plano_desenvolvimento"
>)[] = [
  "score_medio", "chance_media_pagamento", "risco_medio_quebra",
  "principais_objecoes", "principais_erros", "padrao_tom",
  "avaliacao_geral", "pontos_fortes_recorrentes", "pontos_de_melhoria", "plano_desenvolvimento",
];

// ─── Helpers ───

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function validateCycleResult(data: Record<string, unknown>): CycleAIResult {
  const missing = REQUIRED_CYCLE_FIELDS.filter((f) => data[f] === undefined || data[f] === null);
  if (missing.length > 0) {
    throw new Error(`IA não retornou campos obrigatórios do ciclo: ${missing.join(", ")}`);
  }
  return data as unknown as CycleAIResult;
}

// ─── Main Handler ───

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Variáveis de ambiente do Supabase não configuradas");
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Token de autenticação ausente");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) throw new Error("Usuário não autenticado");

    const payload: CyclePayload = await req.json();
    const { operador } = payload;
    if (!operador) throw new Error("operador é obrigatório");

    // Resolve empresa_id server-side from the authenticated user's profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("empresa_id")
      .eq("id", user.id)
      .single();
    if (!profile?.empresa_id) throw new Error("empresa_id não encontrado para o usuário");
    const empresa_id = profile.empresa_id;

    // Get open cycle
    const { data: openCycle } = await supabaseAdmin
      .from("operator_cycles")
      .select("id, analysis_ids")
      .eq("operador", operador)
      .eq("empresa_id", empresa_id)
      .eq("status", "aberto")
      .maybeSingle() as { data: OpenCycleRow | null };

    // Count all analyses for this operator in this company
    const { data: analyses, error: fetchErr } = await supabaseAdmin
      .from("analyses")
      .select("id, score, chance_pagamento, risco_quebra, categoria_objecao, categoria_erro, tom_operador, pontos_fortes, pontos_melhorar, erro_principal, objecao, resumo")
      .eq("operador", operador)
      .eq("empresa_id", empresa_id)
      .order("created_at", { ascending: true }) as { data: AnalysisSummary[] | null; error: { message: string } | null };

    if (fetchErr) throw new Error("Erro ao buscar análises: " + fetchErr.message);

    // Find analyses already in closed cycles
    const { data: closedCycles } = await supabaseAdmin
      .from("operator_cycles")
      .select("analysis_ids")
      .eq("operador", operador)
      .eq("empresa_id", empresa_id)
      .eq("status", "fechado") as { data: ClosedCycleRow[] | null };

    const closedIds = new Set<string>();
    if (closedCycles) {
      for (const c of closedCycles) {
        if (c.analysis_ids) c.analysis_ids.forEach((id) => closedIds.add(id));
      }
    }

    // Uncycled analyses
    const uncycled = analyses?.filter((a) => !closedIds.has(a.id)) || [];

    if (uncycled.length < CYCLE_SIZE) {
      return new Response(
        JSON.stringify({
          status: "aguardando",
          negociacoes_no_ciclo: uncycled.length,
          faltam: CYCLE_SIZE - uncycled.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Take the first CYCLE_SIZE uncycled analyses
    const cycleAnalyses = uncycled.slice(0, CYCLE_SIZE);
    const cycleIds = cycleAnalyses.map((a) => a.id);

    // Get previous cycle for comparison
    const { data: prevCycle } = await supabaseAdmin
      .from("operator_cycles")
      .select("ciclo_numero, score_medio, chance_media_pagamento, risco_medio_quebra, principais_erros, principais_objecoes, avaliacao_geral")
      .eq("operador", operador)
      .eq("empresa_id", empresa_id)
      .eq("status", "fechado")
      .order("ciclo_numero", { ascending: false })
      .limit(1)
      .maybeSingle() as { data: PreviousCycleRow | null };

    // Build prompt with analyses data
    const analysesText = cycleAnalyses
      .map(
        (a, i) =>
          `Negociação ${i + 1}:
- Score: ${a.score}
- Chance pagamento: ${a.chance_pagamento}
- Risco quebra: ${a.risco_quebra}
- Objeção: ${a.objecao}
- Categoria objeção: ${a.categoria_objecao}
- Erro principal: ${a.erro_principal}
- Categoria erro: ${a.categoria_erro}
- Tom: ${a.tom_operador}
- Pontos fortes: ${(a.pontos_fortes || []).join(", ")}
- Pontos a melhorar: ${(a.pontos_melhorar || []).join(", ")}
- Resumo: ${a.resumo}`
      )
      .join("\n\n");

    let previousContext = "";
    if (prevCycle) {
      previousContext = `\n\nDADOS DO CICLO ANTERIOR (ciclo ${prevCycle.ciclo_numero}):
- Score médio: ${prevCycle.score_medio}
- Chance média pagamento: ${prevCycle.chance_media_pagamento}
- Risco médio quebra: ${prevCycle.risco_medio_quebra}
- Principais erros: ${(prevCycle.principais_erros || []).join(", ")}
- Principais objeções: ${(prevCycle.principais_objecoes || []).join(", ")}
- Avaliação geral: ${prevCycle.avaliacao_geral}

Gere a comparação entre o ciclo atual e o anterior, incluindo avaliacao_evolucao e comparacao.`;
    }

    const userPrompt = `Operador: ${operador}
Número de negociações: ${CYCLE_SIZE}

${analysesText}
${previousContext}`;

    // Call AI
    const aiProvider = (Deno.env.get("AI_PROVIDER") || "openai").toLowerCase();
    let aiApiKey: string;
    let model: string;

    if (aiProvider === "gemini") {
      aiApiKey = Deno.env.get("GEMINI_API_KEY") || "";
      model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
    } else {
      aiApiKey = Deno.env.get("OPENAI_API_KEY") || "";
      model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
    }

    if (!aiApiKey) throw new Error("API key não configurada");

    let result: CycleAIResult;

    if (aiProvider === "gemini") {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: CYCLE_PROMPT + "\n\n" + userPrompt }] },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.3,
            },
          }),
        }
      );
      if (!resp.ok) throw new Error(`Gemini error: ${resp.status}`);
      const data = await resp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsed: Record<string, unknown> = JSON.parse(text);
      result = validateCycleResult(parsed);
    } else {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: CYCLE_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      });
      if (!resp.ok) throw new Error(`OpenAI error: ${resp.status}`);
      const data = await resp.json();
      const parsed: Record<string, unknown> = JSON.parse(data.choices[0].message.content);
      result = validateCycleResult(parsed);
    }

    // Determine cycle number
    const cicloNumero = prevCycle ? prevCycle.ciclo_numero + 1 : 1;

    // Close open cycle if exists
    if (openCycle) {
      await supabaseAdmin
        .from("operator_cycles")
        .delete()
        .eq("id", openCycle.id);
    }

    // Insert closed cycle
    const { data: newCycle, error: insertErr } = await supabaseAdmin
      .from("operator_cycles")
      .insert({
        empresa_id,
        operador,
        ciclo_numero: cicloNumero,
        data_inicio: new Date().toISOString(),
        data_fim: new Date().toISOString(),
        numero_negociacoes: CYCLE_SIZE,
        score_medio: result.score_medio,
        chance_media_pagamento: result.chance_media_pagamento,
        risco_medio_quebra: result.risco_medio_quebra,
        principais_erros: result.principais_erros || [],
        principais_objecoes: result.principais_objecoes || [],
        padrao_tom: result.padrao_tom,
        avaliacao_geral: result.avaliacao_geral,
        pontos_fortes_recorrentes: result.pontos_fortes_recorrentes || [],
        pontos_de_melhoria: result.pontos_de_melhoria || [],
        plano_desenvolvimento: result.plano_desenvolvimento,
        comparacao_com_ciclo_anterior: result.comparacao || null,
        avaliacao_evolucao: result.avaliacao_evolucao || null,
        analysis_ids: cycleIds,
        status: "fechado",
      })
      .select("id")
      .single();

    if (insertErr) throw new Error("Erro ao salvar ciclo: " + insertErr.message);

    console.log(`[gerar-ciclo] Ciclo ${cicloNumero} fechado para operador ${operador}`);

    return new Response(
      JSON.stringify({
        status: "ciclo_fechado",
        ciclo_id: newCycle?.id,
        ciclo_numero: cicloNumero,
        ...result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    console.error("[gerar-ciclo] Error:", e);
    return new Response(
      JSON.stringify({ error: getErrorMessage(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
