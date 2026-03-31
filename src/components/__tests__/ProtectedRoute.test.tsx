import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProtectedRoute } from "../ProtectedRoute";

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useUserRole
const mockUseUserRole = vi.fn();
vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => mockUseUserRole(),
}));

// Capture Navigate renders
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
  };
});

function renderProtected() {
  return render(
    <MemoryRouter>
      <ProtectedRoute>
        <div data-testid="protected-content">Dashboard</div>
      </ProtectedRoute>
    </MemoryRouter>
  );
}

const defaultRoles = { roles: [] as string[], isAdmin: false, isGestor: false, isFounder: false, isCoordination: false, isLoading: false };

describe("ProtectedRoute", () => {
  it("shows loading spinner while auth is loading", () => {
    mockUseAuth.mockReturnValue({ session: null, profile: null, loading: true });
    mockUseUserRole.mockReturnValue({ ...defaultRoles, isLoading: false });
    renderProtected();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(screen.queryByTestId("navigate")).not.toBeInTheDocument();
  });

  it("shows loading spinner while roles are loading", () => {
    mockUseAuth.mockReturnValue({ session: { access_token: "t" }, profile: null, loading: false });
    mockUseUserRole.mockReturnValue({ ...defaultRoles, isLoading: true });
    renderProtected();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("redirects to /login when user is not authenticated", () => {
    mockUseAuth.mockReturnValue({ session: null, profile: null, loading: false });
    mockUseUserRole.mockReturnValue(defaultRoles);
    renderProtected();
    const nav = screen.getByTestId("navigate");
    expect(nav).toHaveAttribute("data-to", "/login");
  });

  it("redirects to /onboarding when onboarding is not completed for normal user", () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: "1", onboarding_completed: false },
      loading: false,
    });
    mockUseUserRole.mockReturnValue(defaultRoles);
    renderProtected();
    const nav = screen.getByTestId("navigate");
    expect(nav).toHaveAttribute("data-to", "/onboarding");
  });

  it("renders children for admin even without onboarding", () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: "1", onboarding_completed: false },
      loading: false,
    });
    mockUseUserRole.mockReturnValue({ ...defaultRoles, isAdmin: true });
    renderProtected();
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });

  it("renders children for founder even without onboarding", () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: "1", onboarding_completed: false },
      loading: false,
    });
    mockUseUserRole.mockReturnValue({ ...defaultRoles, isFounder: true });
    renderProtected();
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });

  it("renders children when authenticated and onboarding completed", () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: "1", onboarding_completed: true },
      loading: false,
    });
    mockUseUserRole.mockReturnValue(defaultRoles);
    renderProtected();
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });

  it("renders children when authenticated and profile is null (loading profile)", () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: null,
      loading: false,
    });
    mockUseUserRole.mockReturnValue(defaultRoles);
    renderProtected();
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });
});
