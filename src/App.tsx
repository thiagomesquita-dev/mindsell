import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import GoogleAnalytics from "./components/GoogleAnalytics";
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
import { PlanRoute } from "@/components/PlanRoute";
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
import AIModelConfig from "./pages/AIModelConfig";
import GuidePage from "./pages/GuidePage";
import BlogPosts from "./pages/admin/BlogPosts";
import BlogPostEditor from "./pages/admin/BlogPostEditor";
import BlogCategories from "./pages/admin/BlogCategories";
import BlogAuthors from "./pages/admin/BlogAuthors";
import BlogMediaLibrary from "./pages/admin/BlogMediaLibrary";
import BlogList from "./pages/blog/BlogList";
import BlogPost from "./pages/blog/BlogPost";
import TermsOfUse from "./pages/institutional/TermsOfUse";
import PrivacyPolicy from "./pages/institutional/PrivacyPolicy";
import CancellationRefund from "./pages/institutional/CancellationRefund";
import ContactPage from "./pages/institutional/ContactPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

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
  if (host === "mindsell.ia.br" || host === "www.mindsell.ia.br") {
    return false;
  }
  return host.startsWith("app.") || host === "localhost" || host.includes("lovable");
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <GoogleAnalytics />
        <Routes>
          {/* Fully public route - never passes through auth guards */}
          <Route path="/treino/:token" element={<PublicTraining />} />
          {/* Landing page preview route (works on any domain) */}
          <Route path="/site" element={<LandingPage />} />
          <Route path="/planos" element={<PricingPage />} />
          <Route path="/termos-de-uso" element={<TermsOfUse />} />
          <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
          <Route path="/cancelamento-e-reembolso" element={<CancellationRefund />} />
          <Route path="/contato" element={<ContactPage />} />

          {isAppDomain() ? (
            <>
              {/* Public auth routes */}
              <Route element={<AuthShell />}>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Navigate to="/login" replace />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              </Route>
              {/* Public onboarding (post-checkout, no auth required) */}
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Protected internal routes */}
              <Route element={<ProtectedShell />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/new-analysis" element={<PlanRoute moduleId="new-analysis"><NewAnalysis /></PlanRoute>} />
                <Route path="/analysis-result" element={<PlanRoute moduleId="analysis-history"><AnalysisResult /></PlanRoute>} />
                <Route path="/analysis-result/:id" element={<PlanRoute moduleId="analysis-history"><AnalysisResult /></PlanRoute>} />
                <Route path="/analysis-history" element={<PlanRoute moduleId="analysis-history"><AnalysisHistory /></PlanRoute>} />
                <Route path="/operator-ranking" element={<PlanRoute moduleId="operator-ranking"><OperatorRanking /></PlanRoute>} />
                <Route path="/operator-evolution" element={<PlanRoute moduleId="operator-evolution"><OperatorEvolution /></PlanRoute>} />
                <Route path="/operators" element={<PlanRoute moduleId="operators"><OperatorsManagement /></PlanRoute>} />
                <Route path="/portfolio-rules" element={<PlanRoute moduleId="portfolio-rules"><PortfolioRules /></PlanRoute>} />
                <Route path="/portfolio-rules/:carteira" element={<PlanRoute moduleId="portfolio-rules"><PortfolioRulesEdit /></PlanRoute>} />
                <Route path="/operation-radar" element={<PlanRoute moduleId="operation-radar"><OperationRadar /></PlanRoute>} />
                <Route path="/supervision-gamification" element={<PlanRoute moduleId="supervision-gamification"><CoordinationRoute><SupervisionGamification /></CoordinationRoute></PlanRoute>} />
                <Route path="/channel-comparison" element={<PlanRoute moduleId="channel-comparison"><ChannelComparison /></PlanRoute>} />
                <Route path="/reports" element={<PlanRoute moduleId="reports"><Reports /></PlanRoute>} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/team" element={<PlanRoute moduleId="team"><CoordinationRoute><TeamManagement /></CoordinationRoute></PlanRoute>} />
                <Route path="/training-history" element={<PlanRoute moduleId="training-history"><TrainingHistory /></PlanRoute>} />
                <Route path="/training-detail/:id" element={<PlanRoute moduleId="training-history"><TrainingDetail /></PlanRoute>} />

                {/* Founder-only routes */}
                <Route path="/financial-import" element={<FounderRoute><FinancialImport /></FounderRoute>} />
                <Route path="/financial-analysis" element={<FounderRoute><FinancialAnalysis /></FounderRoute>} />
                <Route path="/objection-map" element={<FounderRoute><ObjectionMap /></FounderRoute>} />
                <Route path="/companies" element={<FounderRoute><CompaniesManagement /></FounderRoute>} />
                <Route path="/admin/metrics" element={<FounderRoute><AdminMetrics /></FounderRoute>} />
                <Route path="/admin/ai-config" element={<FounderRoute><AIModelConfig /></FounderRoute>} />
                <Route path="/admin/blog" element={<FounderRoute><BlogPosts /></FounderRoute>} />
                <Route path="/admin/blog/new" element={<FounderRoute><BlogPostEditor /></FounderRoute>} />
                <Route path="/admin/blog/edit/:id" element={<FounderRoute><BlogPostEditor /></FounderRoute>} />
                <Route path="/admin/blog/categories" element={<FounderRoute><BlogCategories /></FounderRoute>} />
                <Route path="/admin/blog/authors" element={<FounderRoute><BlogAuthors /></FounderRoute>} />
                <Route path="/admin/blog/media" element={<FounderRoute><BlogMediaLibrary /></FounderRoute>} />

                <Route path="/guide" element={<GuidePage />} />
                <Route path="/methodology" element={<Methodology />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </>
          ) : (
            <>
              {/* Institutional site routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/planos" element={<PricingPage />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/blog" element={<BlogList />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/termos-de-uso" element={<TermsOfUse />} />
              <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
              <Route path="/cancelamento-e-reembolso" element={<CancellationRefund />} />
              <Route path="/contato" element={<ContactPage />} />
              <Route path="*" element={<LandingPage />} />
            </>
          )}
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
