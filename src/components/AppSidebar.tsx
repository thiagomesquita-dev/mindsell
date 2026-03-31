import { LayoutDashboard, Plus, History, Trophy, BarChart3, Settings, TrendingUp, Radar, Users, UserCog, Cpu, GitCompareArrows, FileSpreadsheet, CircleDollarSign, MessageSquareWarning, Gamepad2, BookOpen, Dumbbell, ScrollText, Building2 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isCoordination, isFounder, isFounderEmail } = useUserRole();

  // Common items visible to ALL roles
  const operacaoBase: NavItem[] = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Nova Análise", url: "/new-analysis", icon: Plus },
    { title: "Histórico", url: "/analysis-history", icon: History },
    { title: "Ranking", url: "/operator-ranking", icon: Trophy },
    { title: "Evolução", url: "/operator-evolution", icon: TrendingUp },
    { title: "Treinamentos", url: "/training-history", icon: Dumbbell },
  ];

  const equipeBase: NavItem[] = [
    { title: "Operadores", url: "/operators", icon: UserCog },
    { title: "Regras da Carteira", url: "/portfolio-rules", icon: ScrollText },
  ];

  // Gestão da Equipe: coordination + founder only
  if (isCoordination || isFounderEmail) {
    equipeBase.push({ title: "Gestão da Equipe", url: "/team", icon: Users });
  }

  if (isFounderEmail) {
    equipeBase.push(
      { title: "Gestão de Empresas", url: "/companies", icon: Building2 },
      { title: "Importação Financeira", url: "/financial-import", icon: FileSpreadsheet },
    );
  }

  const inteligencia: NavItem[] = [
    { title: "Radar da Operação", url: "/operation-radar", icon: Radar },
  ];

  // Radar da Supervisão: coordination + founder only (supervisors cannot see it)
  if (isCoordination || isFounderEmail) {
    inteligencia.push({ title: "Radar da Supervisão", url: "/supervision-gamification", icon: Gamepad2 });
  }

  inteligencia.push(
    { title: "Comparação por Canal", url: "/channel-comparison", icon: GitCompareArrows },
    { title: "Relatórios", url: "/reports", icon: BarChart3 },
  );

  // Founder-only advanced modules
  if (isFounderEmail) {
    inteligencia.push(
      { title: "Análise Financeira", url: "/financial-analysis", icon: CircleDollarSign },
      { title: "Mapa de Objeções", url: "/objection-map", icon: MessageSquareWarning },
    );
  }

  const sections: NavSection[] = [
    { label: "OPERAÇÃO", items: operacaoBase },
    { label: "EQUIPE", items: equipeBase },
    { label: "INTELIGÊNCIA", items: inteligencia },
    { label: "SISTEMA", items: [
      { title: "Como Avaliamos", url: "/methodology", icon: BookOpen },
      { title: "Configurações", url: "/settings", icon: Settings },
    ] },
  ];

  // IA section: founder role only
  if (isFounder || isFounderEmail) {
    sections.push({
      label: "IA",
      items: [
        { title: "Métricas IA", url: "/admin/metrics", icon: Cpu },
      ],
    });
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="px-4 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            {!collapsed && (
              <h1 className="font-heading text-xl font-bold text-sidebar-foreground tracking-tight">
                CobraMind
              </h1>
            )}
          </div>
        </div>
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-4">
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors rounded-lg"
                        activeClassName="text-sidebar-foreground bg-sidebar-accent font-semibold"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
