/**
 * Default plan catalogue. Plans are stored in the database (table `Plan`) and
 * can be edited by admins; these values are used for seeding and as a
 * fallback. Limits of -1 mean "unlimited".
 */
export const PLAN_CODES = ["FREE", "BASIC", "PRO", "ENTERPRISE"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const PLAN_FEATURES = [
  "aab_builds",
  "ai_assistant",
  "custom_icon",
  "no_branding",
  "push_notifications",
  "app_users",
  "priority_builds",
] as const;
export type PlanFeature = (typeof PLAN_FEATURES)[number];

export const FEATURE_LABELS: Record<PlanFeature, string> = {
  aab_builds: "Paquetes AAB para Google Play",
  ai_assistant: "Asistente de IA",
  custom_icon: "Icono personalizado",
  no_branding: "Sin marca Forjapp",
  push_notifications: "Notificaciones push",
  app_users: "Usuarios en tus apps",
  priority_builds: "Compilaciones prioritarias",
};

export interface PlanDefaults {
  code: PlanCode;
  name: string;
  description: string;
  priceMonthlyCents: number;
  maxProjects: number;
  maxBuildsPerMonth: number;
  maxStorageMb: number;
  maxAiRequestsPerMonth: number;
  features: PlanFeature[];
}

export const DEFAULT_PLANS: PlanDefaults[] = [
  {
    code: "FREE",
    name: "Gratis",
    description: "Para probar y crear tu primera app.",
    priceMonthlyCents: 0,
    maxProjects: 2,
    maxBuildsPerMonth: 5,
    maxStorageMb: 100,
    maxAiRequestsPerMonth: 5,
    features: ["ai_assistant", "custom_icon"],
  },
  {
    code: "BASIC",
    name: "Básico",
    description: "Para pequeños negocios y creadores.",
    priceMonthlyCents: 900,
    maxProjects: 5,
    maxBuildsPerMonth: 30,
    maxStorageMb: 1024,
    maxAiRequestsPerMonth: 50,
    features: ["ai_assistant", "custom_icon", "aab_builds", "no_branding", "app_users"],
  },
  {
    code: "PRO",
    name: "Profesional",
    description: "Para profesionales y agencias.",
    priceMonthlyCents: 2900,
    maxProjects: 25,
    maxBuildsPerMonth: 200,
    maxStorageMb: 10240,
    maxAiRequestsPerMonth: 500,
    features: ["ai_assistant", "custom_icon", "aab_builds", "no_branding", "app_users", "push_notifications", "priority_builds"],
  },
  {
    code: "ENTERPRISE",
    name: "Empresarial",
    description: "Sin límites, soporte dedicado.",
    priceMonthlyCents: 9900,
    maxProjects: -1,
    maxBuildsPerMonth: -1,
    maxStorageMb: 102400,
    maxAiRequestsPerMonth: -1,
    features: [...PLAN_FEATURES],
  },
];

export const PLAN_RANK: Record<PlanCode, number> = { FREE: 0, BASIC: 1, PRO: 2, ENTERPRISE: 3 };

export function planAllows(planCode: PlanCode, minPlan?: PlanCode): boolean {
  if (!minPlan) return true;
  return PLAN_RANK[planCode] >= PLAN_RANK[minPlan];
}

export function withinLimit(used: number, limit: number): boolean {
  return limit < 0 || used < limit;
}
