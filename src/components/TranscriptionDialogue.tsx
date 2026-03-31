import { useMemo } from "react";
import { AlertTriangle, XCircle, CheckCircle, Headphones, User, Clock } from "lucide-react";

// ─── Types ───

export interface TranscriptionMarker {
  tipo: "objecao" | "falha" | "boa_pratica";
  timestamp?: string;
  trecho?: string;
  motivo?: string;
}

interface AudioBlock {
  kind: "audio";
  timestamp?: string;
  text: string;
  speaker?: "operador" | "cliente" | "desconhecido";
  marker?: TranscriptionMarker;
}

interface Props {
  transcricao: string;
  marcacoes?: TranscriptionMarker[];
  audioRefs?: React.RefObject<HTMLAudioElement[]>;
  operadorName?: string;
  canal: string;
}

// ─── Helpers ───

const TIMESTAMP_REGEX = /^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*$/;
const DIALOGUE_PREFIX_REGEX = /^(OPERADOR|CLIENTE|FALANTE NÃO IDENTIFICADO)\s*:\s*(.+)$/i;

function isAudioCanal(canal?: string): boolean {
  if (!canal) return true;
  const lower = canal.toLowerCase();
  return lower.includes("audio") || lower.includes("áudio") || lower === "telefone" || lower === "ligação" || lower === "ligacao";
}

function isValidMarker(m: TranscriptionMarker): boolean {
  return Boolean(m.trecho && m.trecho.trim().length > 0);
}

function findMarker(text: string, marcacoes: TranscriptionMarker[]): TranscriptionMarker | undefined {
  return marcacoes.find(
    (m) => m.trecho && text.toLowerCase().includes(m.trecho.toLowerCase())
  );
}

// ─── Audio parser: supports structured OPERADOR/CLIENTE dialogue ───

function parseAudioTranscription(text: string, marcacoes: TranscriptionMarker[]): AudioBlock[] {
  const blocks: AudioBlock[] = [];
  const rawLines = text.split("\n").filter((l) => l.trim());

  let pendingTimestamp: string | undefined;

  for (const raw of rawLines) {
    const trimmed = raw.trim();

    const tsMatch = TIMESTAMP_REGEX.exec(trimmed);
    if (tsMatch) {
      pendingTimestamp = tsMatch[1];
      continue;
    }

    // Check for structured dialogue format (OPERADOR: ... / CLIENTE: ...)
    const dialogueMatch = DIALOGUE_PREFIX_REGEX.exec(trimmed);
    let lineText: string;
    let speaker: "operador" | "cliente" | "desconhecido" | undefined;

    if (dialogueMatch) {
      const role = dialogueMatch[1].toUpperCase();
      lineText = dialogueMatch[2].trim();
      speaker = role === "OPERADOR" ? "operador" : role === "CLIENTE" ? "cliente" : "desconhecido";
    } else {
      lineText = trimmed;
    }

    const marker = findMarker(lineText, marcacoes);

    blocks.push({
      kind: "audio",
      timestamp: pendingTimestamp,
      text: lineText,
      speaker,
      marker,
    });

    pendingTimestamp = undefined;
  }

  return blocks;
}

// ─── Shared ───

