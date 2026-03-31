import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@4.1.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(step: string, message: string, status = 400) {
  console.error(`[criar-supervisor] ERRO em ${step}: ${message}`);
  return jsonResponse({ success: false, step, message }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("[criar-supervisor] Início da requisição");

  try {
    // 1. Validate environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return errorResponse("configuration", "Configuração do servidor incompleta", 500);
    }

    // 2. Validate auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("auth", "Cabeçalho de autorização ausente", 401);
    }

    // 3. Verify caller identity
    console.log("[criar-supervisor] Verificando identidade do chamador");
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !caller) {
      return errorResponse("auth", "Sessão inválida ou expirada. Faça login novamente.", 401);
    }

    // 4. Verify caller is coordinator
    console.log("[criar-supervisor] Verificando permissão de coordenação");
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: isCoord } = await adminClient.rpc("is_coordinator", { _user_id: caller.id });
    if (!isCoord) {
      return errorResponse("authorization", "Você não tem permissão para cadastrar supervisores", 403);
    }

    // 5. Get caller's empresa_id
    const { data: empresaId } = await adminClient.rpc("get_user_empresa_id", { _user_id: caller.id });
    if (!empresaId) {
      return errorResponse("authorization", "Empresa não encontrada para o usuário logado", 400);
    }

    // 6. Parse and validate body
    console.log("[criar-supervisor] Validando payload");
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("validation", "Payload inválido", 400);
    }

    const { nome, email, senha, carteiras, status = "ativo" } = body as {
      nome?: string;
      email?: string;
      senha?: string;
      carteiras?: string[];
      status?: string;
    };

    if (!nome?.trim()) return errorResponse("validation", "Nome é obrigatório");
    if (!email?.trim()) return errorResponse("validation", "E-mail é obrigatório");
    if (!senha || (senha as string).length < 6) {
      return errorResponse("validation", "Senha deve ter pelo menos 6 caracteres");
    }
    if (!carteiras || !Array.isArray(carteiras) || carteiras.length === 0) {
      return errorResponse("validation", "Selecione ao menos uma carteira");
    }

    // 7. Create user via admin API
    console.log("[criar-supervisor] Criando usuário no Auth");
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email: (email as string).trim(),
      password: senha as string,
      email_confirm: true,
      user_metadata: { nome: (nome as string).trim() },
    });

    if (createErr) {
      if (createErr.message?.includes("already been registered")) {
        return errorResponse("create_auth_user", "Este e-mail já está cadastrado");
      }
      console.error("[criar-supervisor] Erro Auth:", createErr.message);
      return errorResponse("create_auth_user", "Não foi possível criar o usuário no Auth");
    }

    const userId = newUser.user.id;
    console.log("[criar-supervisor] Usuário criado:", userId);

    // 8. Update profile with empresa_id
    console.log("[criar-supervisor] Vinculando à empresa");
    const { error: profileErr } = await adminClient
      .from("profiles")
      .update({
        empresa_id: empresaId,
        onboarding_completed: true,
        status: status as string,
      })
      .eq("id", userId);

    if (profileErr) {
      console.error("[criar-supervisor] Erro profile:", profileErr.message);
      await adminClient.auth.admin.deleteUser(userId);
      return errorResponse("link_empresa", "Erro ao vincular supervisor à empresa. Operação revertida.");
    }

    // 9. Insert portfolio links
    console.log("[criar-supervisor] Vinculando carteiras:", carteiras);
    const portfolioRows = (carteiras as string[]).map((c) => ({
      user_id: userId,
      carteira: c,
    }));
    const { error: portErr } = await adminClient
      .from("user_portfolios")
      .insert(portfolioRows);

    if (portErr) {
      console.error("[criar-supervisor] Erro portfolios:", portErr.message);
      await adminClient.auth.admin.deleteUser(userId);
      return errorResponse("link_carteiras", "Erro ao vincular supervisor às carteiras. Operação revertida.");
    }

    // 10. Send verification/welcome email via Resend
    let emailSent = false;
    let emailError: string | null = null;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");

    if (!resendApiKey) {
      console.error("[criar-supervisor] RESEND_API_KEY não configurada");
      emailError = "RESEND_API_KEY não configurada";
    } else if (!resendFromEmail) {
      console.error("[criar-supervisor] RESEND_FROM_EMAIL não configurado");
      emailError = "RESEND_FROM_EMAIL não configurado";
    } else {
      try {
        console.log("[criar-supervisor] Iniciando envio de e-mail de verificação");

        const resend = new Resend(resendApiKey);
        const loginUrl = "https://app.cobramind.ia.br/login";
        const trimmedNome = (nome as string).trim();
        const trimmedEmail = (email as string).trim();
        const carteirasText = (carteiras as string[]).join(", ");

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1a1a2e; font-size: 24px; margin: 0;">CobraMind</h1>
              <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Inteligência em Cobrança</p>
            </div>
            
            <h2 style="color: #1a1a2e; font-size: 20px;">Bem-vindo(a), ${trimmedNome}!</h2>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              Seu cadastro como <strong>Supervisor(a)</strong> foi realizado com sucesso no CobraMind.
            </p>

            <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>Seus dados de acesso:</strong></p>
              <p style="margin: 0 0 4px 0; color: #374151; font-size: 14px;">📧 E-mail: <strong>${trimmedEmail}</strong></p>
              <p style="margin: 0 0 4px 0; color: #374151; font-size: 14px;">🔑 Senha: a senha definida pela coordenação</p>
              <p style="margin: 0; color: #374151; font-size: 14px;">📂 Carteiras: <strong>${carteirasText}</strong></p>
            </div>

            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              Acesse o sistema pelo link abaixo e altere sua senha no primeiro acesso:
            </p>

            <div style="text-align: center; margin: 24px 0;">
              <a href="${loginUrl}" 
                 style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                Acessar CobraMind
              </a>
            </div>

            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              Este e-mail foi enviado automaticamente pelo CobraMind. Não responda a esta mensagem.
            </p>
          </div>
        `;

        const emailPayload = {
          from: resendFromEmail,
          to: [trimmedEmail],
          subject: "Bem-vindo ao CobraMind — Seus dados de acesso",
          html: emailHtml,
        };

        console.log("[criar-supervisor] Payload do e-mail montado:", {
          from: emailPayload.from,
          to: emailPayload.to,
          subject: emailPayload.subject,
        });

        const { data: emailData, error: resendErr } = await resend.emails.send(emailPayload);

        if (resendErr) {
          console.error("[criar-supervisor] Erro no envio do e-mail (Resend):", JSON.stringify(resendErr));
          emailError = resendErr.message || JSON.stringify(resendErr);
        } else {
          console.log("[criar-supervisor] Resposta do Resend recebida:", JSON.stringify(emailData));
          emailSent = true;
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("[criar-supervisor] Erro inesperado no envio de e-mail:", errMsg);
        emailError = errMsg;
      }
    }

    console.log("[criar-supervisor] Supervisor criado com sucesso. E-mail enviado:", emailSent);
    return jsonResponse({
      success: true,
      user_id: userId,
      email_sent: emailSent,
      email_error: emailError,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    console.error("[criar-supervisor] Erro inesperado:", message);
    return errorResponse("unknown", message, 500);
  }
});
