import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export default function Login() {
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If already logged in, go to dashboard
  if (!authLoading && session) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="CobraMind" className="h-14 w-14 mb-4" />
            <h1 className="font-heading text-2xl font-bold text-foreground">CobraMind</h1>
            <p className="text-sm text-muted-foreground mt-1 font-semibold">Inteligência para negociações de cobrança</p>
            <p className="text-xs text-muted-foreground mt-1">Analise conversas, detecte falhas e transforme monitoria em gestão.</p>
          </div>

        <form onSubmit={handleLogin} className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="bg-secondary border-border"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-secondary border-border"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 font-heading font-semibold">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          <div className="flex items-center justify-center text-xs">
            <Link to="/forgot-password" className="text-primary hover:underline">Esqueci minha senha</Link>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 mt-2">
            <p className="text-xs text-muted-foreground text-center">
              Acesso disponível apenas para usuários autorizados.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
