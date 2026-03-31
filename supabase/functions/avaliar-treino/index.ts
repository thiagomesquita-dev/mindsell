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

const SYSTEM_PROMPT = `Você é um especialista em treinamento de negociação de cobrança.
Analise a resposta, reflexão e acertos nas perguntas de múltipla escolha do operador.
Seja objetivo, direto e conciso. Frases curtas. Nada fora do JSON.

REGRAS PARA AIDA:
- Cada etapa AIDA (atencao, interesse, desejo, acao) deve ter nota de 0 a 10 E uma justificativa curta (1 frase, máx 15 palavras).
- A justificativa deve ser específica ao cenário e à resposta do operador. Proibido frases genéricas como "precisa melhorar".
- Exemplos bons: "Abertura correta, mas faltou acolher a frustração da cliente.", "Pediu dados demais sem explicar o motivo."

REGRA PARA resumo_nota:
- Gere uma frase-resumo curta (máx 20 palavras) explicando a razão principal da nota final.
- Deve deixar claro se a decisão estava certa mas a execução falhou, ou vice-versa.
- Exemplo: "A decisão foi correta, mas a execução da resposta teve excesso de dados, pouco acolhimento e baixa agilidade."
- Deve ser coerente com o feedback, erro principal e notas AIDA.`;

