// Сторінка статусу застосунку (WS11, як status-сторінки сервісів): стан кожного компонента й загальний підсумок.
// Чисті функції — щоб перевірити всі гілки тестом без мережі; самі запити — src/lib/status-probes.ts.
import type { Status } from "@/components/ui/status-badge";
import type { DbHealth } from "./health";

export type ComponentState = "operational" | "degraded" | "outage";
export type ComponentId = "app" | "database" | "auth" | "ai";

export interface ComponentStatus {
  id: ComponentId;
  name: string;
  state: ComponentState;
  detail: string;
  /** Час відповіді перевірки, мс; null — перевірки не було або вона не дійшла до відповіді. */
  latencyMs: number | null;
}

export interface StatusReport {
  state: ComponentState;
  title: string;
  components: ComponentStatus[];
  checkedAt: string;
}

export const COMPONENT_NAMES: Record<ComponentId, string> = {
  app: "Web app",
  database: "Database",
  auth: "Sign-in",
  ai: "AI document parsing",
};

export const STATE_LABELS: Record<ComponentState, string> = {
  operational: "Operational",
  degraded: "Degraded",
  outage: "Outage",
};

/** Тон StatusBadge: стан — завжди іконка іншої форми й слово, не лише колір (DESIGN.md, розділ 7). */
export const STATE_TONES: Record<ComponentState, Status> = {
  operational: "done",
  degraded: "due-soon",
  outage: "overdue",
};

/** Відповідь повільніша — компонент працює, але «Degraded». */
export const SLOW_MS = 2_000;
/** Без застосунку, бази чи входу продуктом не скористатися — їхній збій робить підсумок «Major outage». */
const CORE: readonly ComponentId[] = ["app", "database", "auth"];

const component = (id: ComponentId, state: ComponentState, detail: string, latencyMs: number | null): ComponentStatus => ({
  id,
  name: COMPONENT_NAMES[id],
  state,
  detail,
  latencyMs,
});

/** Працює, але повільно — «Degraded» з поясненням замість «Operational». */
function slowed(c: ComponentStatus): ComponentStatus {
  return c.state === "operational" && c.latencyMs !== null && c.latencyMs > SLOW_MS ? { ...c, state: "degraded", detail: "Slow response" } : c;
}

export const responseDetail = (ms: number | null) => (ms === null ? "No response" : `Response ${ms} ms`);

/** Застосунок відповів (сторінку зібрано) — працює; версія — коміт збірки. */
export function appComponent(sha: string, env: string): ComponentStatus {
  const version = sha === "local" ? "local build" : sha.slice(0, 7);
  return component("app", "operational", `Version ${version} · ${env}`, null);
}

/** База: та сама класифікація, що й /api/health (classifyDbProbe). */
export function databaseComponent(health: DbHealth, ms: number | null): ComponentStatus {
  if (health.db === "down") return component("database", "outage", health.reason === "paused" ? "Project paused" : "Not responding", ms);
  return slowed(component("database", "operational", responseDetail(ms), ms));
}

/** Вхід: GET /auth/v1/health сервісу Auth; 0 — мережа чи тайм-аут. */
export function authComponent(status: number, ms: number | null): ComponentStatus {
  if (status === 200) return slowed(component("auth", "operational", responseDetail(ms), ms));
  return component("auth", "outage", status === 0 ? "Not responding" : `HTTP ${status}`, ms);
}

/**
 * AI: ключ є і моделі ланцюжка ще є в публічному списку OpenRouter (запит списку ліміту моделей не витрачає).
 * Без ключа чи з частиною моделей — «Degraded»: значення документа людина вводить вручну. `available` null — список
 * не отримали.
 */
export function aiComponent(input: { configured: boolean; chain: readonly string[]; available: readonly string[] | null; ms: number | null }): ComponentStatus {
  const { configured, chain, available, ms } = input;
  if (!configured) return component("ai", "degraded", "Not configured", null);
  if (available === null) return component("ai", "outage", "Model provider not responding", ms);
  const present = chain.filter((id) => available.includes(id)).length;
  const detail = `${present} of ${chain.length} models available`;
  if (present === 0) return component("ai", "outage", detail, ms);
  return slowed(component("ai", present === chain.length ? "operational" : "degraded", detail, ms));
}

/** Підсумок угорі сторінки: усе працює / частина / збій ключового компонента. */
export function overallStatus(components: readonly ComponentStatus[]): Pick<StatusReport, "state" | "title"> {
  if (components.some((c) => c.state === "outage" && CORE.includes(c.id))) return { state: "outage", title: "Major outage" };
  if (components.some((c) => c.state === "outage")) return { state: "degraded", title: "Partial outage" };
  if (components.some((c) => c.state === "degraded")) return { state: "degraded", title: "Degraded performance" };
  return { state: "operational", title: "All systems operational" };
}
