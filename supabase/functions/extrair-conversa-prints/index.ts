// supabase/functions/extrair-conversa-prints/index.ts
// Edge function: recebe paths de prints no bucket `analysis-images`, baixa-os,
// envia para o Lovable AI Gateway (Gemini multimodal) e retorna uma transcrição
// estruturada OPERADOR/CLIENTE pronta para o usuário revisar.
//
// Não chama o pipeline de análise. Mantém OCR e scoring desacoplados.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const BUCKET = "analysis-images";

// Pricing USD por 1M tokens — alinhado ao Lovable AI Gateway / Google Gemini.
// Fonte: https://ai.google.dev/pricing (Gemini 2.5 Flash). Valores por 1M tokens.
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "google/gemini-2.5-flash": { input: 0.075, output: 0.30 },
  "google/gemini-2.5-flash-lite": { input: 0.0375, output: 0.15 },
  "google/gemini-2.5-pro": { input: 1.25, output: 10.0 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const costs = MODEL_COSTS[model] || { input: 0.075, output: 0.30 };
  return (
    Math.round(
      ((promptTokens / 1_000_000) * costs.input + (completionTokens / 1_000_000) * costs.output) * 10000,
    ) / 10000
  );
}

const SYSTEM_PROMPT = `Você é um assistente especializado em ler PRINTS (capturas de tela) de conversas de cobrança (WhatsApp, SMS, chat) e transformar em uma TRANSCRIÇÃO estruturada de diálogo.

REGRAS OBRIGATÓRIAS:
1. Use APENAS o texto visível nas imagens. NÃO invente conteúdo, nomes, valores ou mensagens.
2. As imagens são PRINTS SEQUENCIAIS da MESMA conversa. Mantenha a ORDEM CRONOLÓGICA: imagem 1 vem antes da imagem 2, etc.
3. Se o conteúdo do início de um print já apareceu no final do print anterior (sobreposição), NÃO duplique.
4. Identifique quem é OPERADOR e quem é CLIENTE quando possível.
   - No WhatsApp, em geral, o lado direito (verde/azul) costuma ser quem está enviando do telefone (pode ser operador ou cliente conforme o contexto). Use pistas:
     • Operador: se identifica, menciona empresa/carteira, apresenta proposta, valor, data, parcelamento.
     • Cliente: responde, pergunta sobre valor, recusa, pede prazo, justifica situação.
   - Se for AMBÍGUO, use FALANTE NÃO IDENTIFICADO.
5. Ignore elementos da interface (horário, status "lida", barras, ícones, nome do contato no topo). Foque APENAS nas mensagens.
6. Se um trecho estiver ilegível, escreva [ILEGÍVEL] no lugar — NÃO chute.
7. NÃO resuma. NÃO adicione comentários. NÃO use markdown.

FORMATO DE SAÍDA (texto puro, uma fala por linha):
OPERADOR: [mensagem]
CLIENTE: [mensagem]
OPERADOR: [mensagem]
...

Se não houver NENHUM texto reconhecível em nenhuma imagem, retorne exatamente: NENHUM_TEXTO_DETECTADO`;

