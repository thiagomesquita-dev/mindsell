/**
 * Centralized plan-based permissions matrix.
 * 
 * Maps each commercial plan to the set of modules (routes) available.
 * Founder-only modules are handled separately.
 */

export type PlanCode = "essencial" | "professional" | "performance" | "enterprise" | "free";

/** Module identifiers used across sidebar, guides, and route guards */
export type ModuleId =
  | "dashboard"
  | "new-analysis"
  | "analysis-history"
  | "operator-ranking"
  | "operator-evolution"
  | "training-history"
  | "operators"
  | "portfolio-rules"
  | "team"
  | "operation-radar"
  | "supervision-gamification"
  | "channel-comparison"
  | "reports"
  | "guide"
  | "methodology"
  | "settings";

/** Modules that are ONLY for the founder email, never for any commercial plan */
export const FOUNDER_ONLY_MODULES = [
  "admin-metrics",
  "admin-ai-config",
  "admin-blog",
  "admin-blog-categories",
  "admin-blog-authors",
  "admin-blog-media",
  "financial-import",
  "financial-analysis",
  "objection-map",
  "companies",
] as const;

export type FounderModuleId = (typeof FOUNDER_ONLY_MODULES)[number];

/** Base modules available to ALL plans */
const BASE_MODULES: ModuleId[] = [
  "dashboard",
  "new-analysis",
  "analysis-history",
  "operator-ranking",
  "operators",
  "portfolio-rules",
  "guide",
  "methodology",
  "settings",
];

const PLAN_MODULES: Record<PlanCode, ModuleId[]> = {
  free: [...BASE_MODULES],

  essencial: [
    ...BASE_MODULES,
    "team",
    "reports",
  ],

  professional: [
    ...BASE_MODULES,
    "team",
    "reports",
    "operator-evolution",
    "training-history",
    "operation-radar",
  ],

  performance: [
    ...BASE_MODULES,
    "team",
    "reports",
    "operator-evolution",
    "training-history",
    "operation-radar",
    "supervision-gamification",
  ],

  enterprise: [
    ...BASE_MODULES,
    "team",
    "reports",
    "operator-evolution",
    "training-history",
    "operation-radar",
    "supervision-gamification",
    "channel-comparison",
  ],
};

/** Check if a module is available for a given plan */
export function isModuleAvailable(plan: PlanCode, moduleId: ModuleId): boolean {
  return (PLAN_MODULES[plan] ?? PLAN_MODULES.free).includes(moduleId);
}

/** Get all modules available for a plan */
export function getAvailableModules(plan: PlanCode): ModuleId[] {
  return PLAN_MODULES[plan] ?? PLAN_MODULES.free;
}

/** All possible client-facing modules (union of all plans) for educational display */
export function getAllClientModules(): ModuleId[] {
  return [
    "dashboard",
    "new-analysis",
    "analysis-history",
    "operator-ranking",
    "operator-evolution",
    "training-history",
    "operators",
    "portfolio-rules",
    "team",
    "operation-radar",
    "supervision-gamification",
    "channel-comparison",
    "reports",
    "guide",
    "methodology",
    "settings",
  ];
}

/** Map route paths to module IDs */
export function routeToModuleId(path: string): ModuleId | FounderModuleId | null {
  const map: Record<string, ModuleId | FounderModuleId> = {
    "/": "dashboard",
    "/new-analysis": "new-analysis",
    "/analysis-history": "analysis-history",
    "/analysis-result": "analysis-history",
    "/operator-ranking": "operator-ranking",
    "/operator-evolution": "operator-evolution",
    "/training-history": "training-history",
    "/training-detail": "training-history",
    "/operators": "operators",
    "/portfolio-rules": "portfolio-rules",
    "/team": "team",
    "/operation-radar": "operation-radar",
    "/supervision-gamification": "supervision-gamification",
    "/channel-comparison": "channel-comparison",
    "/reports": "reports",
    "/guide": "guide",
    "/methodology": "methodology",
    "/settings": "settings",
    "/admin/metrics": "admin-metrics",
    "/admin/ai-config": "admin-ai-config",
    "/admin/blog": "admin-blog",
    "/admin/blog/categories": "admin-blog-categories",
    "/admin/blog/authors": "admin-blog-authors",
    "/admin/blog/media": "admin-blog-media",
    "/financial-import": "financial-import",
    "/financial-analysis": "financial-analysis",
    "/objection-map": "objection-map",
    "/companies": "companies",
  };
  return map[path] ?? null;
}

/** Normalize company plan string to PlanCode */
export function normalizePlan(raw: string | null | undefined): PlanCode {
  if (!raw) return "free";
  const lower = raw.toLowerCase().trim();
  if (lower === "essencial") return "essencial";
  if (lower === "professional" || lower === "profissional") return "professional";
  if (lower === "performance") return "performance";
  if (lower === "enterprise" || lower === "empresarial") return "enterprise";
  return "free";
}
