import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";
import AnalysisResult from "../AnalysisResult";

const mockAnalysis: Tables<"analyses"> = {
  id: "analysis-1",
  operador: "Maria",
  carteira: "Crediffato",
  canal: "whatsapp",
  resumo: "Negociação com boa abertura mas sem fechamento.",
  erro_principal: "Não realizou o fechamento presumido.",
  mensagem_ideal: "Posso gerar o boleto agora para garantir esse desconto?",
  conformidade: "Parcialmente Conforme",
  justificativa_conformidade: "Faltou informar o nome completo da empresa.",
  score: 72,
  nota_qa: 68,
  chance_pagamento: 55,
  risco_quebra: 40,
  nivel_habilidade: "Intermediário",
  tecnica_usada: "Rapport",
  tom_operador: "Empático",
  objecao: "Não tenho dinheiro agora",
  pontos_fortes: ["Boa abertura", "Tom empático"],
  pontos_melhorar: ["Faltou fechamento"],
  sugestoes: ["Usar fechamento presumido"],
  aida_atencao: { nota: 8, comentario: "Abertura humanizada e clara." },
  aida_interesse: { nota: 6, comentario: "Apresentou valor mas sem ancoragem." },
  aida_desejo: { nota: 5, comentario: "Tratou objeção parcialmente." },
  aida_objecao: { nota: 4, comentario: "Reconheceu a objeção mas não reformulou." },
  aida_acao: { nota: 3, comentario: "Não realizou fechamento." },
  feedback_diagnostico: "Principal problema: falta de fechamento.",
  feedback_orientacao: "Orientar operador sobre fechamento presumido.",
  feedback_exercicio: "Simular 5 fechamentos diferentes.",
  feedback_exemplo: "Posso gerar o boleto agora para garantir esse desconto?",
  transcricao: "Operador: Olá, tudo bem?",
  audio_urls: [],
  categoria_objecao: "SEM DINHEIRO",
  categoria_erro: "SEM FECHAMENTO",
  created_at: "2026-03-10T12:00:00Z",
  user_id: "u1",
  empresa_id: "e1",
  tokens_prompt: null,
  tokens_resposta: null,
  tokens_total: null,
  custo_estimado: null,
  tempo_resposta: null,
  duracao_audio_total: null,
  modelo_usado: null,
  marcacoes_transcricao: [],
  oportunidades_fechamento_perdidas: 0, // legacy field
  intencao_cliente: null,
  capacidade_percebida: null,
  firmeza_compromisso: null,
};

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: mockAnalysis, error: null }),
        }),
      }),
    }),
  },
}));

function renderWithRouter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <TooltipProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/analysis-result/analysis-1"]}>
          <Routes>
            <Route path="/analysis-result/:id" element={<AnalysisResult />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </TooltipProvider>
  );
}

describe("AnalysisResult", () => {
  it("renders key analysis fields", async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/Negociação com boa abertura/)).toBeInTheDocument();
    });

    // Erro principal
    expect(screen.getByText(/Não realizou o fechamento presumido/)).toBeInTheDocument();

    // Mensagem ideal (appears in both "Mensagem Ideal" and "Exemplo de Abordagem")
    const matches = screen.getAllByText(/Posso gerar o boleto agora/);
    expect(matches.length).toBeGreaterThanOrEqual(1);

    // Conformidade
    expect(screen.getByText("Parcialmente Conforme")).toBeInTheDocument();

    // Justificativa
    expect(screen.getByText(/Faltou informar o nome completo/)).toBeInTheDocument();

    // Score
    expect(screen.getByText("72")).toBeInTheDocument();

    // AIDA sections
    expect(screen.getByText("ATENÇÃO")).toBeInTheDocument();
    expect(screen.getByText("INTERESSE")).toBeInTheDocument();
    expect(screen.getByText("DESEJO")).toBeInTheDocument();
    expect(screen.getByText("AÇÃO")).toBeInTheDocument();
    expect(screen.getByText(/Abertura humanizada e clara/)).toBeInTheDocument();
  });

  it("renders operator info in header", async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/Maria/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Crediffato/)).toBeInTheDocument();
  });
});
