import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

// ─── Types ───

interface WeeklyPayload {
  operador?: string;
  /** If provided, generate report for this specific week start (ISO string, Monday 00:00) */
  semana_inicio?: string;
}

interface WeekComparison {
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

interface WeeklyAIResult {
  score_medio: number;
  chance_pagamento_media: number;
  risco_quebra_medio: number;
  principais_objecoes: string[];
  principais_erros: string[];
  padrao_tom: string;
  avaliacao_geral: string;
  pontos_fortes_recorrentes: string[];
  pontos_de_melhoria: string[];
  plano_desenvolvimento: string;
  classificacao_evolucao?: "MELHOROU" | "MANTEVE_PADRAO" | "PIOROU";
  comparacao?: WeekComparison;
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

interface PreviousWeekRow {
  semana_numero: number;
  score_medio: number | null;
  chance_pagamento_media: number | null;
  risco_quebra_medio: number | null;
  principais_erros: string[] | null;
  principais_objecoes: string[] | null;
  avaliacao_geral: string | null;
}

// ─── Constants ───

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIN_ANALYSES = 3;

const WEEKLY_PROMPT = `Você é um supervisor sênior de operação de cobrança. Analise o conjunto de negociações da semana abaixo de um mesmo operador e gere um relatório consolidado semanal de performance.

Retorne um JSON com os seguintes campos OBRIGATÓRIOS:

- score_medio: número 0-100 (média calculada dos scores)
- chance_pagamento_media: número 0-100 (média)
- risco_quebra_medio: número 0-100 (média)
- principais_objecoes: array de strings (máx 5 objeções mais frequentes, frases curtas)
- principais_erros: array de strings (máx 5 erros mais frequentes, frases curtas)
- padrao_tom: string (tom predominante do operador ao longo das negociações da semana)
- avaliacao_geral: string (máx 5 linhas, avaliação geral da performance do operador na semana)
- pontos_fortes_recorrentes: array de strings (máx 5 pontos fortes que se repetem)
- pontos_de_melhoria: array de strings (máx 5 pontos de melhoria recorrentes)
- plano_desenvolvimento: string (máx 5 linhas, plano de desenvolvimento prático para o supervisor aplicar)

Se houver dados da semana anterior, gere também:
- classificacao_evolucao: "MELHOROU", "MANTEVE_PADRAO" ou "PIOROU"
- comparacao: objeto com { score_anterior, score_atual, chance_pagamento_anterior, chance_pagamento_atual, risco_quebra_anterior, risco_quebra_atual, erros_anteriores (array), erros_atuais (array), comentario (string máx 3 linhas) }

Seja direto, prático e objetivo. Foque em ações concretas de melhoria.`;

const REQUIRED_FIELDS: (keyof Pick<WeeklyAIResult,
  "score_medio" | "chance_pagamento_media" | "risco_quebra_medio" |
  "principais_objecoes" | "principais_erros" | "padrao_tom" |
  "avaliacao_geral" | "pontos_fortes_recorrentes" | "pontos_de_melhoria" | "plano_desenvolvimento"
>)[] = [
  "score_medio", "chance_pagamento_media", "risco_quebra_medio",
  "principais_objecoes", "principais_erros", "padrao_tom",
  "avaliacao_geral", "pontos_fortes_recorrentes", "pontos_de_melhoria", "plano_desenvolvimento",
];

// ─── Helpers ───

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function validateWeeklyResult(data: Record<string, unknown>): WeeklyAIResult {
  const missing = REQUIRED_FIELDS.filter((f) => data[f] === undefined || data[f] === null);
  if (missing.length > 0) {
    throw new Error(`IA não retornou campos obrigatórios: ${missing.join(", ")}`);
  }
  return data as unknown as WeeklyAIResult;
}

/** Get Monday 00:00 UTC of the previous week */
function getPreviousWeekMonday(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon...
  const diffToMonday = day === 0 ? 6 : day - 1;
  const thisMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday));
  const prevMonday = new Date(thisMonday);
  prevMonday.setUTCDate(prevMonday.getUTCDate() - 7);
  return prevMonday;
}