function parseTimestampToSeconds(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

const MARKER_CONFIG = {
  objecao: {
    icon: AlertTriangle,
    label: "Objeção identificada",
    className: "bg-warning/15 border-warning text-warning",
  },
  falha: {
    icon: XCircle,
    label: "Falha de negociação",
    className: "bg-destructive/15 border-destructive text-destructive",
  },
  boa_pratica: {
    icon: CheckCircle,
    label: "Boa prática",
    className: "bg-success/15 border-success text-success",
  },
};


// ─── Component ───

export function TranscriptionDialogue({ transcricao, marcacoes = [], audioRefs, operadorName, canal }: Props) {
  const isAudio = isAudioCanal(canal);

  const filteredMarcacoes = useMemo(
    () => marcacoes.filter((m) => (m.tipo as string) !== "fechamento_perdido"),
    [marcacoes]
  );

  const audioLines = useMemo(() => {
    if (!isAudio) return [];
    return parseAudioTranscription(transcricao, filteredMarcacoes);
  }, [transcricao, filteredMarcacoes, isAudio]);

  const handleTimestampClick = (timestamp: string) => {
    const seconds = parseTimestampToSeconds(timestamp);
    const audios = audioRefs?.current;
    if (audios && audios.length > 0) {
      const audio = audios[0];
      audio.currentTime = seconds;
      audio.play();
    }
  };

  if (!transcricao || !transcricao.trim()) {
    return <p className="text-sm text-muted-foreground italic">Transcrição não disponível.</p>;
  }

  // ── Text channel: preserve original formatting ──
  if (!isAudio) {
    return <PlainTextTranscription transcricao={transcricao} marcacoes={filteredMarcacoes} />;
  }

  // ── Audio channel: rich dialogue with markers ──
  if (audioLines.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Transcrição não disponível.</p>;
  }

  return (
    <div className="space-y-1">
      {audioLines.map((line, i) => {
        const markerConfig = line.marker ? MARKER_CONFIG[line.marker.tipo] : null;

        const showMarkerBanner = line.marker && markerConfig;
        const MarkerIcon = markerConfig?.icon;

        return (
          <div key={i}>
            {showMarkerBanner && markerConfig && MarkerIcon && (
              <div className={`px-3 py-1.5 rounded-lg border mb-1 ${markerConfig.className}`}>
                <div className="flex items-center gap-2">
                  <MarkerIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs font-semibold font-heading">
                    {markerConfig.label}
                  </span>
                  {line.marker?.timestamp && (
                    <button
                      onClick={() => handleTimestampClick(line.marker!.timestamp!)}
                      className="text-xs font-mono underline cursor-pointer hover:opacity-70 transition-opacity ml-auto"
                    >
                      {line.marker!.timestamp}
                    </button>
                  )}
                </div>
                {line.marker?.motivo && (
                  <p className="text-[11px] mt-0.5 opacity-85 font-body leading-snug">
                    {line.marker.tipo === "falha" ? "Motivo: " : line.marker.tipo === "objecao" ? "Tipo: " : ""}{line.marker.motivo}
                  </p>
                )}
              </div>
            )}
            {/* Render as speaker bubble if identified, otherwise neutral */}
            {line.speaker ? (
              <SpeakerBubble line={line} onTimestampClick={handleTimestampClick} />
            ) : (
              <NeutralBubble line={line} onTimestampClick={handleTimestampClick} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Speaker bubble: OPERADOR right / CLIENTE left ───

function SpeakerBubble({ line, onTimestampClick }: { line: AudioBlock; onTimestampClick: (ts: string) => void }) {
  const isOperador = line.speaker === "operador";

  return (
    <div className={`flex ${isOperador ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
          isOperador
            ? "bg-primary/10 border border-primary/20 rounded-br-sm"
            : "bg-secondary border border-border rounded-bl-sm"
        }`}
      >
        <p className={`text-[10px] font-heading font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1 ${
          isOperador ? "text-primary" : "text-muted-foreground"
        }`}>
          {isOperador ? (
            <><Headphones className="h-3 w-3" /> Operador</>
          ) : line.speaker === "desconhecido" ? (
            <><User className="h-3 w-3" /> Falante</>
          ) : (
            <><User className="h-3 w-3" /> Cliente</>
          )}
          {line.timestamp && (
            <button
              onClick={() => onTimestampClick(line.timestamp!)}
              className="text-[10px] font-mono text-muted-foreground ml-2 hover:text-primary transition-colors cursor-pointer"
            >
              [{line.timestamp}]
            </button>
          )}
        </p>
        <p className="text-sm text-foreground font-body leading-relaxed">{line.text}</p>
      </div>
    </div>
  );
}

// ─── Neutral bubble: no speaker identified ───

function NeutralBubble({ line, onTimestampClick }: { line: AudioBlock; onTimestampClick: (ts: string) => void }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-xl px-4 py-2.5 bg-secondary border border-border">
        {line.timestamp && (
          <button
            onClick={() => onTimestampClick(line.timestamp!)}
            className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 mb-0.5 hover:text-primary transition-colors cursor-pointer"
          >
            <Clock className="h-3 w-3" />
            [{line.timestamp}]
          </button>
        )}
        <p className="text-sm text-foreground font-body leading-relaxed">{line.text}</p>
      </div>
    </div>
  );
}

// ─── Plain text view for pasted conversations (WhatsApp / Agendor) ───

const HIGHLIGHT_OPERATOR_REGEX = /\b(atendente|operador|atendimento|agente|cobrador|consultor|negociador|assessor|suporte|cobrança|cobranca)\b/i;
const HIGHLIGHT_PHONE_REGEX = /[\s+\d\(\)\-]{7,}/;

function classifyLine(line: string): "operador" | "cliente" | null {
  if (HIGHLIGHT_OPERATOR_REGEX.test(line)) return "operador";
  if (HIGHLIGHT_PHONE_REGEX.test(line)) return "cliente";
  return null;
}

function PlainTextTranscription({ transcricao, marcacoes }: { transcricao: string; marcacoes: TranscriptionMarker[] }) {
  const lines = transcricao.split("\n");
  const filtered = marcacoes.filter((m) => (m.tipo as string) !== "fechamento_perdido");

  return (
    <div className="rounded-xl border border-border bg-secondary/50 p-4 space-y-0.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        const kind = classifyLine(trimmed);
        const marker = findMarker(trimmed, filtered);
        const markerConfig = marker ? MARKER_CONFIG[marker.tipo] : null;
        const showBanner = marker && markerConfig;
        const MarkerIcon = markerConfig?.icon;

        return (
          <div key={i}>
            {showBanner && markerConfig && MarkerIcon && (
              <div className={`px-3 py-1 rounded-lg border mb-0.5 ${markerConfig.className}`}>
                <div className="flex items-center gap-2">
                  <MarkerIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs font-semibold font-heading">
                    {markerConfig.label}
                  </span>
                </div>
                {marker?.motivo && (
                  <p className="text-[11px] mt-0.5 opacity-85 font-body leading-snug">
                    {marker.tipo === "falha" ? "Motivo: " : marker.tipo === "objecao" ? "Tipo: " : ""}{marker.motivo}
                  </p>
                )}
              </div>
            )}
            <p
              className={`py-0.5 px-2 rounded font-body ${
                kind === "operador"
                  ? "bg-primary/8 border-l-2 border-primary text-foreground"
                  : kind === "cliente"
                  ? "bg-accent/40 border-l-2 border-muted-foreground/40 text-foreground"
                  : "text-foreground"
              }`}
            >
              {trimmed}
            </p>
          </div>
        );
      })}
    </div>
  );
}