interface ExtractRequest {
  image_paths: string[];      // caminhos no bucket analysis-images
  empresa_id?: string;        // founder pode passar; demais ignoram
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Validate input
    const body = (await req.json()) as ExtractRequest;
    const imagePaths = Array.isArray(body.image_paths) ? body.image_paths : [];
    if (imagePaths.length === 0) {
      return new Response(JSON.stringify({ error: "Envie ao menos 1 print." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (imagePaths.length > MAX_IMAGES) {
      return new Response(JSON.stringify({ error: `Máximo de ${MAX_IMAGES} prints por extração.` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Empresa do usuário
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("empresa_id").eq("id", user.id).single();
    if (!profile?.empresa_id) {
      return new Response(JSON.stringify({ error: "Configure sua empresa antes de extrair conversas." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FOUNDER_EMAIL = "thiago@thiagoanalytics.com.br";
    const isFounder = user.email === FOUNDER_EMAIL;
    const effectiveEmpresaId =
      isFounder && body.empresa_id ? body.empresa_id : profile.empresa_id;

    // Garante que todos os paths começam com a empresa do usuário (defesa em profundidade — RLS já cobre)
    for (const p of imagePaths) {
      const firstFolder = String(p).split("/")[0];
      if (firstFolder !== effectiveEmpresaId && !isFounder) {
        return new Response(JSON.stringify({ error: "Um ou mais prints não pertencem à sua empresa." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Baixar e codificar as imagens em base64 (data URL)
    const dataUrls: string[] = [];
    const failedFiles: string[] = [];

    for (const path of imagePaths) {
      try {
        const { data: file, error: dlErr } = await supabaseAdmin.storage.from(BUCKET).download(path);
        if (dlErr || !file) {
          failedFiles.push(path);
          continue;
        }
        const ab = await file.arrayBuffer();
        if (ab.byteLength > MAX_IMAGE_BYTES) {
          failedFiles.push(`${path} (>5MB)`);
          continue;
        }
        const mime = (file.type && ALLOWED_MIME.includes(file.type)) ? file.type : guessMimeFromPath(path);
        if (!ALLOWED_MIME.includes(mime)) {
          failedFiles.push(`${path} (formato inválido)`);
          continue;
        }
        const b64 = bytesToBase64(new Uint8Array(ab));
        dataUrls.push(`data:${mime};base64,${b64}`);
      } catch (err) {
        console.error("[extrair-conversa-prints] download error:", path, err);
        failedFiles.push(path);
      }
    }

    if (dataUrls.length === 0) {
      return new Response(JSON.stringify({
        error: "Nenhum print pôde ser baixado para extração.",
        failed_files: failedFiles,
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Monta a chamada multimodal ao Lovable AI Gateway (formato OpenAI compatible)
    const userContent: Array<Record<string, unknown>> = [
      {
        type: "text",
        text:
          `Extraia a conversa dos ${dataUrls.length} prints abaixo. Eles estão na ordem cronológica. ` +
          `Retorne SOMENTE a transcrição estruturada, conforme o formato definido no system prompt.`,
      },
      ...dataUrls.map((url) => ({
        type: "image_url",
        image_url: { url },
      })),
    ];

    const startedAt = Date.now();
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("[extrair-conversa-prints] AI gateway error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Falha na extração: ${aiResp.status}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const raw = String(aiJson?.choices?.[0]?.message?.content ?? "").trim();
    const usage = aiJson?.usage || {};
    const elapsedMs = Date.now() - startedAt;

    // Log de uso
    try {
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const modelUsed = "google/gemini-2.5-flash";
      const costUsd = estimateCost(modelUsed, promptTokens, completionTokens);
      await supabaseAdmin.from("ai_usage_logs").insert({
        empresa_id: effectiveEmpresaId,
        user_id: user.id,
        action_type: "image_ocr_extraction",
        provider: "lovable_gateway",
        model: modelUsed,
        input_tokens: promptTokens,
        output_tokens: completionTokens,
        estimated_cost_usd: costUsd,
        status: "success",
        metadata: {
          images_total: imagePaths.length,
          images_processed: dataUrls.length,
          images_failed: failedFiles.length,
          elapsed_ms: elapsedMs,
        },
      });
    } catch (logErr) {
      console.error("[extrair-conversa-prints] log error:", logErr);
    }

    if (!raw || raw === "NENHUM_TEXTO_DETECTADO") {
      return new Response(JSON.stringify({
        transcription: "",
        partial: false,
        empty: true,
        failed_files: failedFiles,
        message: "Não foi possível identificar texto nas imagens enviadas. Reenvie prints mais nítidos ou edite a transcrição manualmente.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      transcription: raw,
      partial: failedFiles.length > 0,
      empty: false,
      failed_files: failedFiles,
      processed_count: dataUrls.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[extrair-conversa-prints] fatal:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function guessMimeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  // btoa is available in Deno
  return btoa(binary);
}
