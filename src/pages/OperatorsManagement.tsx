import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, UserCheck, UserX, Users } from "lucide-react";

export default function OperatorsManagement() {
  const { profile } = useAuth();
  const { isCoordination } = useUserRole();
  const { getEmpresaFilter, isFounder } = useCompanyFilter();
  const empresaFilter = getEmpresaFilter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newCarteira, setNewCarteira] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterCarteira, setFilterCarteira] = useState("all");
  const [filterStatus, setFilterStatus] = useState("ativo");

  // Get company carteiras
  const { data: companyCarteiras = [] } = useQuery({
    queryKey: ["company-carteiras-operators", empresaFilter, isFounder, isCoordination],
    queryFn: async () => {
      if (isCoordination || isFounder) {
        let query = supabase
          .from("company_carteiras")
          .select("nome")
          .eq("status", "ativo")
          .order("nome");
        if (empresaFilter) {
          query = query.eq("empresa_id", empresaFilter);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data.map((c) => c.nome);
      } else {
        const { data, error } = await supabase
          .from("user_portfolios")
          .select("carteira")
          .eq("user_id", profile!.id);
        if (error) throw error;
        return data.map((p) => p.carteira);
      }
    },
    enabled: isFounder || (!!profile?.empresa_id && !!profile?.id),
  });

  // Get operators
  const { data: operators = [] } = useQuery({
    queryKey: ["company-operators", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("operators")
        .select("*")
        .order("nome");
      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  // Filter operators by user's portfolios, selected carteira, and status
  const filteredOperators = useMemo(() => {
    return operators.filter((op) => {
      const inScope = companyCarteiras.length === 0 || companyCarteiras.includes(op.carteira);
      const matchCarteira = filterCarteira === "all" || op.carteira === filterCarteira;
      const matchStatus = filterStatus === "all" || op.status === filterStatus;
      return inScope && matchCarteira && matchStatus;
    });
  }, [operators, companyCarteiras, filterCarteira, filterStatus]);

  // Available carteiras for dropdown
  const availableCarteiras = useMemo(() => {
    const set = new Set(operators.map((o) => o.carteira));
    companyCarteiras.forEach((c: string) => set.add(c));
    return Array.from(set).sort();
  }, [operators, companyCarteiras]);

  const handleCreate = async () => {
    if (!newNome.trim() || !newCarteira || !profile?.empresa_id) return;
    setSaving(true);
    const { error } = await supabase.from("operators").insert({
      empresa_id: profile.empresa_id,
      nome: newNome.trim(),
      carteira: newCarteira,
      created_by: profile.id,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Operador cadastrado!");
      setNewNome("");
      setNewCarteira("");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["company-operators"] });
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ativo" ? "inativo" : "ativo";
    const { error } = await supabase
      .from("operators")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Operador ${newStatus === "ativo" ? "ativado" : "desativado"}`);
      queryClient.invalidateQueries({ queryKey: ["company-operators"] });
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Operadores"
        description="Cadastre e gerencie os operadores vinculados às suas carteiras."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Lista de Operadores
          </CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={filterCarteira} onValueChange={setFilterCarteira}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Carteira" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {availableCarteiras.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Operador</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Cadastrar Operador</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Nome do operador</Label>
                    <Input
                      value={newNome}
                      onChange={(e) => setNewNome(e.target.value)}
                      placeholder="Ex: João Silva"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Carteira</Label>
                    <Select value={newCarteira} onValueChange={setNewCarteira}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {companyCarteiras.map((c: string) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreate} disabled={saving || !newNome.trim() || !newCarteira} className="w-full">
                    {saving ? "Salvando..." : "Cadastrar operador"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOperators.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum operador encontrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Carteira</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOperators.map((op) => (
                  <TableRow key={op.id} className={op.status === "inativo" ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{op.nome}</TableCell>
                    <TableCell><Badge variant="outline">{op.carteira}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={op.status === "ativo" ? "default" : "secondary"}>{op.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => toggleStatus(op.id, op.status)}>
                        {op.status === "ativo" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