function getWeekSunday(monday: Date): Date {
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return sunday;
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

    const payload: WeeklyPayload = await req.json();

    // Determine week window
    const weekMonday = payload.semana_inicio
      ? new Date(payload.semana_inicio)
      : getPreviousWeekMonday();
    const weekSunday = getWeekSunday(weekMonday);

    const weekStartISO = weekMonday.toISOString();
    const weekEndISO = weekSunday.toISOString();

    // Resolve empresa_id server-side from the authenticated user's profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("empresa_id")
      .eq("id", user.id)
      .single();
    const empresaId = profile?.empresa_id;
    if (!empresaId) throw new Error("empresa_id não encontrado");

    // Get all analyses in the week window for the company
    const { data: allAnalyses, error: fetchErr } = await supabaseAdmin
      .from("analyses")
      .select("id, operador, score, chance_pagamento, risco_quebra, categoria_objecao, categoria_erro, tom_operador, pontos_fortes, pontos_melhorar, erro_principal, objecao, resumo")
      .eq("empresa_id", empresaId)
      .gte("created_at", weekStartISO)
      .lte("created_at", weekEndISO)
      .order("created_at", { ascending: true });

    if (fetchErr) throw new Error("Erro ao buscar análises: " + fetchErr.message);
    if (!allAnalyses || allAnalyses.length === 0) {
      return new Response(
        JSON.stringify({ status: "sem_analises", mensagem: "Nenhuma análise encontrada no período" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by operator
    const operatorFilter = payload.operador;
    const byOperator = new Map<string, AnalysisSummary[]>();
    for (const a of allAnalyses) {
      if (operatorFilter && a.operador !== operatorFilter) continue;
      const list = byOperator.get(a.operador) || [];
      list.push(a as AnalysisSummary);
      byOperator.set(a.operador, list);
    }

    // AI config
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
    if (!aiApiKey) throw new Error("API key da IA não configurada");

    const results: Array<{ operador: string; status: string; semana_numero?: number }> = [];

    for (const [operador, analyses] of byOperator) {
      // Skip if fewer than MIN_ANALYSES
      if (analyses.length < MIN_ANALYSES) {
        results.push({ operador, status: "insuficiente" });
        continue;
      }

      // Check if report already exists for this week
      const { data: existing } = await supabaseAdmin
        .from("weekly_reports")
        .select("id")
        .eq("operador", operador)
        .eq("empresa_id", empresaId)
        .eq("data_inicio_semana", weekStartISO)
        .maybeSingle();

      if (existing) {
        results.push({ operador, status: "ja_existe" });
        continue;
      }

      // Get previous week report for comparison
      const { data: prevReport } = await supabaseAdmin
        .from("weekly_reports")
        .select("semana_numero, score_medio, chance_pagamento_media, risco_quebra_medio, principais_erros, principais_objecoes, avaliacao_geral")
        .eq("operador", operador)
        .eq("empresa_id", empresaId)
        .order("data_inicio_semana", { ascending: false })
        .limit(1)
        .maybeSingle() as { data: PreviousWeekRow | null };

      // Build prompt
      const analysesText = analyses
        .map(
          (a, i) =>
            `Negociação ${i + 1}:\n- Score: ${a.score}\n- Chance pagamento: ${a.chance_pagamento}\n- Risco quebra: ${a.risco_quebra}\n- Objeção: ${a.objecao}\n- Categoria objeção: ${a.categoria_objecao}\n- Erro principal: ${a.erro_principal}\n- Categoria erro: ${a.categoria_erro}\n- Tom: ${a.tom_operador}\n- Pontos fortes: ${(a.pontos_fortes || []).join(", ")}\n- Pontos a melhorar: ${(a.pontos_melhorar || []).join(", ")}\n- Resumo: ${a.resumo}`
        )
        .join("\n\n");

      let previousContext = "";
      if (prevReport) {
        previousContext = `\n\nDADOS DA SEMANA ANTERIOR:\n- Score médio: ${prevReport.score_medio}\n- Chance média pagamento: ${prevReport.chance_pagamento_media}\n- Risco médio quebra: ${prevReport.risco_quebra_medio}\n- Principais erros: ${(prevReport.principais_erros || []).join(", ")}\n- Principais objeções: ${(prevReport.principais_objecoes || []).join(", ")}\n- Avaliação geral: ${prevReport.avaliacao_geral}\n\nGere a comparação entre a semana atual e a anterior, incluindo classificacao_evolucao e comparacao.`;
      }

      const userPrompt = `Operador: ${operador}\nPeríodo: ${weekMonday.toLocaleDateString("pt-BR")} a ${weekSunday.toLocaleDateString("pt-BR")}\nNúmero de negociações: ${analyses.length}\n\n${analysesText}\n${previousContext}`;

      // Call AI
      let result: WeeklyAIResult;

      if (aiProvider === "gemini") {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                { role: "user", parts: [{ text: WEEKLY_PROMPT + "\n\n" + userPrompt }] },
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
        result = validateWeeklyResult(parsed);
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
              { role: "system", content: WEEKLY_PROMPT },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
            response_format: { type: "json_object" },
          }),
        });
        if (!resp.ok) throw new Error(`OpenAI error: ${resp.status}`);
        const data = await resp.json();
        const parsed: Record<string, unknown> = JSON.parse(data.choices[0].message.content);
        result = validateWeeklyResult(parsed);
      }

      const semanaNumero = prevReport ? prevReport.semana_numero + 1 : 1;
      const cycleIds = analyses.map((a) => a.id);

      const { error: insertErr } = await supabaseAdmin
        .from("weekly_reports")
        .insert({
          empresa_id: empresaId,
          operador,
          semana_numero: semanaNumero,
          data_inicio_semana: weekStartISO,
          data_fim_semana: weekEndISO,
          numero_negociacoes: analyses.length,
          score_medio: result.score_medio,
          chance_pagamento_media: result.chance_pagamento_media,
          risco_quebra_medio: result.risco_quebra_medio,
          principais_erros: result.principais_erros || [],
          principais_objecoes: result.principais_objecoes || [],
          padrao_tom: result.padrao_tom,
          pontos_fortes_recorrentes: result.pontos_fortes_recorrentes || [],
          pontos_de_melhoria: result.pontos_de_melhoria || [],
          avaliacao_geral: result.avaliacao_geral,
          plano_desenvolvimento: result.plano_desenvolvimento,
          comparacao_com_semana_anterior: result.comparacao || null,
          classificacao_evolucao: result.classificacao_evolucao || null,
          analysis_ids: cycleIds,
          status: "fechado",
        });

      if (insertErr) throw new Error(`Erro ao salvar relatório semanal de ${operador}: ${insertErr.message}`);

      console.log(`[relatorio-semanal] Semana ${semanaNumero} gerada para operador ${operador}`);
      results.push({ operador, status: "gerado", semana_numero: semanaNumero });
    }

    return new Response(
      JSON.stringify({ status: "concluido", resultados: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    console.error("[relatorio-semanal] Error:", e);
    return new Response(
      JSON.stringify({ error: getErrorMessage(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
