import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Onboarding from "../Onboarding";

// Mock auth
const mockUser = { id: "user-1" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock supabase
const mockRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function renderOnboarding() {
  return render(
    <MemoryRouter>
      <Onboarding />
    </MemoryRouter>
  );
}

describe("Onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the initial setup form", () => {
    renderOnboarding();
    expect(screen.getByText("Configuração Inicial")).toBeInTheDocument();
    expect(screen.getByText(/Crie sua empresa/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ex: Nacional Cobrança")).toBeInTheDocument();
  });

  it("shows the user will be Coordenador", () => {
    renderOnboarding();
    expect(screen.getByText(/Você será o Coordenador da empresa/)).toBeInTheDocument();
  });

  it("shows normalized company name preview", () => {
    renderOnboarding();
    const input = screen.getByPlaceholderText("Ex: Nacional Cobrança");
    fireEvent.change(input, { target: { value: "minha empresa" } });
    expect(screen.getByText(/MINHA EMPRESA/)).toBeInTheDocument();
  });

  it("requires company name to submit", () => {
    renderOnboarding();
    const input = screen.getByPlaceholderText("Ex: Nacional Cobrança");
    expect(input).toBeRequired();
  });

  it("calls complete_onboarding RPC on submit", async () => {
    mockRpc.mockResolvedValue({ error: null });

    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });

    renderOnboarding();

    const input = screen.getByPlaceholderText("Ex: Nacional Cobrança");
    fireEvent.change(input, { target: { value: "Nova Empresa" } });
    fireEvent.click(screen.getByRole("button", { name: /Criar empresa e entrar/ }));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("complete_onboarding", {
        _nome_empresa: "Nova Empresa",
      });
    });
  });

  it("should block joining an existing company by showing error from RPC", async () => {
    mockRpc.mockResolvedValue({
      error: { message: "Empresa já existe" },
    });

    renderOnboarding();

    const input = screen.getByPlaceholderText("Ex: Nacional Cobrança");
    fireEvent.change(input, { target: { value: "Empresa Existente" } });
    fireEvent.click(screen.getByRole("button", { name: /Criar empresa e entrar/ }));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("complete_onboarding", {
        _nome_empresa: "Empresa Existente",
      });
    });

    // Should NOT redirect — stays on onboarding
    const { toast } = await import("sonner");
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Empresa já existe"));
    });
  });
});
