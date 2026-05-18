import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, Send } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errors";

const SUBJECT_TYPES = [
  { value: "tirar_duvida", label: "Tirar dúvida" },
  { value: "conhecer_produto", label: "Quero conhecer o MindSell" },
  { value: "suporte", label: "Suporte" },
  { value: "sugestao", label: "Sugestão" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PublicContactButton() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [subjectType, setSubjectType] = useState<string>("conhecer_produto");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // honeypot anti-spam (campo invisível, deve ficar vazio)
  const [website, setWebsite] = useState("");

  const reset = () => {
    setSubjectType("conhecer_produto");
    setName("");
    setEmail("");
    setWhatsapp("");
    setMessage("");
    setWebsite("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (website.trim() !== "") {
      // honeypot acionado: finge sucesso
      reset();
      setOpen(false);
      return;
    }
    if (name.trim().length < 2) {
      toast.error("Informe seu nome.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    if (message.trim().length < 5) {
      toast.error("Descreva sua mensagem com um pouco mais de detalhe.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("support_messages").insert({
        origin: "site",
        user_id: null,
        empresa_id: null,
        visitor_name: name.trim(),
        visitor_email: email.trim(),
        visitor_whatsapp: whatsapp.trim() || null,
        subject_type: subjectType,
        message: message.trim(),
        page_path: location.pathname + location.search,
        wants_whatsapp_contact: whatsapp.trim().length > 0,
        whatsapp_contact: whatsapp.trim() || null,
        status: "novo",
      });
      if (error) throw error;
      toast.success("Mensagem enviada", {
        description: "Vamos responder no e-mail informado em breve.",
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 z-40 h-12 rounded-full shadow-lg gap-2"
          aria-label="Abrir Fale com a gente"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Fale com a gente</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Fale com a gente
          </SheetTitle>
          <SheetDescription>
            Conte rapidinho como podemos ajudar — respondemos pelo e-mail informado.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 mt-4 overflow-y-auto pr-1">
          {/* Honeypot oculto */}
          <div aria-hidden="true" className="hidden">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-name">Nome</Label>
            <Input
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">E-mail</Label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-whatsapp">WhatsApp (opcional)</Label>
            <Input
              id="contact-whatsapp"
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(11) 99999-9999"
              maxLength={30}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-subject">Tipo do contato</Label>
            <Select value={subjectType} onValueChange={setSubjectType}>
              <SelectTrigger id="contact-subject">
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
            <Label htmlFor="contact-message">Mensagem</Label>
            <Textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Como podemos ajudar?"
              rows={5}
              maxLength={2000}
              required
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/2000
            </p>
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
