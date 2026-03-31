import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import logo from "@/assets/logo.png";

function normalizeCompanyName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export default function Onboarding() {
  const { user } = useAuth();
  const { isAdmin, isFounder, isLoading: rolesLoading } = useUserRole();
  const navigate = useNavigate();
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [saving, setSaving] = useState(false);

  // Admin/founder should never see onboarding — redirect to dashboard
  if (!rolesLoading && (isAdmin || isFounder)) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!nomeEmpresa.trim()) {
      toast.error("Informe o nome da empresa");
      return;
    }

    setSaving(true);
    try {
      // Use secure server-side RPC that creates a new company,
      // links the profile, and assigns admin role atomically
      const { error } = await supabase.rpc("complete_onboarding", {
        _nome_empresa: nomeEmpresa,
      });
      if (error) throw error;

      toast.success("Configuração concluída!");
      window.location.href = "/";
    } catch (err: unknown) {
      toast.error("Erro: " + getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="CobraMind" className="h-14 w-14 mb-4" />
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Configuração Inicial
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie sua empresa para começar a usar o CobraMind
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-xl p-6 space-y-6"
        >
          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">
              Nome da empresa *
            </Label>
            <Input
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
              placeholder="Ex: Nacional Cobrança"
              required
              className="bg-secondary border-border"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Será salvo como: {normalizeCompanyName(nomeEmpresa || "...")}
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">
              Você será o Gestor da empresa
            </p>
            <p className="text-xs text-muted-foreground">
              Como gestor, você terá acesso às ferramentas de coordenação e poderá
              cadastrar supervisores e gerenciar carteiras pela tela de Gestão da Equipe.
            </p>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full h-11 font-heading font-semibold"
          >
            {saving ? "Salvando..." : "Criar empresa e entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
