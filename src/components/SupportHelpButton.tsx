import { useState } from "react";
import { useLocation } from "react-router-dom";
import { LifeBuoy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/lib/errors";

const SUBJECT_TYPES = [
  { value: "duvida_uso", label: "Dúvida de uso" },
  { value: "problema_tecnico", label: "Problema técnico" },
  { value: "sugestao_melhoria", label: "Sugestão de melhoria" },
  { value: "falar_com_time", label: "Falar com o time" },
];

export function SupportHelpButton() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [subjectType, setSubjectType] = useState<string>("duvida_uso");
  const [message, setMessage] = useState("");
  const [wantsWhatsapp, setWantsWhatsapp] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setSubjectType("duvida_uso");
    setMessage("");
    setWantsWhatsapp(false);
    setWhatsapp("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Você precisa estar autenticado para enviar uma mensagem.");
      return;
    }
    if (message.trim().length < 5) {
      toast.error("Descreva sua mensagem com um pouco mais de detalhe.");
      return;
    }
    if (wantsWhatsapp && whatsapp.trim().length < 8) {
      toast.error("Informe um telefone/WhatsApp válido para retorno.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("support_messages").insert({
        origin: "app",
        user_id: user.id,
        empresa_id: profile?.empresa_id ?? null,
        user_name: profile?.nome ?? null,
        user_email: profile?.email ?? user.email ?? null,
        subject_type: subjectType,
        message: message.trim(),
        page_path: location.pathname + location.search,
        wants_whatsapp_contact: wantsWhatsapp,
        whatsapp_contact: wantsWhatsapp ? whatsapp.trim() : null,
        status: "novo",
      });
      if (error) throw error;
      toast.success("Mensagem enviada", {
        description: "Nosso time vai responder em breve.",
      });
      reset();
      setOpen(false);
    } catch (err) {
      toast.error("Não foi possível enviar", {
        description: getErrorMessage(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 z-40 h-12 rounded-full shadow-lg gap-2"
          aria-label="Abrir Ajuda e Suporte"
        >
          <LifeBuoy className="h-5 w-5" />
          <span className="hidden sm:inline">Ajuda e Suporte</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-primary" />
            Ajuda e Suporte
          </SheetTitle>
          <SheetDescription>
            Envie sua dúvida, problema ou sugestão. Quanto mais contexto, melhor.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 mt-4 overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label htmlFor="support-subject">Tipo do contato</Label>
            <Select value={subjectType} onValueChange={setSubjectType}>
              <SelectTrigger id="support-subject">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBJECT_TYPES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-message">Mensagem</Label>
            <Textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva sua dúvida, problema ou sugestão…"
              rows={6}
              maxLength={2000}
              required
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/2000
            </p>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="support-wants-whatsapp"
              checked={wantsWhatsapp}
              onCheckedChange={(v) => setWantsWhatsapp(v === true)}
            />
            <Label
              htmlFor="support-wants-whatsapp"
              className="text-sm font-normal leading-snug cursor-pointer"
            >
              Posso falar com você por WhatsApp?
            </Label>
          </div>

          {wantsWhatsapp && (
            <div className="space-y-2">
              <Label htmlFor="support-whatsapp">Telefone/WhatsApp para retorno</Label>
              <Input
                id="support-whatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(11) 99999-9999"
                maxLength={30}
              />
            </div>
          )}

          <div className="text-xs text-muted-foreground border rounded-md p-3 bg-muted/30">
            Enviado como <strong>{profile?.nome || profile?.email || user.email}</strong>
            {location.pathname && (
              <> · página: <code className="text-[11px]">{location.pathname}</code></>
            )}
          </div>

          <div className="mt-auto pt-2">
            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              <Send className="h-4 w-4" />
              {submitting ? "Enviando…" : "Enviar mensagem"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
