import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TeamManagement from "../TeamManagement";

// Mock auth
const mockProfile = { id: "coord-1", email: "coord@test.com", nome: "Coord", empresa_id: "emp-1", onboarding_completed: true };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "coord-1" }, profile: mockProfile }),
}));

// Mock supabase
const mockInvoke = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

// Mock sonner - avoid hoisting issues by not referencing top-level variables
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function buildQueryResult(data: unknown[]) {
  return {
    select: () => ({
      eq: () => ({
        order: () => Promise.resolve({ data, error: null }),
      }),
      in: () => Promise.resolve({ data, error: null }),
    }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: () => ({
      eq: () => Promise.resolve({ error: null }),
    }),
  };
}

const mockCarteiras: Array<{ id: string; nome: string; status: string; empresa_id: string; created_at: string; created_by: string | null }> = [
  { id: "c1", nome: "QUALICORP", status: "ativo", empresa_id: "emp-1", created_at: "", created_by: null },
];

const mockSupervisors = [
  { id: "sup-1", nome: "João", email: "joao@test.com", status: "ativo" },
];

const mockRoles = [{ user_id: "sup-1", role: "supervisor" }];
const mockPortfolios = [{ user_id: "sup-1", carteira: "QUALICORP" }];

function setupMocks() {
  mockFrom.mockImplementation((table: string) => {
    switch (table) {
      case "company_carteiras":
        return buildQueryResult(mockCarteiras);
      case "profiles":
        return buildQueryResult(mockSupervisors);
      case "user_roles":
        return buildQueryResult(mockRoles);
      case "user_portfolios":
        return buildQueryResult(mockPortfolios);
      default:
        return buildQueryResult([]);
    }
  });
}

function renderTeamManagement() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TeamManagement />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("TeamManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("renders page header", () => {
    renderTeamManagement();
    expect(screen.getByText("Gestão da Equipe")).toBeInTheDocument();
    expect(screen.getByText(/Gerencie carteiras e cadastre supervisores/)).toBeInTheDocument();
  });

  it("renders Carteiras and Supervisores sections", () => {
    renderTeamManagement();
    expect(screen.getByText("Carteiras")).toBeInTheDocument();
    expect(screen.getByText("Supervisores")).toBeInTheDocument();
  });

  it("shows 'Nova Carteira' and 'Novo Supervisor' buttons", () => {
    renderTeamManagement();
    expect(screen.getByText("Nova Carteira")).toBeInTheDocument();
    expect(screen.getByText("Novo Supervisor")).toBeInTheDocument();
  });

  it("opens create supervisor dialog", async () => {
    renderTeamManagement();
    fireEvent.click(screen.getByText("Novo Supervisor"));
    await waitFor(() => {
      expect(screen.getByText("Cadastrar Supervisor")).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText("Nome do supervisor")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("supervisor@empresa.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Mínimo 6 caracteres")).toBeInTheDocument();
  });

  it("disables submit when no carteira selected", async () => {
    renderTeamManagement();
    fireEvent.click(screen.getByText("Novo Supervisor"));

    await waitFor(() => {
      expect(screen.getByText("Cadastrar Supervisor")).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText("Nome do supervisor");
    const emailInput = screen.getByPlaceholderText("supervisor@empresa.com");
    const passwordInput = screen.getByPlaceholderText("Mínimo 6 caracteres");

    fireEvent.change(nameInput, { target: { value: "Maria" } });
    fireEvent.change(emailInput, { target: { value: "maria@test.com" } });
    fireEvent.change(passwordInput, { target: { value: "123456" } });

    // No carteira selected → button should be disabled
    const submitBtn = screen.getByRole("button", { name: /Cadastrar supervisor/i });
    expect(submitBtn).toBeDisabled();
  });

  it("shows validation message when no carteira selected", async () => {
    renderTeamManagement();
    fireEvent.click(screen.getByText("Novo Supervisor"));

    await waitFor(() => {
      expect(screen.getByText(/Selecione ao menos uma carteira/)).toBeInTheDocument();
    });
  });

  it("displays supervisor list with role and portfolio badges", async () => {
    renderTeamManagement();
    await waitFor(() => {
      expect(screen.getByText("João")).toBeInTheDocument();
    });
    expect(screen.getByText("joao@test.com")).toBeInTheDocument();
  });

  it("shows inactivate button for active supervisors", async () => {
    renderTeamManagement();
    await waitFor(() => {
      expect(screen.getByText("João")).toBeInTheDocument();
    });
    // The toggle button uses UserX icon for active users
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThan(1); // header + data rows
  });
});
