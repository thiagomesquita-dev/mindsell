import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalDateFilter } from "@/components/GlobalDateFilter";
import { CompanyFilter } from "@/components/CompanyFilter";
import { useLocation } from "react-router-dom";

const HIDE_DATE_FILTER_ROUTES = ["/operator-evolution", "/supervision-gamification", "/portfolio-rules"];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const showDateFilter = !HIDE_DATE_FILTER_ROUTES.some(r => pathname === r || pathname.startsWith(r + "/"));

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b border-border px-4 shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex items-center gap-4">
              <CompanyFilter />
              {showDateFilter && <GlobalDateFilter />}
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
