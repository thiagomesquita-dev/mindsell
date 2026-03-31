import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@4.1.2";

const FOUNDER_EMAIL = "thiago@thiagoanalytics.com.br";

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
  console.error(`[cadastrar-gestor] ERRO em ${step}: ${message}`);
  return jsonResponse({ success: false, step, message }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("[cadastrar-gestor] Início da requisição");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return errorResponse("configuration", "Configuração do servidor incompleta", 500);
    }

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("auth", "Cabeçalho de autorização ausente", 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !caller) {
      return errorResponse("auth", "Sessão inválida ou expirada. Faça login novamente.", 401);
    }

    // Only founder can use this endpoint
    if (caller.email !== FOUNDER_EMAIL) {
      return errorResponse("authorization", "Apenas o founder pode cadastrar gestores", 403);
    }

    // Parse body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("validation", "Payload inválido", 400);
    }

    const { nome, email, senha, empresa_id, role = "gestor" } = body as {
      nome?: string;
      email?: string;
      senha?: string;
      empresa_id?: string;
      role?: string;
    };

    if (!nome?.trim()) return errorResponse("validation", "Nome é obrigatório");
    if (!email?.trim()) return errorResponse("validation", "E-mail é obrigatório");
    if (!senha || (senha as string).length < 6) {
      return errorResponse("validation", "Senha deve ter pelo menos 6 caracteres");
    }
    if (!empresa_id) return errorResponse("validation", "Empresa é obrigatória");

    // Validate role
    const allowedRoles = ["gestor", "admin"];
    const finalRole = allowedRoles.includes(role) ? role : "gestor";

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify company exists
    const { data: company, error: compErr } = await adminClient
      .from("companies")
      .select("id, nome_empresa")
      .eq("id", empresa_id)
      .single();

    if (compErr || !company) {
      return errorResponse("validation", "Empresa não encontrada");
    }

    console.log(`[cadastrar-gestor] Criando ${finalRole} para empresa: ${company.nome_empresa}`);

    // Create user
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
      console.error("[cadastrar-gestor] Erro Auth:", createErr.message);
      return errorResponse("create_auth_user", "Não foi possível criar o usuário no Auth");
    }

    const userId = newUser.user.id;
    console.log("[cadastrar-gestor] Usuário criado:", userId);

    // Update profile with empresa_id and mark onboarding complete
    const { error: profileErr } = await adminClient
      .from("profiles")
      .update({
        empresa_id: empresa_id,
        onboarding_completed: true,
        status: "ativo",
      })
      .eq("id", userId);

    if (profileErr) {
      console.error("[cadastrar-gestor] Erro profile:", profileErr.message);
      await adminClient.auth.admin.deleteUser(userId);
      return errorResponse("link_empresa", "Erro ao vincular gestor à empresa. Operação revertida.");
    }

    // Update role from default 'supervisor' to the chosen role
    const { error: roleErr } = await adminClient
      .from("user_roles")
      .update({ role: finalRole })
      .eq("user_id", userId);

    if (roleErr) {
      console.error("[cadastrar-gestor] Erro role:", roleErr.message);
      await adminClient.auth.admin.deleteUser(userId);
      return errorResponse("set_role", "Erro ao definir papel do gestor. Operação revertida.");
    }

    // Send welcome email
    let emailSent = false;
    let emailError: string | null = null;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");

    if (resendApiKey && resendFromEmail) {
      try {
        const resend = new Resend(resendApiKey);
        const trimmedNome = (nome as string).trim();
        const trimmedEmail = (email as string).trim();
        const loginUrl = "https://app.cobramind.ia.br/login";
        const roleLabel = finalRole === "gestor" ? "Gestor(a)" : "Administrador(a)";

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1a1a2e; font-size: 24px; margin: 0;">CobraMind</h1>
              <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Inteligência em Cobrança</p>
            </div>
            
            <h2 style="color: #1a1a2e; font-size: 20px;">Bem-vindo(a), ${trimmedNome}!</h2>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              Seu cadastro como <strong>${roleLabel}</strong> foi realizado com sucesso no CobraMind.
            </p>

            <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>Seus dados de acesso:</strong></p>
              <p style="margin: 0 0 4px 0; color: #374151; font-size: 14px;">📧 E-mail: <strong>${trimmedEmail}</strong></p>
              <p style="margin: 0 0 4px 0; color: #374151; font-size: 14px;">🔑 Senha: a senha definida pela administração</p>
              <p style="margin: 0; color: #374151; font-size: 14px;">🏢 Empresa: <strong>${company.nome_empresa}</strong></p>
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
              Este e-mail foi enviado automaticamente pelo CobraMind.
            </p>
          </div>
        `;

        const { error: resendErr } = await resend.emails.send({
          from: resendFromEmail,
          to: [trimmedEmail],
          subject: `Bem-vindo ao CobraMind — ${company.nome_empresa}`,
          html: emailHtml,
        });

        if (resendErr) {
          emailError = resendErr.message || JSON.stringify(resendErr);
        } else {
          emailSent = true;
        }
      } catch (err: unknown) {
        emailError = err instanceof Error ? err.message : String(err);
      }
    } else {
      emailError = "Configuração de e-mail não disponível";
    }

    console.log("[cadastrar-gestor] Gestor criado com sucesso. E-mail enviado:", emailSent);
    return jsonResponse({
      success: true,
      user_id: userId,
      empresa: company.nome_empresa,
      role: finalRole,
      email_sent: emailSent,
      email_error: emailError,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    console.error("[cadastrar-gestor] Erro inesperado:", message);
    return errorResponse("unknown", message, 500);
  }
});
