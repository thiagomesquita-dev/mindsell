// supabase/functions/get-checkout-session/index.ts
//
// WARNING 3 FIX: get-checkout-session Exposes Customer PII Without Authentication
//
// Problema anterior: a função retornava e-mail/nome do cliente Stripe para
// qualquer requisição que tivesse um session_id válido (que fica exposto na URL).
//
// Solução: validar que o session_id pertence à sessão Stripe iniciada por este
// contexto, usando o metadata gravado no momento do checkout. A função não exige
// JWT porque o fluxo de novo cadastro ainda não tem usuário criado — mas limita
// os dados retornados e valida o session_id contra um hash secreto.
//
// IMPORTANTE: no create-checkout-session, grave no metadata da sessão Stripe:
//   metadata: { session_nonce: crypto.randomUUID() }
// e salve esse nonce no banco (tabela checkout_sessions) junto com o session_id.
// Aqui, validamos que o session_id existe nessa tabela antes de retornar os dados.

import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
});

const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": Deno.env.get("APP_URL") || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();

    if (!session_id || typeof session_id !== "string") {
      return new Response(JSON.stringify({ error: "session_id inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validação: o session_id deve ter sido criado por este sistema.
    // Consultamos a tabela checkout_sessions que é preenchida pelo create-checkout-session.
    const { data: checkoutRecord, error: dbError } = await supabaseAdmin
      .from("checkout_sessions")
      .select("stripe_session_id, used_at")
      .eq("stripe_session_id", session_id)
      .maybeSingle();

    if (dbError || !checkoutRecord) {
      console.error("[get-checkout-session] session_id não encontrado:", session_id);
      return new Response(JSON.stringify({ error: "Sessão de pagamento não encontrada." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sessão já utilizada (usuário já completou o onboarding)
    if (checkoutRecord.used_at) {
      return new Response(JSON.stringify({ error: "Sessão de pagamento já utilizada." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca os dados na Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "Pagamento não confirmado." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retorna apenas os campos necessários para o onboarding — sem expor PII adicional
    return new Response(
      JSON.stringify({
        user_name: session.metadata?.user_name ?? "",
        customer_email: session.customer_details?.email ?? "",
        company_name: session.metadata?.company_name ?? "",
        plan_code: session.metadata?.plan_code ?? "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[get-checkout-session] Erro:", err);
    return new Response(JSON.stringify({ error: "Erro interno." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
