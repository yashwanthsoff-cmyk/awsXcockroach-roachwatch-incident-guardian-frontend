import { apiFetch } from "./apiClient";

export type SimulatedAlertKind = "datadog" | "pagerduty" | "cloudwatch";

interface SimulateResponse {
  incident: { id: string; service: string; status: string };
  simulatedKind: string;
  simulatedPayload: Record<string, unknown>;
}

/**
 * Fires the backend's /api/webhooks/simulate route - the same
 * normalization + pipeline path a real Datadog/PagerDuty/CloudWatch
 * webhook would hit, but using a fixed, server-side sample payload
 * instead of the real WEBHOOK_SECRET-gated endpoint. This is what lets
 * the ingestion/normalization capability be demoed live from the UI
 * without exposing the real webhook secret to browser JavaScript.
 */
export async function simulateAlert(kind: SimulatedAlertKind): Promise<SimulateResponse> {
  return apiFetch<SimulateResponse>("/api/webhooks/simulate", {
    method: "POST",
    body: JSON.stringify({ kind }),
  });
}
