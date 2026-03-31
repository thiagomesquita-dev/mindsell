import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Briefcase, UserCheck, UserX, Eye, EyeOff, Pencil, ShieldCheck, Building2, Trash2, Link2 } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";

interface CarteiraFinancial {
  id: string;
  nome: string;
  comissao_recebida_periodo: number | null;
  quantidade_pagamentos_periodo: number | null;
  periodo_referencia: string | null;
}

/* ─── Carteiras Management ─── */

function CarteirasSection() {
  const { profile } = useAuth();
  const { getEmpresaFilter, isFounder } = useCompanyFilter();
  const empresaFilter = getEmpresaFilter();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCarteira, setEditingCarteira] = useState<CarteiraFinancial | null>(null);
  const [editComissao, setEditComissao] = useState("");
  const [editQtdPagamentos, setEditQtdPagamentos] = useState("");
  const [editPeriodo, setEditPeriodo] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const { data: carteiras = [] } = useQuery({
    queryKey: ["company-carteiras", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("company_carteiras")
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

  const handleCreate = async () => {
    if (!newName.trim() || !profile?.empresa_id) return;
    setSaving(true);
    const { error } = await supabase.from("company_carteiras").insert({
      empresa_id: profile.empresa_id,
      nome: newName.trim().toUpperCase(),
      created_by: profile.id,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Carteira já existe" : error.message);
    } else {
      toast.success("Carteira criada!");
      setNewName("");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["company-carteiras"] });
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ativo" ? "inativo" : "ativo";
    const { error } = await supabase
      .from("company_carteiras")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ["company-carteiras"] });
  };

  const openEdit = (c: Record<string, unknown>) => {
    const carteira = c as unknown as CarteiraFinancial;
    setEditingCarteira(carteira);
    setEditComissao(carteira.comissao_recebida_periodo?.toString() || "");
    setEditQtdPagamentos(carteira.quantidade_pagamentos_periodo?.toString() || "");
    setEditPeriodo(carteira.periodo_referencia || "");
  };

  const handleEditSave = async () => {
    if (!editingCarteira) return;
    setEditSaving(true);
    const { error } = await supabase
      .from("company_carteiras")
      .update({
        comissao_recebida_periodo: editComissao ? Number(editComissao) : null,
        quantidade_pagamentos_periodo: editQtdPagamentos ? Number(editQtdPagamentos) : null,
        periodo_referencia: editPeriodo || null,
      } as Record<string, unknown>)
      .eq("id", editingCarteira.id);
    setEditSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Métricas financeiras atualizadas!");
      setEditingCarteira(null);
      queryClient.invalidateQueries({ queryKey: ["company-carteiras"] });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-heading flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" /> Carteiras
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Carteira</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Carteira</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Nome da carteira</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: QUALICORP"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">Será salvo como: {newName.trim().toUpperCase() || "..."}</p>
              </div>
              <Button onClick={handleCreate} disabled={saving || !newName.trim()} className="w-full">
                {saving ? "Criando..." : "Criar carteira"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {carteiras.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma carteira cadastrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carteiras.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "ativo" ? "default" : "secondary"}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)} title="Editar métricas financeiras">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleStatus(c.id, c.status)}>
                      {c.status === "ativo" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Financial Metrics Dialog */}
      <Dialog open={!!editingCarteira} onOpenChange={(open) => !open && setEditingCarteira(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Métricas Financeiras — {editingCarteira?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Período de referência</Label>
              <Input
                value={editPeriodo}
                onChange={(e) => setEditPeriodo(e.target.value)}
                placeholder="Ex: Mar/2026"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Comissão recebida no período (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editComissao}
                onChange={(e) => setEditComissao(e.target.value)}
                placeholder="0,00"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Quantidade de pagamentos no período</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={editQtdPagamentos}
                onChange={(e) => setEditQtdPagamentos(e.target.value)}
                placeholder="0"
                className="mt-1.5"
              />
            </div>
            {editComissao && editQtdPagamentos && Number(editQtdPagamentos) > 0 && (
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-sm text-muted-foreground">Ticket médio calculado:</p>
                <p className="text-lg font-heading font-bold text-foreground">
                  R$ {(Number(editComissao) / Number(editQtdPagamentos)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}
            <Button onClick={handleEditSave} disabled={editSaving} className="w-full">
              {editSaving ? "Salvando..." : "Salvar métricas"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ─── Create Supervisor Dialog ─── */

function CreateSupervisorDialog({
  open,
  onOpenChange,
  carteiras,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  carteiras: { id: string; nome: string; status: string }[];
}) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCarteiras, setSelectedCarteiras] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const activeCarteiras = carteiras.filter((c) => c.status === "ativo");

  const toggleCarteira = (nome: string) => {
    setSelectedCarteiras((prev) =>
      prev.includes(nome) ? prev.filter((x) => x !== nome) : [...prev, nome]
    );
  };

  const resetForm = () => {
    setNome("");
    setEmail("");
    setSenha("");
    setSelectedCarteiras([]);
    setShowPassword(false);
  };

  const handleCreate = async () => {
    if (!nome.trim() || !email.trim() || !senha || selectedCarteiras.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        email: email.trim(),
        senha,
        carteiras: selectedCarteiras,
      };
      console.log("[criar-supervisor] Enviando payload:", { ...payload, senha: "***" });

      const { data, error } = await supabase.functions.invoke("criar-supervisor", {
        body: payload,
      });

      // supabase.functions.invoke returns error for non-2xx responses
      // The actual message may be inside error.context or data
      if (error) {
        // Try to extract the structured error from the response
        let friendlyMessage = "Erro ao criar supervisor";
        try {
          // For FunctionsHttpError, the response body is in error.context
          if (error.context && typeof error.context === "object" && "json" in error.context) {
            const body = await (error.context as Response).json();
            friendlyMessage = body?.message || friendlyMessage;
          } else if (typeof error.message === "string" && error.message !== "Edge Function returned a non-2xx status code") {
            friendlyMessage = error.message;
          }
        } catch {
          // fallback to generic message
        }
        throw new Error(friendlyMessage);
      }

      if (data?.success === false) {
        throw new Error(data.message || "Erro ao criar supervisor");
      }

      // Show appropriate toast based on email status
      if (data?.email_sent) {
        toast.success("Supervisor cadastrado! E-mail de boas-vindas enviado.");
      } else if (data?.email_error) {
        toast.success("Supervisor cadastrado com sucesso!");
        toast.error(`E-mail de confirmação falhou: ${data.email_error}`);
        console.warn("[criar-supervisor] Email error:", data.email_error);
      } else {
        toast.success("Supervisor cadastrado com sucesso!");
      }
      resetForm();
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["company-supervisors"] });
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      console.error("[criar-supervisor] Erro:", msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar Supervisor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Nome completo *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do supervisor"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>E-mail *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="supervisor@empresa.com"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Senha inicial *</Label>
            <div className="relative mt-1.5">
              <Input
                type={showPassword ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              O supervisor poderá alterar a senha após o primeiro login.
            </p>
          </div>
          <div>
            <Label>Carteiras supervisionadas *</Label>
            {activeCarteiras.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">
                Cadastre carteiras primeiro na seção acima.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {activeCarteiras.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedCarteiras.includes(c.nome)}
                      onCheckedChange={() => toggleCarteira(c.nome)}
                    />
                    <span className="text-sm text-foreground">{c.nome}</span>
                  </label>
                ))}
              </div>
            )}
            {selectedCarteiras.length === 0 && (
              <p className="text-xs text-destructive mt-1">Selecione ao menos uma carteira</p>
            )}
          </div>
          <Button
            onClick={handleCreate}
            disabled={saving || !nome.trim() || !email.trim() || senha.length < 6 || selectedCarteiras.length === 0}
            className="w-full"
          >
            {saving ? "Cadastrando..." : "Cadastrar supervisor"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Supervisors Management ─── */

function SupervisorsSection({ onManageMemberships }: { onManageMemberships?: (user: { id: string; nome: string; email: string }) => void }) {
  const { profile } = useAuth();
  const { isAdmin, isFounder: isFounderRole } = useUserRole();
  const { getEmpresaFilter, isFounder } = useCompanyFilter();
  const empresaFilter = getEmpresaFilter();
  const showEmpresa = isAdmin || isFounderRole;
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: carteiras = [] } = useQuery({
    queryKey: ["company-carteiras", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("company_carteiras")
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

  const { data: supervisors = [] } = useQuery({
    queryKey: ["company-supervisors", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, nome, email, status, companies:empresa_id(nome_empresa)")
        .order("nome");
      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data.filter((p) => p.id !== profile!.id);
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  const { data: rolesMap = {} } = useQuery({
    queryKey: ["company-roles", empresaFilter, isFounder],
    queryFn: async () => {
      const userIds = supervisors.map((s) => s.id);
      if (userIds.length === 0) return {};
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      data.forEach((r) => { map[r.user_id] = r.role; });
      return map;
    },
    enabled: supervisors.length > 0,
  });

  const { data: portfoliosMap = {} } = useQuery({
    queryKey: ["company-user-portfolios", empresaFilter, isFounder],
    queryFn: async () => {
      const userIds = supervisors.map((s) => s.id);
      if (userIds.length === 0) return {};
      const { data, error } = await supabase
        .from("user_portfolios")
        .select("user_id, carteira")
        .in("user_id", userIds);
      if (error) throw error;
      const map: Record<string, string[]> = {};
      data.forEach((r) => {
        if (!map[r.user_id]) map[r.user_id] = [];
        map[r.user_id].push(r.carteira);
      });
      return map;
    },
    enabled: supervisors.length > 0,
  });

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ativo" ? "inativo" : "ativo";
    const { error } = await supabase
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Usuário ${newStatus === "ativo" ? "ativado" : "desativado"}`);
      queryClient.invalidateQueries({ queryKey: ["company-supervisors"] });
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Coordenação";
      case "gestor": return "Coordenação";
      case "supervisor": return "Supervisão";
      default: return role;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-heading flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> Supervisores
        </CardTitle>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Supervisor
        </Button>
      </CardHeader>
      <CardContent>
        {supervisors.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum supervisor cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                {showEmpresa && <TableHead>Empresa</TableHead>}
                <TableHead>Nível</TableHead>
                <TableHead>Carteiras</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supervisors.map((s) => (
                <TableRow key={s.id} className={s.status === "inativo" ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{s.nome || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email}</TableCell>
                  {showEmpresa && (
                    <TableCell className="text-muted-foreground">
                      {(s as any).companies?.nome_empresa || "—"}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline">{roleLabel(rolesMap[s.id] || "supervisor")}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(portfoliosMap[s.id] || []).map((c) => (
                        <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                      {(!portfoliosMap[s.id] || portfoliosMap[s.id].length === 0) && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.status === "ativo" ? "default" : "secondary"}>{s.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-1">
                    {onManageMemberships && (
                      <Button variant="ghost" size="sm" onClick={() => onManageMemberships({ id: s.id, nome: s.nome || "", email: s.email })} title="Gerenciar vínculos">
                        <Building2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => toggleStatus(s.id, s.status)}>
                      {s.status === "ativo" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CreateSupervisorDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        carteiras={carteiras}
      />
    </Card>
  );
}

/* ─── Create Gestor Dialog (Founder only) ─── */

function CreateGestorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { companies } = useCompanyFilter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [empresaId, setEmpresaId] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setNome("");
    setEmail("");
    setSenha("");
    setEmpresaId("");
    setShowPassword(false);
  };

  const handleCreate = async () => {
    if (!nome.trim() || !email.trim() || !senha || !empresaId) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("cadastrar-gestor", {
        body: { nome: nome.trim(), email: email.trim(), senha, empresa_id: empresaId, role: "gestor" },
      });

      if (error) {
        let msg = "Erro ao cadastrar gestor";
        try {
          if (error.context && typeof error.context === "object" && "json" in error.context) {
            const body = await (error.context as Response).json();
            msg = body?.message || msg;
          }
        } catch { /* fallback */ }
        throw new Error(msg);
      }

      if (data?.success === false) throw new Error(data.message || "Erro ao cadastrar gestor");

      if (data?.email_sent) {
        toast.success(`Gestor cadastrado! E-mail enviado para ${email.trim()}.`);
      } else {
        toast.success("Gestor cadastrado com sucesso!");
        if (data?.email_error) toast.error(`E-mail não enviado: ${data.email_error}`);
      }
      resetForm();
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["company-supervisors"] });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar Gestor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Nome completo *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do gestor" className="mt-1.5" />
          </div>
          <div>
            <Label>E-mail *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="gestor@empresa.com" className="mt-1.5" />
          </div>
          <div>
            <Label>Senha inicial *</Label>
            <div className="relative mt-1.5">
              <Input type={showPassword ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
              <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div>
            <Label>Empresa *</Label>
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome_empresa}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={saving || !nome.trim() || !email.trim() || senha.length < 6 || !empresaId} className="w-full">
            {saving ? "Cadastrando..." : "Cadastrar gestor"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── User Membership Management Dialog ─── */

function UserMembershipsDialog({
  user,
  onClose,
}: {
  user: { id: string; nome: string; email: string } | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [addCompanyId, setAddCompanyId] = useState("");
  const [addRole, setAddRole] = useState<string>("supervisor");
  const [saving, setSaving] = useState(false);

  // Fetch ALL active companies directly (not from CompanyFilter context)
  const { data: allCompanies = [] } = useQuery({
    queryKey: ["all-companies-for-membership"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, nome_empresa")
        .eq("status", "ativo")
        .order("nome_empresa");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ["user-memberships-detail", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("company_memberships")
        .select("id, company_id, role, is_active, companies:company_id(nome_empresa)")
        .eq("user_id", user.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const linkedCompanyIds = memberships.map((m: any) => m.company_id);
  const availableCompanies = allCompanies.filter((c: { id: string; nome_empresa: string }) => !linkedCompanyIds.includes(c.id));

  const handleAdd = async () => {
    if (!user?.id || !addCompanyId || !addRole) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("company_memberships").insert({
        user_id: user.id,
        company_id: addCompanyId,
        role: addRole as any,
      });
      if (error) throw error;
      toast.success("Vínculo adicionado!");
      setAddCompanyId("");
      setAddRole("supervisor");
      queryClient.invalidateQueries({ queryKey: ["user-memberships-detail", user.id] });
      queryClient.invalidateQueries({ queryKey: ["company-member-counts"] });
      queryClient.invalidateQueries({ queryKey: ["all-companies-management"] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (membershipId: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("company_memberships")
      .delete()
      .eq("id", membershipId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Vínculo removido.");
      queryClient.invalidateQueries({ queryKey: ["user-memberships-detail", user.id] });
      queryClient.invalidateQueries({ queryKey: ["company-member-counts"] });
    }
  };

  const handleRoleChange = async (membershipId: string, newRole: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("company_memberships")
      .update({ role: newRole as any })
      .eq("id", membershipId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Papel atualizado.");
      queryClient.invalidateQueries({ queryKey: ["user-memberships-detail", user.id] });
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Admin";
      case "gestor": return "Coordenação";
      case "supervisor": return "Supervisão";
      case "founder": return "Founder";
      default: return role;
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Vínculos — {user?.nome || user?.email}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum vínculo encontrado.</p>
          ) : (
            <div className="space-y-2">
              {memberships.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{m.companies?.nome_empresa || "—"}</span>
                    <span className="text-muted-foreground">—</span>
                    <Select value={m.role} onValueChange={(val) => handleRoleChange(m.id, val)}>
                      <SelectTrigger className="h-7 w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supervisor">Supervisão</SelectItem>
                        <SelectItem value="gestor">Coordenação</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(m.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-sm font-medium">Adicionar vínculo</p>
            <div className="flex gap-2">
              <Select value={addCompanyId} onValueChange={setAddCompanyId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  {availableCompanies.length === 0 ? (
                    <SelectItem value="__none" disabled>Nenhuma empresa disponível</SelectItem>
                  ) : (
                    availableCompanies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_empresa}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supervisor">Supervisão</SelectItem>
                  <SelectItem value="gestor">Coordenação</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAdd}
              disabled={saving || !addCompanyId}
              className="w-full"
              size="sm"
            >
              <Link2 className="h-4 w-4 mr-1" />
              {saving ? "Salvando..." : "Vincular"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Page ─── */

export default function TeamManagement() {
  const { isFounder } = useCompanyFilter();
  const [gestorDialogOpen, setGestorDialogOpen] = useState(false);
  const [membershipUser, setMembershipUser] = useState<{ id: string; nome: string; email: string } | null>(null);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gestão da Equipe"
        description="Gerencie carteiras e cadastre supervisores da sua operação."
      >
        {isFounder && (
          <Button onClick={() => setGestorDialogOpen(true)} variant="outline" size="sm">
            <ShieldCheck className="h-4 w-4 mr-1" /> Cadastrar Gestor
          </Button>
        )}
      </PageHeader>
      <CarteirasSection />
      <SupervisorsSection onManageMemberships={isFounder ? setMembershipUser : undefined} />
      {isFounder && <CreateGestorDialog open={gestorDialogOpen} onOpenChange={setGestorDialogOpen} />}
      {isFounder && (
        <UserMembershipsDialog user={membershipUser} onClose={() => setMembershipUser(null)} />
      )}
    </div>
  );
}
