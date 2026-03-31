import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "../AppSidebar";

const mockRoleState = {
  isCoordination: false,
  isFounder: false,
  isFounderEmail: false,
  isAdmin: false,
  isGestor: false,
  roles: [] as string[],
  isLoading: false,
};

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => mockRoleState,
}));

function renderSidebar() {
  return render(
    <TooltipProvider>
      <MemoryRouter>
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
        </SidebarProvider>
      </MemoryRouter>
    </TooltipProvider>
  );
}

describe("AppSidebar - Supervisão", () => {
  it("shows operational + intelligence menus but NOT team management or advanced modules", () => {
    mockRoleState.isCoordination = false;
    mockRoleState.isFounder = false;
    mockRoleState.isFounderEmail = false;

    renderSidebar();

    // Should see
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Nova Análise")).toBeInTheDocument();
    expect(screen.getByText("Histórico")).toBeInTheDocument();
    expect(screen.getByText("Ranking")).toBeInTheDocument();
    expect(screen.getByText("Evolução")).toBeInTheDocument();
    expect(screen.getByText("Operadores")).toBeInTheDocument();
    expect(screen.getByText("Radar da Operação")).toBeInTheDocument();
    expect(screen.getByText("Radar da Supervisão")).toBeInTheDocument();
    expect(screen.getByText("Comparação por Canal")).toBeInTheDocument();
    expect(screen.getByText("Relatórios")).toBeInTheDocument();
    expect(screen.getByText("Configurações")).toBeInTheDocument();

    // Should NOT see
    expect(screen.queryByText("Gestão da Equipe")).not.toBeInTheDocument();
    expect(screen.queryByText("Importação Financeira")).not.toBeInTheDocument();
    expect(screen.queryByText("Análise Financeira")).not.toBeInTheDocument();
    expect(screen.queryByText("Mapa de Objeções")).not.toBeInTheDocument();
    expect(screen.queryByText("Métricas IA")).not.toBeInTheDocument();
  });
});

describe("AppSidebar - Coordenação", () => {
  it("shows team management but NOT advanced modules", () => {
    mockRoleState.isCoordination = true;
    mockRoleState.isFounder = false;
    mockRoleState.isFounderEmail = false;

    renderSidebar();

    expect(screen.getByText("Gestão da Equipe")).toBeInTheDocument();
    expect(screen.getByText("Ranking")).toBeInTheDocument();

    expect(screen.queryByText("Importação Financeira")).not.toBeInTheDocument();
    expect(screen.queryByText("Análise Financeira")).not.toBeInTheDocument();
    expect(screen.queryByText("Mapa de Objeções")).not.toBeInTheDocument();
    expect(screen.queryByText("Métricas IA")).not.toBeInTheDocument();
  });
});

describe("AppSidebar - Founder", () => {
  it("shows all menus for founder email", () => {
    mockRoleState.isCoordination = true;
    mockRoleState.isFounder = true;
    mockRoleState.isFounderEmail = true;

    renderSidebar();

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Ranking")).toBeInTheDocument();
    expect(screen.getByText("Evolução")).toBeInTheDocument();
    expect(screen.getByText("Operadores")).toBeInTheDocument();
    expect(screen.getByText("Gestão da Equipe")).toBeInTheDocument();
    expect(screen.getByText("Importação Financeira")).toBeInTheDocument();
    expect(screen.getByText("Radar da Operação")).toBeInTheDocument();
    expect(screen.getByText("Análise Financeira")).toBeInTheDocument();
    expect(screen.getByText("Mapa de Objeções")).toBeInTheDocument();
    expect(screen.getByText("Radar da Supervisão")).toBeInTheDocument();
    expect(screen.getByText("Comparação por Canal")).toBeInTheDocument();
    expect(screen.getByText("Relatórios")).toBeInTheDocument();
    expect(screen.getByText("Métricas IA")).toBeInTheDocument();
    expect(screen.getByText("Configurações")).toBeInTheDocument();
  });
});
