import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Derive plan_code from Stripe price_id
function getPlanCode(priceId: string): string {
  const priceEssencial = Deno.env.get("STRIPE_PRICE_ESSENCIAL");
  const priceProfissional = Deno.env.get("STRIPE_PRICE_PROFISSIONAL");
  const pricePerformance = Deno.env.get("STRIPE_PRICE_PERFORMANCE");

  if (priceId === priceEssencial) return "essencial";
  if (priceId === priceProfissional) return "profissional";
  if (priceId === pricePerformance) return "performance";
  return "unknown";
}

// Convert Unix timestamp to ISO string or null
function tsToIso(ts: number | null | undefined): string | null {
  if (!ts) return null;
  return new Date(ts * 1000).toISOString();
}

// Verify Stripe webhook signature (HMAC-SHA256)
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(",");
  let timestamp = "";
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return false;

  // Reject events older than 5 minutes
  const tolerance = 300;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > tolerance) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedPayload)
  );
  const expectedSig = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signatures.some((sig) => sig === expectedSig);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sigHeader = req.headers.get("stripe-signature");
  if (!sigHeader) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.text();

  const isValid = await verifyStripeSignature(body, sigHeader, webhookSecret);
  if (!isValid) {
    console.error("Invalid Stripe signature");
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const event = JSON.parse(body);
  console.log(`Stripe event received: ${event.type} (${event.id})`);

  // Use service role to bypass RLS
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const empresaId = session.metadata?.empresa_id;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (!empresaId) {
          console.error("checkout.session.completed: missing empresa_id in metadata");
          break;
        }

        console.log(`Checkout completed for empresa ${empresaId}, subscription ${subscriptionId}`);

        // Upsert with minimal data; subscription events will fill the rest
        const { error } = await supabase
          .from("company_subscriptions")
          .upsert(
            {
              empresa_id: empresaId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              status: "active",
            },
            { onConflict: "empresa_id" }
          );

        if (error) {
          console.error("Error upserting subscription from checkout:", error);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const subscriptionId = subscription.id;
        const status = subscription.status; // active, past_due, canceled, etc.
        const cancelAtPeriodEnd = subscription.cancel_at_period_end ?? false;
        const trialEnd = subscription.trial_end;
        const currentPeriodStart = subscription.current_period_start;
        const currentPeriodEnd = subscription.current_period_end;

        // Get the first item's price
        const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
        const planCode = priceId ? getPlanCode(priceId) : "unknown";

        // Find empresa_id from existing record by customer or subscription
        let empresaId: string | null = null;

        // Try by subscription_id first
        const { data: existingSub } = await supabase
          .from("company_subscriptions")
          .select("empresa_id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (existingSub) {
          empresaId = existingSub.empresa_id;
        } else {
          // Try by customer_id
          const { data: byCust } = await supabase
            .from("company_subscriptions")
            .select("empresa_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (byCust) {
            empresaId = byCust.empresa_id;
          }
        }

        // Also check subscription metadata
        if (!empresaId && subscription.metadata?.empresa_id) {
          empresaId = subscription.metadata.empresa_id;
        }

        if (!empresaId) {
          console.error(
            `subscription.${event.type === "customer.subscription.created" ? "created" : "updated"}: ` +
            `could not resolve empresa_id for subscription ${subscriptionId}`
          );
          break;
        }

        console.log(`Subscription ${event.type} for empresa ${empresaId}: status=${status}, plan=${planCode}`);

        const { error } = await supabase
          .from("company_subscriptions")
          .upsert(
            {
              empresa_id: empresaId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              stripe_price_id: priceId,
              plan_code: planCode,
              status,
              trial_ends_at: tsToIso(trialEnd),
              current_period_start: tsToIso(currentPeriodStart),
              current_period_end: tsToIso(currentPeriodEnd),
              cancel_at_period_end: cancelAtPeriodEnd,
            },
            { onConflict: "empresa_id" }
          );

        if (error) {
          console.error("Error upserting subscription:", error);
        }

        // Also update the company plan in companies table
        if (status === "active" || status === "trialing") {
          const { error: compError } = await supabase
            .from("companies")
            .update({ plano: planCode })
            .eq("id", empresaId);

          if (compError) {
            console.error("Error updating company plan:", compError);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        console.log(`Subscription deleted: ${subscriptionId}`);

        const { data: existingSub } = await supabase
          .from("company_subscriptions")
          .select("empresa_id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (existingSub) {
          const { error } = await supabase
            .from("company_subscriptions")
            .update({
              status: "canceled",
              cancel_at_period_end: false,
            })
            .eq("stripe_subscription_id", subscriptionId);

          if (error) {
            console.error("Error marking subscription as canceled:", error);
          }

          // Downgrade company to free
          const { error: compError } = await supabase
            .from("companies")
            .update({ plano: "free" })
            .eq("id", existingSub.empresa_id);

          if (compError) {
            console.error("Error downgrading company plan:", compError);
          }
        } else {
          console.warn(`No subscription record found for ${subscriptionId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
