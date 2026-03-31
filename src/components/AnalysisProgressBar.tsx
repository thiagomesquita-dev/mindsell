import { useEffect, useState, useRef } from "react";
import { Progress } from "@/components/ui/progress";

const TEXT_STEPS = [
  "Preparando análise...",
  "Processando conversa...",
  "Aplicando análise AIDA...",
  "Gerando insights...",
  "Finalizando resultado...",
];

const AUDIO_STEPS = [
  "Enviando áudio...",
  "Transcrevendo ligação...",
  "Processando conversa...",
  "Aplicando análise AIDA...",
  "Gerando insights...",
  "Finalizando resultado...",
];

interface AnalysisProgressBarProps {
  isAnalyzing: boolean;
  isDone: boolean;
  hasAudio: boolean;
}

export function AnalysisProgressBar({ isAnalyzing, isDone, hasAudio }: AnalysisProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const steps = hasAudio ? AUDIO_STEPS : TEXT_STEPS;
  const supportMessage = hasAudio
    ? "A transcrição do áudio pode levar alguns instantes."
    : "Isso geralmente leva alguns segundos.";

  useEffect(() => {
    if (isDone) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setProgress(100);
      setStepIndex(steps.length - 1);
      return;
    }

    if (!isAnalyzing) {
      setProgress(0);
      setStepIndex(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Max progress before completion = 90%
    const maxProgress = 90;
    const totalSteps = steps.length;
    const progressPerStep = maxProgress / totalSteps;
    let currentProgress = 0;
    let currentStep = 0;

    // Advance every 2-4 seconds with slight randomness
    const baseInterval = hasAudio ? 3500 : 2500;

    intervalRef.current = setInterval(() => {
      if (currentStep < totalSteps - 1) {
        currentStep += 1;
        currentProgress = Math.min(progressPerStep * (currentStep + 0.5), maxProgress);
        setStepIndex(currentStep);
        setProgress(Math.round(currentProgress));
      } else {
        // Slow crawl near the end
        currentProgress = Math.min(currentProgress + 1, maxProgress);
        setProgress(Math.round(currentProgress));
      }
    }, baseInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAnalyzing, isDone, hasAudio, steps.length]);

  if (!isAnalyzing && !isDone) return null;

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <Progress value={progress} className="h-2.5" />
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{steps[stepIndex]}</p>
        <span className="text-xs text-muted-foreground tabular-nums">{progress}%</span>
      </div>
      <p className="text-xs text-muted-foreground">{supportMessage}</p>
    </div>
  );
}
