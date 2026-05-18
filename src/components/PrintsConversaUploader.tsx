import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertCircle, ChevronUp, ChevronDown, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const MAX_PRINTS = 10;
const MAX_PRINT_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXT = /\.(jpe?g|png|webp)$/i;

interface PrintsConversaUploaderProps {
  empresaId: string;
  userId: string;
  /** Recebe a transcrição final + paths persistidos quando o usuário confirma a prévia */
  onConfirm: (payload: { finalTranscription: string; rawTranscription: string; imagePaths: string[] }) => void;
  /** Hook para limpar estado externo quando o usuário descarta tudo */
  onClear?: () => void;
  disabled?: boolean;
}

interface PrintItem {
  file: File;
  previewUrl: string;
}

export function PrintsConversaUploader({
  empresaId,
  userId,
  onConfirm,
  onClear,
  disabled,
}: PrintsConversaUploaderProps) {
  const [items, setItems] = useState<PrintItem[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rawTranscription, setRawTranscription] = useState("");
  const [editedTranscription, setEditedTranscription] = useState("");
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [partial, setPartial] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    const remaining = MAX_PRINTS - items.length;

    if (incoming.length > remaining) {
      toast.error(`Você pode enviar no máximo ${MAX_PRINTS} prints. Selecione até ${remaining}.`);
      e.currentTarget.value = "";
      return;
    }

    const next: PrintItem[] = [];
    for (const file of incoming) {
      const validType = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXT.test(file.name);
      if (!validType) {
        toast.error(`${file.name} não é uma imagem válida (use JPG, PNG ou WEBP).`);
        continue;
      }
      if (file.size > MAX_PRINT_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name} excede ${MAX_PRINT_SIZE_MB}MB.`);
        continue;
      }
      next.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    setItems((prev) => [...prev, ...next]);
    e.currentTarget.value = "";
  };

  const removeAt = (idx: number) => {
    setItems((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      const copy = [...prev];
      copy.splice(idx, 1);
      return copy;
    });
    setConfirmed(false);
  };

  const move = (idx: number, dir: -1 | 1) => {
    setItems((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
    setConfirmed(false);
  };

  const clearAll = () => {
    items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setItems([]);
    setUploadedPaths([]);
    setRawTranscription("");
    setEditedTranscription("");
    setConfirmed(false);
    onClear?.();
    if (inputRef.current) inputRef.current.value = "";
  };

  const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

  const uploadPrints = async (): Promise<string[]> => {
    const paths: string[] = [];
    for (const [i, item] of items.entries()) {
      const safeName = sanitizeName(item.file.name);
      // Path inclui user_id para isolamento por usuário (Storage RLS valida o 2º segmento)
      const path = `${empresaId}/${userId}/${Date.now()}_${i}_${safeName}`;
      const { error } = await supabase.storage.from("analysis-images").upload(path, item.file, {
        contentType: item.file.type || "image/jpeg",
        upsert: false,
      });
      if (error) {
        toast.error(`Falha ao enviar ${item.file.name}: ${error.message}`);
        continue;
      }
      paths.push(path);
    }
    return paths;
  };

  const handleExtract = async () => {
    if (items.length === 0) {
      toast.error("Adicione pelo menos 1 print.");
      return;
    }
    if (!empresaId) {
      toast.error("Empresa não configurada.");
      return;
    }

    setIsExtracting(true);
    try {
      const paths = await uploadPrints();
      if (paths.length === 0) {
        toast.error("Nenhum print foi enviado com sucesso.");
        setIsExtracting(false);
        return;
      }
      setUploadedPaths(paths);

      const { data, error } = await supabase.functions.invoke<{
        transcription?: string;
        partial?: boolean;
        empty?: boolean;
        message?: string;
        error?: string;
      }>("extrair-conversa-prints", {
        body: { image_paths: paths },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const text = (data?.transcription || "").trim();
      if (data?.empty || !text) {
        toast.warning(
          data?.message || "Não conseguimos extrair texto dos prints. Você pode digitar a conversa manualmente abaixo.",
        );
        setRawTranscription("");
        setEditedTranscription("");
      } else {
        setRawTranscription(text);
        setEditedTranscription(text);
        if (data.partial) {
          toast.info("Alguns prints não puderam ser lidos. Revise a prévia antes de analisar.");
        } else {
          toast.success("Conversa extraída! Revise a prévia antes de analisar.");
        }
      }
      setPartial(!!data?.partial);
      setPreviewOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Falha ao extrair conversa: ${msg}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleConfirmPreview = () => {
    const finalText = editedTranscription.trim();
    if (finalText.length < 20) {
      toast.error("A transcrição está muito curta. Edite ou reenvie prints melhores.");
      return;
    }
    setConfirmed(true);
    setPreviewOpen(false);
    onConfirm({
      finalTranscription: finalText,
      rawTranscription: rawTranscription,
      imagePaths: uploadedPaths,
    });
    toast.success("Transcrição pronta. Clique em 'Analisar negociação'.");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm text-muted-foreground">Prints da conversa</Label>
        <span
          className={cn(
            "text-xs tabular-nums",
            items.length >= MAX_PRINTS ? "text-destructive font-medium" : "text-muted-foreground",
          )}
        >
          {items.length}/{MAX_PRINTS} prints
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || items.length >= MAX_PRINTS || isExtracting}
        className={cn(
          "w-full border border-dashed bg-card p-8 flex flex-col items-center gap-3 transition-colors cursor-pointer rounded-xl",
          items.length >= MAX_PRINTS
            ? "border-muted cursor-not-allowed opacity-60"
            : "border-border hover:border-primary",
        )}
      >
        <ImagePlus className="h-8 w-8 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {items.length >= MAX_PRINTS ? "Limite de prints atingido" : "Clique para enviar prints (JPG, PNG, WEBP)"}
        </span>
      </button>

      <p className="text-xs text-muted-foreground mt-2">
        Envie até {MAX_PRINTS} prints, com no máximo {MAX_PRINT_SIZE_MB}MB cada. Use prints sequenciais e nítidos.
        Prints com baixa qualidade podem gerar extração incompleta.
      </p>

      {items.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((it, i) => (
            <div
              key={`${it.file.name}-${i}`}
              className="relative rounded-lg border border-border bg-card overflow-hidden group"
            >
              <img src={it.previewUrl} alt={`Print ${i + 1}`} className="w-full h-32 object-cover" />
              <div className="absolute top-1 left-1 bg-background/80 text-xs px-1.5 py-0.5 rounded">{i + 1}</div>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remover print"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="flex justify-between p-1 bg-muted/40">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="text-xs disabled:opacity-30 hover:text-primary"
                  aria-label="Mover para cima"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <span className="text-[10px] text-muted-foreground truncate max-w-[60%]">{it.file.name}</span>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  className="text-xs disabled:opacity-30 hover:text-primary"
                  aria-label="Mover para baixo"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <Button type="button" onClick={handleExtract} disabled={isExtracting || disabled} className="gap-2">
            {isExtracting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Extraindo conversa...
              </>
            ) : (
              "Extrair conversa"
            )}
          </Button>

          {confirmed && (
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
              Editar transcrição antes de analisar
            </Button>
          )}

          <button
            type="button"
            onClick={clearAll}
            className="ml-auto flex items-center gap-1.5 text-xs text-destructive hover:underline"
          >
            <Trash2 className="h-3 w-3" />
            Limpar prints
          </button>
        </div>
      )}

      {confirmed && (
        <div className="mt-3 text-xs text-primary flex items-start gap-1.5 bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Transcrição confirmada. Clique em <strong>Analisar negociação</strong> abaixo para seguir.
          </span>
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prévia da conversa extraída</DialogTitle>
            <DialogDescription>
              Revise e edite manualmente o texto antes de seguir. A análise usará exatamente o que estiver aqui.
              {partial && (
                <span className="block mt-1 text-amber-600 dark:text-amber-400">
                  Alguns prints não puderam ser lidos — complete os trechos faltantes manualmente.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={editedTranscription}
            onChange={(e) => setEditedTranscription(e.target.value)}
            placeholder={"OPERADOR: Olá, falo com...\nCLIENTE: ...\nOPERADOR: ..."}
            className="min-h-[280px] font-mono text-sm"
          />

          <p className="text-xs text-muted-foreground">
            Use o formato <code>OPERADOR:</code> e <code>CLIENTE:</code> no início de cada fala quando souber
            identificar.
          </p>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditedTranscription(rawTranscription)}
              disabled={!rawTranscription || rawTranscription === editedTranscription}
            >
              Restaurar extração original
            </Button>
            <Button type="button" onClick={handleConfirmPreview}>
              Confirmar transcrição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