const EVAL_TOOL = {
  type: "function",
  function: {
    name: "evaluate_training",
    description: "Evaluate operator training response",
    parameters: {
      type: "object",
      properties: {
        aida: {
          type: "object",
          properties: {
            atencao: { type: "number" }, atencao_justificativa: { type: "string", description: "Justificativa curta (1 frase, máx 15 palavras) para a nota de Atenção" },
            interesse: { type: "number" }, interesse_justificativa: { type: "string", description: "Justificativa curta (1 frase, máx 15 palavras) para a nota de Interesse" },
            desejo: { type: "number" }, desejo_justificativa: { type: "string", description: "Justificativa curta (1 frase, máx 15 palavras) para a nota de Desejo" },
            acao: { type: "number" }, acao_justificativa: { type: "string", description: "Justificativa curta (1 frase, máx 15 palavras) para a nota de Ação" },
          },
          required: ["atencao", "atencao_justificativa", "interesse", "interesse_justificativa", "desejo", "desejo_justificativa", "acao", "acao_justificativa"],
        },
        resumo_nota: { type: "string", description: "Frase-resumo curta (máx 20 palavras) explicando a razão principal da nota final" },
        nota_final: { type: "number" },
        qualidade_resposta: { type: "string", enum: ["baixa", "media", "alta"] },
        entendimento: { type: "string", enum: ["baixo", "medio", "alto"] },
        coerencia: { type: "string", enum: ["baixa", "media", "alta"] },
        nivel_aprendizado: { type: "string", enum: ["baixo", "medio", "alto"] },
        interpretacao_correta: { type: "string" },
        explicacao_interpretacao: { type: "string" },
        decisao_ideal: { type: "string" },
        explicacao_decisao: { type: "string" },
        diagnostico: { type: "string" },
        ponto_forte: { type: "string" },
        principal_erro: { type: "string" },
        como_corrigir: { type: "string" },
        resposta_recomendada: { type: "string" },
        licao_esperada: { type: "string" },
        feedback: { type: "string" },
      },
      required: [
        "aida", "resumo_nota", "nota_final", "qualidade_resposta", "entendimento",
        "coerencia", "nivel_aprendizado", "diagnostico", "ponto_forte",
        "principal_erro", "como_corrigir", "resposta_recomendada",
        "licao_esperada", "feedback",
        "interpretacao_correta", "explicacao_interpretacao",
        "decisao_ideal", "explicacao_decisao",
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
    const { token, resposta, reflexao, resposta_interpretacao, resposta_decisao } = await req.json();

    if (!token || !resposta || !reflexao) {
      return new Response(
        JSON.stringify({ error: "Token, resposta e reflexão são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: session, error: fetchErr } = await supabase
      .from("training_sessions")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchErr || !session) {
      return new Response(JSON.stringify({ error: "Treino não encontrado." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.status !== "pendente") {
      return new Response(JSON.stringify({ error: "Este treino já foi respondido." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(session.expires_at) < new Date()) {
      await supabase.from("training_sessions").update({ status: "expirado" }).eq("id", session.id);
      return new Response(JSON.stringify({ error: "Este treino expirou." }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = session.training_content as Record<string, unknown>;

    const interpQ = content.pergunta_interpretacao as { pergunta: string; alternativas: string[]; resposta_correta: number } | undefined;
    const decisaoQ = content.pergunta_decisao as { pergunta: string; alternativas: string[]; resposta_correta: number } | undefined;

    const acerto_interpretacao = interpQ != null && resposta_interpretacao != null
      ? String(resposta_interpretacao) === String(interpQ.resposta_correta) : null;
    const acerto_decisao = decisaoQ != null && resposta_decisao != null
      ? String(resposta_decisao) === String(decisaoQ.resposta_correta) : null;

    const mcContext = [];
    if (interpQ && resposta_interpretacao != null) {
      const chosenIdx = Number(resposta_interpretacao);
      mcContext.push(`Interpretação — Pergunta: "${interpQ.pergunta}"`);
      mcContext.push(`Resposta correta: alternativa ${interpQ.resposta_correta} ("${interpQ.alternativas[interpQ.resposta_correta]}")`);
      mcContext.push(`Operador escolheu: alternativa ${chosenIdx} ("${interpQ.alternativas[chosenIdx]}") → ${acerto_interpretacao ? "ACERTOU" : "ERROU"}`);
    }
    if (decisaoQ && resposta_decisao != null) {
      const chosenIdx = Number(resposta_decisao);
      mcContext.push(`Decisão — Pergunta: "${decisaoQ.pergunta}"`);
      mcContext.push(`Resposta correta: alternativa ${decisaoQ.resposta_correta} ("${decisaoQ.alternativas[decisaoQ.resposta_correta]}")`);
      mcContext.push(`Operador escolheu: alternativa ${chosenIdx} ("${decisaoQ.alternativas[chosenIdx]}") → ${acerto_decisao ? "ACERTOU" : "ERROU"}`);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const userPrompt = `Cenário: ${JSON.stringify(content.cenario || {})}
Script ideal: ${content.script_ideal || ""}
Erro comum: ${content.erro_comum || ""}

PERGUNTAS MÚLTIPLA ESCOLHA:
${mcContext.join("\n")}

RESPOSTA DO OPERADOR:
"${resposta}"

REFLEXÃO DO OPERADOR:
"${reflexao}"

Avalie usando a tool fornecida.`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
        temperature: 0.2,
        max_tokens: 1500,
        tools: [EVAL_TOOL],
        tool_choice: { type: "function", function: { name: "evaluate_training" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("OpenAI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`OpenAI error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const usage = aiResult.usage || {};
    tokensPrompt = usage.prompt_tokens || 0;
    tokensResposta = usage.completion_tokens || 0;

    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    let evaluation: Record<string, unknown>;
    if (toolCall?.function?.arguments) {
      evaluation = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      const content2 = aiResult.choices?.[0]?.message?.content || "";
      const jsonMatch = content2.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("AI did not return structured evaluation");
      }
    }

    evaluation.acerto_interpretacao = acerto_interpretacao;
    evaluation.acerto_decisao = acerto_decisao;
    evaluation.resposta_operador = resposta;
    evaluation.reflexao_operador = reflexao;

    const { error: updateErr } = await supabase
      .from("training_sessions")
      .update({
        resposta_operador: resposta,
        reflexao_operador: reflexao,
        resposta_interpretacao: resposta_interpretacao != null ? String(resposta_interpretacao) : null,
        resposta_decisao: resposta_decisao != null ? String(resposta_decisao) : null,
        acerto_interpretacao,
        acerto_decisao,
        nivel_aprendizado: evaluation.nivel_aprendizado as string,
        avaliacao_ia: evaluation,
        nota_final: evaluation.nota_final as number,
        qualidade_resposta: evaluation.qualidade_resposta as string,
        entendimento: evaluation.entendimento as string,
        coerencia: evaluation.coerencia as string,
        status: "respondido",
        responded_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (updateErr) throw new Error("Erro ao salvar resposta");

    // Log AI usage
    try {
      const cost = estimateCost(tokensPrompt, tokensResposta);
      await supabase.from("ai_usage_logs").insert({
        empresa_id: session.empresa_id,
        user_id: session.supervisor_id,
        training_id: session.id,
        action_type: "training_evaluation",
        provider: PROVIDER,
        model: MODEL,
        input_tokens: tokensPrompt,
        output_tokens: tokensResposta,
        estimated_cost_usd: cost,
        status: "success",
        metadata: { operador: session.operador, carteira: session.carteira },
      });
    } catch (logErr) {
      console.error("[avaliar-treino] Failed to log AI usage:", logErr);
    }

    return new Response(JSON.stringify({ success: true, evaluation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("avaliar-treino error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
