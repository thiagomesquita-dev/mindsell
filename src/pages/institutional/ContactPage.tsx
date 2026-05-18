import { useEffect } from "react";
import { Mail, ExternalLink, Clock, MessageCircle, ArrowLeft } from "lucide-react";
import { InstitutionalHeader } from "@/components/InstitutionalHeader";
import { InstitutionalFooter } from "@/components/InstitutionalFooter";
import { Link } from "react-router-dom";

const APP_URL = "https://app.mindsell.ia.br";
const WHATSAPP_NUMBER = "5511999999999"; // Altere para o número oficial

export default function ContactPage() {
  useEffect(() => { document.title = "Contato e Suporte — MindSell"; }, []);
  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <InstitutionalHeader />
        <main className="pt-28 pb-20 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
              <ArrowLeft className="h-4 w-4" /> Voltar para a home
            </Link>

            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">Contato e Suporte do MindSell</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Se você precisa de atendimento comercial, suporte técnico, informações sobre planos, ajuda com acesso, vendas ou qualquer outro assunto relacionado ao MindSell, entre em contato pelos canais abaixo.
            </p>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Email */}
              <div className="rounded-lg border border-border bg-card p-6 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-6 w-6 text-primary" />
                  <h2 className="text-lg font-heading font-semibold text-foreground">E-mail</h2>
                </div>
                <a
                  href="mailto:contato@mindsell.ia.br"
                  className="text-primary hover:underline font-medium"
                >
                  contato@mindsell.ia.br
                </a>
                <p className="text-sm text-muted-foreground">
                  Prazo médio de resposta: até 1 dia útil.
                </p>
              </div>

              {/* WhatsApp */}
              <div className="rounded-lg border border-border bg-card p-6 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-6 w-6 text-primary" />
                  <h2 className="text-lg font-heading font-semibold text-foreground">WhatsApp</h2>
                </div>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Enviar mensagem
                </a>
                <p className="text-sm text-muted-foreground">
                  Atendimento por mensagem em horário comercial.
                </p>
              </div>

              {/* Horário */}
              <div className="rounded-lg border border-border bg-card p-6 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-primary" />
                  <h2 className="text-lg font-heading font-semibold text-foreground">Horário de atendimento</h2>
                </div>
                <p className="text-foreground font-medium">Segunda a sexta, das 9h às 18h</p>
                <p className="text-sm text-muted-foreground">Horário de Brasília (BRT/GMT-3).</p>
              </div>

              {/* Acessar sistema */}
              <div className="rounded-lg border border-border bg-card p-6 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-6 w-6 text-primary" />
                  <h2 className="text-lg font-heading font-semibold text-foreground">Acessar o sistema</h2>
                </div>
                <a
                  href={APP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  app.mindsell.ia.br
                </a>
                <p className="text-sm text-muted-foreground">
                  Já é cliente? Acesse a plataforma diretamente.
                </p>
              </div>
            </div>

            {/* Assuntos atendidos */}
            <div className="mt-10 rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-heading font-semibold text-foreground mb-4">Assuntos atendidos</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground list-disc list-inside">
                <li>dúvidas comerciais</li>
                <li>contratação e planos</li>
                <li>suporte técnico</li>
                <li>acesso à plataforma</li>
                <li>cancelamento</li>
                <li>vendas e pagamentos</li>
                <li>privacidade e proteção de dados</li>
              </ul>
            </div>
          </div>
        </main>
        <InstitutionalFooter />
      </div>
    
  );
}
