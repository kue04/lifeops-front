import type { AppAuditItem, AppMeResponse, FinalPlan, HistoryItem, PlanFeedbackPayload, PlanResponse, ProfileResponse, ProviderHealthResponse, RunEvent, RunStatus } from "../types/lifeops";

const API_BASE = (import.meta.env.VITE_LIFEOPS_API_BASE ?? "http://localhost:8000").replace(/\/$/, "");

export type PlanRequestContext = {
  origin_location?: string;
  origin_city?: string;
  default_city?: string;
  memory_overrides?: {
    disabled_likes?: string[];
    disabled_dislikes?: string[];
    session_likes?: string[];
    session_dislikes?: string[];
  };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `请求失败：${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function createPlan(userInput: string, context: PlanRequestContext = {}) {
  return request<PlanResponse>("/app/plan", {
    method: "POST",
    body: JSON.stringify({ user_input: userInput, ...context }),
  });
}

export function startPlanRun(userInput: string, previousResult?: PlanResponse, context: PlanRequestContext = {}) {
  return request<{ trace_id: string }>("/app/runs/plan", {
    method: "POST",
    body: JSON.stringify({ user_input: userInput, previous_result: previousResult, ...context }),
  });
}

export function getRunStatus(traceId: string) {
  return request<RunStatus>(`/app/runs/${traceId}`);
}

export function runEventsUrl(traceId: string) {
  return `${API_BASE}/app/runs/${traceId}/events`;
}

export function replan(userInput: string, previousResult: PlanResponse, context: PlanRequestContext = {}) {
  return request<PlanResponse>("/app/replan", {
    method: "POST",
    body: JSON.stringify({ user_input: userInput, previous_result: previousResult, ...context }),
  });
}

export function getHistory(limit = 20) {
  return request<{ items: HistoryItem[] }>(`/app/history?limit=${limit}`);
}

export function getProfile() {
  return request<ProfileResponse>("/app/profile");
}

export function getProviderHealth() {
  return request<ProviderHealthResponse>("/health/providers");
}

export function getAppMe() {
  return request<AppMeResponse>("/app/me");
}

export function getAppAudit(limit = 50) {
  return request<{ items: AppAuditItem[] }>(`/app/audit?limit=${limit}`);
}

export function submitFeedback(payload: PlanFeedbackPayload) {
  return request<{ feedback_id: string; learned_preferences: Array<{ type: string; content: string }>; created_at: string }>("/app/feedback", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getHistoryItem(taskId: string) {
  return request<{ found: boolean; item?: HistoryItem | null; result?: PlanResponse | null }>(`/app/history/${taskId}`);
}

export function confirmPlanAction(payload: {
  plan_id?: string;
  trace_id?: string;
  action_type: string;
  label?: string;
  items?: unknown[];
}) {
  return request<{
    status: string;
    confirmation_id: string;
    execution: string;
    message: string;
  }>("/app/confirm-action", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function exportCalendarIcs(finalPlan: FinalPlan, confirmationId: string) {
  const response = await fetch(`${API_BASE}/app/calendar/ics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ final_plan: finalPlan, confirmation_id: confirmationId }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `导出失败：${response.status}`);
  }
  return response.blob();
}

export function cachePlan(result: PlanResponse) {
  const keys = Array.from(new Set([result.trace_id, result.task_id].filter(Boolean)));
  if (!keys.length) return;
  const compact = compactPlanResult(result);
  for (const key of keys) {
    try {
      localStorage.setItem(`lifeops:plan:${key}`, JSON.stringify(compact));
    } catch {
      try {
        localStorage.setItem(`lifeops:plan:${key}`, JSON.stringify(minimalPlanResult(compact)));
      } catch {
        // Storage is best-effort; navigation must not depend on it.
      }
    }
  }
}

export function readCachedPlan(traceId: string): PlanResponse | null {
  const raw = localStorage.getItem(`lifeops:plan:${traceId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlanResponse;
  } catch {
    return null;
  }
}

export function cacheRunEvents(traceId: string, events: RunEvent[]) {
  if (!traceId) return;
  const compactEvents = events.filter((event) => !isMissingRunEvent(event)).map(compactRunEvent);
  try {
    localStorage.setItem(`lifeops:run-events:${traceId}`, JSON.stringify(compactEvents));
  } catch {
    try {
      localStorage.setItem(`lifeops:run-events:${traceId}`, JSON.stringify(compactEvents.slice(-80)));
    } catch {
      // Storage is best-effort; the run page can recover from the backend.
    }
  }
}

export function readCachedRunEvents(traceId: string): RunEvent[] {
  const raw = localStorage.getItem(`lifeops:run-events:${traceId}`);
  if (!raw) return [];
  try {
    const events = JSON.parse(raw) as RunEvent[];
    return Array.isArray(events) ? events.filter((event) => !isMissingRunEvent(event)) : [];
  } catch {
    return [];
  }
}

function compactRunEvent(event: RunEvent): RunEvent {
  const { result: _result, ...rest } = event;
  return rest as RunEvent;
}

function isMissingRunEvent(event: RunEvent) {
  return event.phase === "error" && event.node === "run" && event.summary.includes("未找到运行任务");
}

function compactPlanResult(result: PlanResponse): PlanResponse {
  return {
    status: result.status,
    task_id: result.task_id,
    trace_id: result.trace_id,
    constraints: result.constraints,
    final_plan: result.final_plan,
    assistant_message: result.assistant_message,
    quality_warnings: result.quality_warnings,
    quality_score: result.quality_score,
    execution_log: result.execution_log,
    question: result.question,
  };
}

function minimalPlanResult(result: PlanResponse): PlanResponse {
  return {
    status: result.status,
    task_id: result.task_id,
    trace_id: result.trace_id,
    final_plan: result.final_plan,
    assistant_message: result.assistant_message,
    quality_warnings: result.quality_warnings,
    quality_score: result.quality_score,
    question: result.question,
  };
}
