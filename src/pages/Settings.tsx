import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export default function Settings() {
  const { profile, signOut } = useAuth();
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setNome(profile.nome);
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nome })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Perfil atualizado!");
    }
  };

  return (
    <div className="max-w-xl">
      <PageHeader title="Configurações" description="Gerencie seu perfil e conta" />

      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <div>
          <Label className="text-sm text-muted-foreground mb-1.5 block">E-mail</Label>
          <Input value={profile?.email || ""} disabled className="bg-muted border-border" />
        </div>
        <div>
          <Label className="text-sm text-muted-foreground mb-1.5 block">Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} className="bg-secondary border-border" />
        </div>
        <Button onClick={handleSave} disabled={saving} className="font-heading font-semibold">
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>

      <div className="mt-6">
        <Button variant="destructive" onClick={signOut} className="font-heading font-semibold">
          <LogOut className="h-4 w-4 mr-2" /> Sair da conta
        </Button>
      </div>
    </div>
  );
}
