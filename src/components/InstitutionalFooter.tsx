import { Brain } from "lucide-react";
import { Link } from "react-router-dom";
import { PublicContactButton } from "@/components/PublicContactButton";

const APP_URL = "https://app.mindsell.ia.br";

export function InstitutionalFooter() {
  return (
    <footer className="border-t border-border py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="font-heading font-bold text-foreground">MindSell</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Inteligência artificial para análise de negociações e performance operacional.
            </p>
          </div>

          {/* Produto */}
          <div className="flex flex-col gap-2">
            <span className="font-heading font-semibold text-foreground text-sm uppercase tracking-wider">Produto</span>
            <a href={APP_URL} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Acessar sistema
            </a>
            <Link to="/planos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Planos e preços
            </Link>
            <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Blog
            </Link>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-2">
            <span className="font-heading font-semibold text-foreground text-sm uppercase tracking-wider">Legal</span>
            <Link to="/termos-de-uso" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Termos de Uso
            </Link>
            <Link to="/politica-de-privacidade" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Política de Privacidade
            </Link>
            <Link to="/cancelamento-e-reembolso" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancelamento e Reembolso
            </Link>
          </div>

          {/* Contato */}
          <div className="flex flex-col gap-2">
            <span className="font-heading font-semibold text-foreground text-sm uppercase tracking-wider">Contato</span>
            <a href="mailto:contato@mindsell.ia.br" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              contato@mindsell.ia.br
            </a>
            <Link to="/contato" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Fale conosco
            </Link>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} MindSell. Todos os direitos reservados.</span>
          <div className="flex items-center gap-4">
            <Link to="/termos-de-uso" className="hover:text-foreground transition-colors">Termos</Link>
            <Link to="/politica-de-privacidade" className="hover:text-foreground transition-colors">Privacidade</Link>
            <Link to="/contato" className="hover:text-foreground transition-colors">Contato</Link>
          </div>
        </div>
      </div>
      <PublicContactButton />
    </footer>
  );
}
