const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_PLANS = ["essencial", "profissional", "performance"] as const;

const PLAN_PRICE_MAP: Record<string, string> = {
  essencial: Deno.env.get("STRIPE_PRICE_ESSENCIAL") ?? "",
  profissional: Deno.env.get("STRIPE_PRICE_PROFISSIONAL") ?? "",
  performance: Deno.env.get("STRIPE_PRICE_PERFORMANCE") ?? "",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const planCode = body.plan_code as string;
    const customerEmail = body.customer_email as string | undefined;
    const userName = body.user_name as string | undefined;
    const companyName = body.company_name as string | undefined;

    console.log("plan_code received:", planCode);

    if (!planCode || !VALID_PLANS.includes(planCode as any)) {
      return new Response(
        JSON.stringify({ error: "plan_code inválido. Valores aceitos: essencial, profissional, performance." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const priceId = PLAN_PRICE_MAP[planCode];
    console.log("price_id resolved:", priceId);

    if (!priceId) {
      console.error(`Missing STRIPE_PRICE for plan: ${planCode}`);
      return new Response(JSON.stringify({ error: "Price ID não configurado para este plano." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY not set");
      return new Response(JSON.stringify({ error: "Stripe não configurado." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || "https://cobra-mind-ai.lovable.app";

    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("payment_method_types[0]", "card");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("subscription_data[trial_period_days]", "7");
    params.append("subscription_data[metadata][plan_code]", planCode);
    params.append("metadata[plan_code]", planCode);
    if (userName) params.append("metadata[user_name]", userName);
    if (companyName) params.append("metadata[company_name]", companyName);
    if (customerEmail) params.append("customer_email", customerEmail);
    params.append("success_url", `${origin}/onboarding?session_id={CHECKOUT_SESSION_ID}&plan=${planCode}`);
    params.append("cancel_url", `${origin}/planos?checkout=cancel`);

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error("Stripe API error:", JSON.stringify(session));
      return new Response(JSON.stringify({ error: session.error?.message || "Erro ao criar sessão de checkout." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Checkout session created:", session.id);

    return new Response(JSON.stringify({ checkout_url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("Unexpected error:", err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: "Erro interno ao processar a solicitação." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
