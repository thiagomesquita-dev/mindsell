import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NewAnalysis from "../NewAnalysis";

// Mock auth
const mockAuth = {
  user: { id: "user-1" },
  profile: { id: "user-1", empresa_id: "emp-1", email: "t@t.com", nome: "T", onboarding_completed: true },
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

// Mock supabase
const mockInvoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => Promise.resolve({
              data: [
                { id: "op-1", nome: "João Silva", carteira: "QUALICORP", status: "ativo" },
                { id: "op-2", nome: "Maria Santos", carteira: "UNIMED", status: "ativo" },
              ],
              error: null,
            }),
          }),
        }),
      }),
    }),
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "https://example.com/audio.mp3" } }),
      }),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NewAnalysis />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("NewAnalysis", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the form with searchable operator select", () => {
    renderPage();
    expect(screen.getByText("Selecione um operador")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Cole o texto da conversa aqui...")).toBeInTheDocument();
    expect(screen.getByText("Analisar Negociação")).toBeInTheDocument();
  });

  it("shows read-only carteira field", () => {
    renderPage();
    expect(screen.getByPlaceholderText("Selecione um operador primeiro")).toBeInTheDocument();
    const carteiraInput = screen.getByPlaceholderText("Selecione um operador primeiro");
    expect(carteiraInput).toHaveAttribute("readonly");
  });

  it("submit button is disabled when required fields are empty", () => {
    renderPage();
    const btn = screen.getByText("Analisar Negociação");
    expect(btn).toBeDisabled();
  });
});
