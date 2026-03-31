import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Building2, Users } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

export default function CompaniesManagement() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["all-companies-management"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, nome_empresa, plano, status, created_at")
        .order("nome_empresa");
      if (error) throw error;
      return data;
    },
  });

  const { data: memberCounts = {} } = useQuery({
    queryKey: ["company-member-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_memberships")
        .select("company_id")
        .eq("is_active", true);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((m) => {
        counts[m.company_id] = (counts[m.company_id] || 0) + 1;
      });
      return counts;
    },
    enabled: companies.length > 0,
  });

  const handleCreate = async () => {
    const normalized = newName.trim().toUpperCase().replace(/\s+/g, " ");
    if (!normalized || normalized.length < 2) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("companies")
        .insert({ nome_empresa: normalized })
        .select("id")
        .single();
      if (error) {
        if (error.message.includes("duplicate") || error.message.includes("unique")) {
          throw new Error("Já existe uma empresa com esse nome.");
        }
        throw error;
      }
      toast.success(`Empresa "${normalized}" cadastrada!`);
      setNewName("");
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["all-companies"] });
      queryClient.invalidateQueries({ queryKey: ["all-companies-management"] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gestão de Empresas"
        description="Cadastre e gerencie as empresas do sistema."
      >
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova Empresa
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Empresas Cadastradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
          ) : companies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma empresa cadastrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4" /> Usuários
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome_empresa}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.plano}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === "ativo" ? "default" : "secondary"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {memberCounts[c.id] || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nome da empresa</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: SOLUT GUARAPUAVA"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Será salvo como: {newName.trim().toUpperCase().replace(/\s+/g, " ") || "..."}
              </p>
            </div>
            <Button
              onClick={handleCreate}
              disabled={saving || newName.trim().length < 2}
              className="w-full"
            >
              {saving ? "Cadastrando..." : "Cadastrar empresa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
