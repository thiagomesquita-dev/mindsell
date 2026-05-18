import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  sessionId: string;
  status: string;
  supervisorOwnerId: string;
  initial: {
    supervisor_reviewed?: boolean | null;
    supervisor_feedback_applied?: boolean | null;
    supervisor_feedback_note?: string | null;
    supervisor_feedback_at?: string | null;
    supervisor_feedback_by?: string | null;
  };
}

function statusBadge(reviewed: boolean, applied: boolean) {
  if (reviewed && applied) return <Badge className="bg-success/20 text-success border-0 text-xs">Aplicado</Badge>;
  if (reviewed) return <Badge className="bg-warning/20 text-warning border-0 text-xs">Revisado</Badge>;
  return <Badge className="bg-muted text-muted-foreground border-0 text-xs">Pendente</Badge>;
}

export function SupervisorFeedbackBlock({ sessionId, status, supervisorOwnerId, initial }: Props) {
  const { user } = useAuth();
  const { isCoordination, isFounder } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [reviewed, setReviewed] = useState(!!initial.supervisor_reviewed);
  const [applied, setApplied] = useState(!!initial.supervisor_feedback_applied);
  const [note, setNote] = useState(initial.supervisor_feedback_note ?? "");
  const [authorName, setAuthorName] = useState<string | null>(null);

  useEffect(() => {
    setReviewed(!!initial.supervisor_reviewed);
    setApplied(!!initial.supervisor_feedback_applied);
    setNote(initial.supervisor_feedback_note ?? "");
  }, [initial.supervisor_reviewed, initial.supervisor_feedback_applied, initial.supervisor_feedback_note]);

  // Fetch author name when we have an id
  useEffect(() => {
    const authorId = initial.supervisor_feedback_by;
    if (!authorId) {
      setAuthorName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("profiles").select("nome,email").eq("id", authorId).maybeSingle();
      if (!cancelled && data) setAuthorName(data.nome || data.email || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [initial.supervisor_feedback_by]);

  const isResponded = status === "respondido";
  const canEdit = useMemo(() => {
    if (!user) return false;
    if (isFounder || isCoordination) return true;
    return user.id === supervisorOwnerId;
  }, [user, isFounder, isCoordination, supervisorOwnerId]);

  const handleApplied = (checked: boolean) => {
    setApplied(checked);
    if (checked) setReviewed(true); // aplicar implica revisar
  };
  const handleReviewed = (checked: boolean) => {
    setReviewed(checked);
    if (!checked) setApplied(false); // desmarcar revisão também desmarca aplicado
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (applied && !reviewed) throw new Error("Marque também a revisão antes de aplicar.");
      if (applied && note.trim().length === 0) throw new Error("Observação é obrigatória ao marcar como aplicado.");

      const payload = {
        supervisor_reviewed: reviewed,
        supervisor_feedback_applied: applied,
        supervisor_feedback_note: note.trim() || null,
        supervisor_feedback_at: reviewed || applied ? new Date().toISOString() : null,
        supervisor_feedback_by: reviewed || applied ? user!.id : null,
      };
      const { data, error } = await supabase
        .from("training_sessions")
        .update(payload)
        .eq("id", sessionId)
        .select(
          "id, supervisor_reviewed, supervisor_feedback_applied, supervisor_feedback_note, supervisor_feedback_at, supervisor_feedback_by",
        );
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Sem permissão para atualizar este treino ou registro não encontrado.");
      }
      return data[0];
    },
    onSuccess: () => {
      toast({ title: "Devolutiva salva", description: "Registro atualizado com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["training-detail", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["training-history"] });
    },
    onError: (err: Error) => {
      toast({ title: "Não foi possível salvar", description: err.message, variant: "destructive" });
    },
  });

  if (!isResponded) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-foreground">
            <ClipboardCheck className="h-4 w-4 text-primary" /> Devolutiva da Supervisão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">
            A devolutiva da supervisão estará disponível após o treino ser respondido.
          </p>
        </CardContent>
      </Card>
    );
  }

  const showSummary = !!initial.supervisor_feedback_at;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2 text-foreground">
            <ClipboardCheck className="h-4 w-4 text-primary" /> Devolutiva da Supervisão
          </CardTitle>
          {statusBadge(reviewed, applied)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Registre aqui se este treino já foi revisado pela supervisão e se a devolutiva já foi aplicada com o operador.
        </p>

        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={reviewed}
              onCheckedChange={(v) => handleReviewed(!!v)}
              disabled={!canEdit || mutation.isPending}
              className="mt-0.5"
            />
            <span className="text-foreground">Revisei a resposta do operador e o feedback do MindSell</span>
          </label>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={applied}
              onCheckedChange={(v) => handleApplied(!!v)}
              disabled={!canEdit || mutation.isPending}
              className="mt-0.5"
            />
            <span className="text-foreground">Apliquei esse feedback com o operador</span>
          </label>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            Observação da supervisão {applied && <span className="text-destructive">*</span>}
          </label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: alinhei com a operadora a necessidade de confirmar juros, parcelas e dados antes do envio do link."
            disabled={!canEdit || mutation.isPending}
            rows={3}
          />
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} size="sm">
              {mutation.isPending ? "Salvando..." : "Salvar devolutiva"}
            </Button>
          </div>
        )}

        {!canEdit && (
          <p className="text-xs text-muted-foreground italic">
            Você está visualizando este bloco em modo somente leitura.
          </p>
        )}

        {showSummary && (
          <div className="border-t border-border pt-3 text-xs text-muted-foreground space-y-0.5">
            <p>
              <span className="font-medium text-foreground">Registrado por:</span> {authorName ?? "—"}
            </p>
            <p>
              <span className="font-medium text-foreground">Em:</span>{" "}
              {initial.supervisor_feedback_at ? new Date(initial.supervisor_feedback_at).toLocaleString("pt-BR") : "—"}
            </p>
            <p className="flex items-center gap-2">
              <span className="font-medium text-foreground">Status da devolutiva:</span>{" "}
              {statusBadge(reviewed, applied)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
