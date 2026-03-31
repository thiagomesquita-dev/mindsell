import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import PricingPage from "./pages/PricingPage";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { DateFilterProvider } from "@/contexts/DateFilterContext";
import { CompanyFilterProvider } from "@/contexts/CompanyFilterContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FounderRoute } from "@/components/FounderRoute";
import { CoordinationRoute } from "@/components/CoordinationRoute";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import NewAnalysis from "./pages/NewAnalysis";
import AnalysisResult from "./pages/AnalysisResult";
import AnalysisHistory from "./pages/AnalysisHistory";
import OperatorRanking from "./pages/OperatorRanking";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import AdminMetrics from "./pages/AdminMetrics";
import OperatorEvolution from "./pages/OperatorEvolution";
import OperationRadar from "./pages/OperationRadar";
import TeamManagement from "./pages/TeamManagement";
import OperatorsManagement from "./pages/OperatorsManagement";
import ChannelComparison from "./pages/ChannelComparison";
import FinancialImport from "./pages/FinancialImport";
import FinancialAnalysis from "./pages/FinancialAnalysis";
import ObjectionMap from "./pages/ObjectionMap";
import SupervisionGamification from "./pages/SupervisionGamification";
import PublicTraining from "./pages/PublicTraining";
import Methodology from "./pages/Methodology";
import TrainingHistory from "./pages/TrainingHistory";
import TrainingDetail from "./pages/TrainingDetail";
import PortfolioRules from "./pages/PortfolioRules";
import PortfolioRulesEdit from "./pages/PortfolioRulesEdit";
import CompaniesManagement from "./pages/CompaniesManagement";

const queryClient = new QueryClient();

function AuthShell() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

function ProtectedShell() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <CompanyFilterProvider>
          <DateFilterProvider>
            <AppLayout>
              <Outlet />
            </AppLayout>
          </DateFilterProvider>
        </CompanyFilterProvider>
      </ProtectedRoute>
    </AuthProvider>
  );
}

const isAppDomain = () => {
  const host = window.location.hostname;
  return host.startsWith("app.") || host === "localhost" || host.includes("lovable");
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Fully public route - never passes through auth guards */}
          <Route path="/treino/:token" element={<PublicTraining />} />
          {/* Landing page preview route (works on any domain) */}
          <Route path="/site" element={<LandingPage />} />
          <Route path="/planos" element={<PricingPage />} />

          {isAppDomain() ? (
            <>
              {/* Public auth routes */}
              <Route element={<AuthShell />}>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Navigate to="/login" replace />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/onboarding" element={<Onboarding />} />
              </Route>

              {/* Protected internal routes */}
              <Route element={<ProtectedShell />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/new-analysis" element={<NewAnalysis />} />
                <Route path="/analysis-result" element={<AnalysisResult />} />
                <Route path="/analysis-result/:id" element={<AnalysisResult />} />
                <Route path="/analysis-history" element={<AnalysisHistory />} />
                <Route path="/operator-ranking" element={<OperatorRanking />} />
                <Route path="/operator-evolution" element={<OperatorEvolution />} />
                <Route path="/operators" element={<OperatorsManagement />} />
                <Route path="/portfolio-rules" element={<PortfolioRules />} />
                <Route path="/portfolio-rules/:carteira" element={<PortfolioRulesEdit />} />
                <Route path="/operation-radar" element={<OperationRadar />} />
                <Route path="/supervision-gamification" element={<CoordinationRoute><SupervisionGamification /></CoordinationRoute>} />
                <Route path="/channel-comparison" element={<ChannelComparison />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/team" element={<CoordinationRoute><TeamManagement /></CoordinationRoute>} />
                <Route path="/financial-import" element={<FounderRoute><FinancialImport /></FounderRoute>} />
                <Route path="/financial-analysis" element={<FounderRoute><FinancialAnalysis /></FounderRoute>} />
                <Route path="/objection-map" element={<FounderRoute><ObjectionMap /></FounderRoute>} />
                <Route path="/companies" element={<FounderRoute><CompaniesManagement /></FounderRoute>} />
                <Route path="/admin/metrics" element={<FounderRoute><AdminMetrics /></FounderRoute>} />
                <Route path="/methodology" element={<Methodology />} />
                <Route path="/training-history" element={<TrainingHistory />} />
                <Route path="/training-detail/:id" element={<TrainingDetail />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </>
          ) : (
            <>
              {/* Institutional site routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/planos" element={<PricingPage />} />
              <Route path="*" element={<LandingPage />} />
            </>
          )}
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
