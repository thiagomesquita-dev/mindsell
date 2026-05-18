import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      nome,
      email,
      senha,
      nome_empresa,
      session_id,
    } = await req.json();

    // Validate inputs
    if (!nome?.trim()) return json({ error: "Nome é obrigatório." }, 400);
    if (!email?.trim()) return json({ error: "E-mail é obrigatório." }, 400);
    if (!senha || senha.length < 6) return json({ error: "Senha deve ter pelo menos 6 caracteres." }, 400);
    if (!nome_empresa?.trim()) return json({ error: "Nome da empresa é obrigatório." }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Normalize company name
    const normalizedCompany = nome_empresa
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

    console.log("[finalizar-onboarding] Company:", normalizedCompany);

    // 2. Check if company already exists
    const { data: existingCompany } = await admin
      .from("companies")
      .select("id")
      .eq("nome_empresa", normalizedCompany)
      .maybeSingle();

    if (existingCompany) {
      return json({ error: "Uma empresa com esse nome já existe. Solicite acesso ao administrador." }, 409);
    }

    // 3. Create auth user
    const { data: newUser, error: authErr } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: senha,
      email_confirm: true,
      user_metadata: { nome: nome.trim() },
    });

    if (authErr) {
      console.error("[finalizar-onboarding] Auth error:", authErr.message);
      if (authErr.message?.includes("already been registered")) {
        return json({ error: "Este e-mail já está cadastrado." }, 409);
      }
      return json({ error: "Erro ao criar conta: " + authErr.message }, 500);
    }

    const userId = newUser.user.id;
    console.log("[finalizar-onboarding] User created:", userId);

    // 4. Create company
    const { data: company, error: compErr } = await admin
      .from("companies")
      .insert({ nome_empresa: normalizedCompany })
      .select("id")
      .single();

    if (compErr) {
      console.error("[finalizar-onboarding] Company error:", compErr.message);
      await admin.auth.admin.deleteUser(userId);
      return json({ error: "Erro ao criar empresa." }, 500);
    }

    console.log("[finalizar-onboarding] Company created:", company.id);

    // 5. Update profile: link to company, mark onboarding complete
    const { error: profErr } = await admin
      .from("profiles")
      .update({
        empresa_id: company.id,
        onboarding_completed: true,
        status: "ativo",
      })
      .eq("id", userId);

    if (profErr) {
      console.error("[finalizar-onboarding] Profile error:", profErr.message);
      await admin.auth.admin.deleteUser(userId);
      return json({ error: "Erro ao vincular perfil à empresa." }, 500);
    }

    // 6. Update role from default 'supervisor' to 'gestor'
    const { error: roleErr } = await admin
      .from("user_roles")
      .update({ role: "gestor" })
      .eq("user_id", userId);

    if (roleErr) {
      console.error("[finalizar-onboarding] Role error:", roleErr.message);
    }

    // 7. Create company_membership
    await admin.from("company_memberships").insert({
      user_id: userId,
      company_id: company.id,
      role: "gestor",
      created_by: userId,
    });

    // 8. Link Stripe subscription if session_id provided
    let subscriptionLinked = false;
    if (session_id && stripeSecretKey) {
      try {
        console.log("[finalizar-onboarding] Retrieving Stripe session:", session_id);

        const sessionRes = await fetch(
          `https://api.stripe.com/v1/checkout/sessions/${session_id}?expand[]=subscription`,
          {
            headers: { Authorization: `Bearer ${stripeSecretKey}` },
          }
        );
        const session = await sessionRes.json();

        if (session.subscription) {
          const sub = typeof session.subscription === "string"
            ? null
            : session.subscription;

          const stripeSubId = sub?.id ?? session.subscription;
          const customerId = session.customer;
          const planCode = session.metadata?.plan_code ?? "free";
          const priceId = sub?.items?.data?.[0]?.price?.id ?? session.metadata?.stripe_price_id ?? null;

          console.log("[finalizar-onboarding] Linking subscription:", stripeSubId, "plan:", planCode);

          // Upsert into company_subscriptions
          const { error: subErr } = await admin
            .from("company_subscriptions")
            .upsert(
              {
                empresa_id: company.id,
                stripe_subscription_id: stripeSubId,
                stripe_customer_id: customerId,
                stripe_price_id: priceId,
                plan_code: planCode,
                status: sub?.status ?? "active",
                current_period_start: sub?.current_period_start
                  ? new Date(sub.current_period_start * 1000).toISOString()
                  : null,
                current_period_end: sub?.current_period_end
                  ? new Date(sub.current_period_end * 1000).toISOString()
                  : null,
                trial_ends_at: sub?.trial_end
                  ? new Date(sub.trial_end * 1000).toISOString()
                  : null,
                cancel_at_period_end: sub?.cancel_at_period_end ?? false,
              },
              { onConflict: "empresa_id" }
            );

          if (subErr) {
            console.error("[finalizar-onboarding] Subscription link error:", subErr.message);
          } else {
            subscriptionLinked = true;
            console.log("[finalizar-onboarding] Subscription linked successfully");
          }

          // Also update company plan
          await admin
            .from("companies")
            .update({ plano: planCode })
            .eq("id", company.id);
        }
      } catch (stripeErr) {
        console.error("[finalizar-onboarding] Stripe error:", stripeErr);
      }
    }

    // 9. Send welcome email via Resend (non-blocking)
    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const resendFrom = Deno.env.get("RESEND_FROM_EMAIL") || "MindSell <contato@mindsell.ia.br>";

      if (resendApiKey) {
        const PLAN_LABELS: Record<string, string> = {
          essencial: "Essencial",
          profissional: "Profissional",
          performance: "Performance",
          free: "Gratuito",
        };

        // Determine the plan from Stripe metadata or fallback
        let finalPlanCode = "free";
        if (session_id && stripeSecretKey) {
          try {
            const sRes = await fetch(
              `https://api.stripe.com/v1/checkout/sessions/${session_id}`,
              { headers: { Authorization: `Bearer ${stripeSecretKey}` } }
            );
            const sData = await sRes.json();
            finalPlanCode = sData.metadata?.plan_code || "free";
          } catch (_) { /* ignore */ }
        }

        const planLabel = PLAN_LABELS[finalPlanCode] || finalPlanCode;

        const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background-color:#1a1a2e;padding:28px 32px;text-align:center;">
          <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:700;">MindSell</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;font-size:20px;color:#1a1a2e;">Olá, ${nome.trim()}!</h2>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
            Sua conta no <strong>MindSell</strong> foi criada com sucesso. Tudo pronto para você começar a transformar sua operação com inteligência artificial.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:6px;margin:20px 0;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Empresa</p>
              <p style="margin:0 0 14px;font-size:15px;color:#1a1a2e;font-weight:600;">${normalizedCompany}</p>
              <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Plano</p>
              <p style="margin:0 0 14px;font-size:15px;color:#1a1a2e;font-weight:600;">${planLabel}</p>
              <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Perfil</p>
              <p style="margin:0;font-size:15px;color:#1a1a2e;font-weight:600;">Gestor</p>
            </td></tr>
          </table>
          <p style="margin:20px 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            Acesse o sistema e comece a configurar sua equipe, carteiras e primeiros acompanhamentos.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td style="background-color:#6366f1;border-radius:6px;">
            <a href="https://app.mindsell.ia.br/guide" style="display:inline-block;padding:12px 28px;font-size:15px;color:#ffffff;text-decoration:none;font-weight:600;">
              Acessar o MindSell
            </a>
          </td></tr></table>
          <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;line-height:1.5;">
            Se tiver dúvidas, entre em contato pelo e-mail
            <a href="mailto:contato@mindsell.ia.br" style="color:#6366f1;">contato@mindsell.ia.br</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [email.trim()],
            subject: "Sua conta no MindSell foi criada com sucesso",
            html: emailHtml,
          }),
        });

        if (emailRes.ok) {
          console.log("[finalizar-onboarding] Welcome email sent to:", email.trim());
        } else {
          const errBody = await emailRes.text();
          console.error("[finalizar-onboarding] Resend error:", emailRes.status, errBody);
        }
      } else {
        console.warn("[finalizar-onboarding] RESEND_API_KEY not set, skipping welcome email");
      }
    } catch (emailErr) {
      console.error("[finalizar-onboarding] Welcome email error (non-blocking):", emailErr);
    }

    return json({
      success: true,
      user_id: userId,
      empresa_id: company.id,
      subscription_linked: subscriptionLinked,
    });
  } catch (err) {
    console.error("[finalizar-onboarding] Unexpected:", err);
    return json({ error: "Erro interno. Tente novamente." }, 500);
  }
});
