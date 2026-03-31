import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export default function Signup() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="CobraMind" className="h-14 w-14 mb-4" />
          <h1 className="font-heading text-2xl font-bold text-foreground">CobraMind</h1>
          <p className="text-sm text-muted-foreground mt-1">Crie sua conta de Gestão</p>
        </div>

        <form onSubmit={handleSignup} className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">Nome completo</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" required className="bg-secondary border-border" />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required className="bg-secondary border-border" />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required className="bg-secondary border-border" />
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              Este cadastro é exclusivo para <span className="font-semibold text-foreground">Gestores</span> que desejam criar uma nova empresa. 
              Supervisores devem ser cadastrados pela Gestão após o login.
            </p>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 font-heading font-semibold">
            {loading ? "Criando conta..." : "Criar conta"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
