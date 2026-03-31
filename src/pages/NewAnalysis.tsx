import { useState, useRef, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Upload, CheckCircle, ChevronsUpDown, Check, AlertCircle } from "lucide-react";
import { AnalysisProgressBar } from "@/components/AnalysisProgressBar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import { preprocessAudio, type AudioDebugInfo } from "@/lib/audioPreprocessor";

const FOUNDER_EMAIL = "thiago@thiagoanalytics.com.br";

const AI_MODELS = [
  { value: "openai", label: "OpenAI (GPT-4.1)" },
  { value: "gemini", label: "Gemini" },
  { value: "claude", label: "Claude Sonnet" },
  { value: "opus", label: "Claude Opus" },
];

interface Operator {
  id: string;
  nome: string;
  carteira: string;
  status: string;
}

interface AnalyzeResponse {
  id?: string;
  error?: string;
  result?: {
    id?: string;
  };
}

const MAX_AUDIO_SIZE_MB = 10;

function WaveformAnimation() {
  return (
    <div className="flex items-center justify-center gap-1 h-5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="w-1 bg-primary-foreground waveform-bar"
          style={{ height: "20px", animationDelay: `${i * 0.1}s`, transformOrigin: "center" }}
        />
      ))}
    </div>
  );
}

export default function NewAnalysis() {
  const [selectedOperatorId, setSelectedOperatorId] = useState("");
  const [channel, setChannel] = useState("");
  const [aiProvider, setAiProvider] = useState("openai");
  
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const isFounder = user?.email === FOUNDER_EMAIL;

  const { data: operators = [] } = useQuery<Operator[]>({
    queryKey: ["operators-for-analysis", profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];

      const { data, error } = await supabase
        .from("operators")
        .select("id, nome, carteira, status")
        .eq("empresa_id", profile.empresa_id)
        .eq("status", "ativo")
        .order("nome");

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.empresa_id,
  });

  const selectedOperator = useMemo(
    () => operators.find((op) => op.id === selectedOperatorId),
    [operators, selectedOperatorId]
  );

  const carteira = selectedOperator?.carteira ?? "";
  const hasNoCarteira = !!selectedOperator && !selectedOperator.carteira;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);

    const validFiles = selectedFiles.filter((file) => {
      const isMp3 =
        file.type === "audio/mpeg" ||
        file.name.toLowerCase().endsWith(".mp3");

      const isWithinSize = file.size <= MAX_AUDIO_SIZE_MB * 1024 * 1024;

      if (!isMp3) {
        toast.error(`${file.name} não é um arquivo MP3 válido.`);
        return false;
      }

      if (!isWithinSize) {
        toast.error(`${file.name} excede o limite de ${MAX_AUDIO_SIZE_MB}MB.`);
        return false;
      }

      return true;
    });

    setFiles(validFiles);
    e.currentTarget.value = "";
  };

  const uploadAudios = async (): Promise<{ paths: string[]; debugInfos: AudioDebugInfo[] }> => {
    const paths: string[] = [];
    const debugInfos: AudioDebugInfo[] = [];

    if (!profile?.empresa_id) {
      toast.error("Empresa não configurada. Não foi possível enviar áudios.");
      return { paths, debugInfos };
    }

    for (const [idx, file] of files.entries()) {
      try {
        // Preprocess: decode → mono → normalize → resample 16kHz → WAV
        toast.info(`Pré-processando ${file.name}...`);
        const { blob: wavBlob, debugInfo } = await preprocessAudio(file);
        debugInfos.push(debugInfo);

        const empresaId = profile.empresa_id;
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.mp3$/i, ".wav");
        const path = `${empresaId}/${Date.now()}_${idx}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("audios")
          .upload(path, wavBlob, { contentType: "audio/wav", upsert: false });

        if (uploadError) {
          toast.error(`Erro ao enviar ${file.name}: ${uploadError.message}`);
          continue;
        }

        paths.push(path);
      } catch (err: unknown) {
        toast.error(`Erro ao processar ${file.name}: ${getErrorMessage(err)}`);
      }
    }

    return { paths, debugInfos };
  };

  const handleAnalyze = async () => {
    if (!user) {
      toast.error("Usuário não autenticado.");
      return;
    }

    if (!profile?.empresa_id) {
      toast.error("Configure sua empresa nas configurações antes de criar análises.");
      return;
    }

    if (!selectedOperator) {
      toast.error("Selecione um operador.");
      return;
    }

    if (!selectedOperator.carteira) {
      toast.error("Operador sem carteira vinculada. Atualize o cadastro antes de continuar.");
      return;
    }

    if (!channel) {
      toast.error("Selecione o canal de negociação.");
      return;
    }

    if (!text.trim() && files.length === 0) {
      toast.error("Envie o texto da conversa ou arquivos de áudio para análise.");
      return;
    }

    setIsAnalyzing(true);

    try {
      let audioUrls: string[] = [];
      let audioDebug: AudioDebugInfo[] = [];

      if (files.length > 0) {
        const result = await uploadAudios();
        audioUrls = result.paths;
        audioDebug = result.debugInfos;
      }

      const { data, error } = await supabase.functions.invoke<AnalyzeResponse>(
        "analisar-negociacao",
        {
          body: {
            operador: selectedOperator.nome,
            carteira: selectedOperator.carteira,
            canal: channel,
            transcricao: text.trim(),
            audio_urls: audioUrls,
            audio_debug: audioDebug.length > 0 ? audioDebug : undefined,
            provider: isFounder ? aiProvider : undefined,
          },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const resultId = data?.id ?? data?.result?.id;
      if (!resultId) {
        throw new Error("Resultado da análise sem id.");
      }

      setIsDone(true);
      toast.success("Análise concluída com sucesso!");

      setTimeout(() => {
        navigate(`/analysis-result/${resultId}`);
      }, 800);
    } catch (err: unknown) {
      toast.error("Erro ao analisar: " + getErrorMessage(err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const canSubmit =
    !!selectedOperatorId &&
    !!carteira &&
    !!channel &&
    !hasNoCarteira &&
    (!!text.trim() || files.length > 0);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Nova Análise" description="Envie uma negociação para análise por IA" />

      <div className="space-y-6">
        <div className={cn("grid grid-cols-1 gap-6", isFounder ? "md:grid-cols-4" : "md:grid-cols-3")}>
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Operador</Label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="w-full justify-between bg-card border-border font-normal"
                >
                  {selectedOperator ? selectedOperator.nome : "Selecione um operador"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-card border-border">
                <Command>
                  <CommandInput placeholder="Buscar operador..." />
                  <CommandList>
                    <CommandEmpty>Nenhum operador encontrado.</CommandEmpty>
                    <CommandGroup>
                      {operators.map((op) => (
                        <CommandItem
                          key={op.id}
                          value={op.nome}
                          onSelect={() => {
                            setSelectedOperatorId(op.id === selectedOperatorId ? "" : op.id);
                            setComboOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedOperatorId === op.id ? "opacity-100" : "opacity-0")} />
                          <span>{op.nome}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{op.carteira}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Carteira vinculada ao operador</Label>
            <Input
              value={carteira}
              readOnly
              placeholder="Selecione um operador primeiro"
              className="bg-muted border-border cursor-default"
            />
            {hasNoCarteira && (
              <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Este operador não possui carteira vinculada. Atualize o cadastro antes de continuar.
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Canal</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Selecione o canal" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="call">Ligação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isFounder && (
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Modelo de IA</Label>
              <Select value={aiProvider} onValueChange={setAiProvider}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {AI_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">Texto da Conversa</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cole o texto da conversa aqui..."
            className="bg-card border-border min-h-[200px] font-body text-sm"
          />
        </div>

        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">Arquivos de Áudio (MP3)</Label>
          <input
            ref={fileRef}
            type="file"
            accept=".mp3,audio/mpeg"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border border-dashed border-border bg-card p-8 flex flex-col items-center gap-3 hover:border-primary transition-colors cursor-pointer rounded-xl"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Clique para enviar arquivos MP3</span>
          </button>

          {files.length > 0 && (
            <div className="mt-3 space-y-1">
              {files.map((f, i) => (
                <p key={`${f.name}-${i}`} className="text-xs text-muted-foreground">
                  {f.name}
                </p>
              ))}
            </div>
          )}
        </div>

        <AnalysisProgressBar
          isAnalyzing={isAnalyzing}
          isDone={isDone}
          hasAudio={files.length > 0}
        />

        <Button
          onClick={handleAnalyze}
          disabled={!canSubmit || isAnalyzing}
          className="w-full h-14 text-base font-heading font-semibold rounded-xl"
        >
          {isDone ? (
            <CheckCircle className="h-6 w-6" />
          ) : isAnalyzing ? (
            <WaveformAnimation />
          ) : (
            "Analisar Negociação"
          )}
        </Button>
      </div>
    </div>
  );
}