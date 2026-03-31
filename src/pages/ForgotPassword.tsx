import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="CobraMind" className="h-14 w-14 mb-4" />
          <h1 className="font-heading text-2xl font-bold text-foreground">Recuperar Senha</h1>
        </div>

        {sent ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-sm text-foreground mb-4">E-mail de recuperação enviado! Verifique sua caixa de entrada.</p>
            <Link to="/login" className="text-primary hover:underline text-sm">Voltar ao login</Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-1.5 block">E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required className="bg-secondary border-border" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 font-heading font-semibold">
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              <Link to="/login" className="text-primary hover:underline">Voltar ao login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
