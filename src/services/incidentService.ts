import type { Incident } from "./types";
import { randomDelay } from "./types";

// Flip to false when the CockroachDB-backed API is live. Return types stay identical.
const DEMO_MODE = true;

const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();

const MOCK_INCIDENTS: Incident[] = [
  {
    id: "inc-9012",
    service: "checkout-api",
    summary: "p99 latency 4.2s (threshold 800ms) on POST /checkout",
    severity: "critical",
    status: "investigating",
    triggeredAt: minutesAgo(7),
    alertPayload: {
      alert: "HighLatencyP99",
      service: "checkout-api",
      region: "us-east-1",
      metric: "http_request_duration_seconds{quantile=\"0.99\"}",
      value: 4.21,
      threshold: 0.8,
      pool_utilization: 0.98,
      runbook: "https://runbooks.internal/checkout/latency",
    },
    matchedRecordId: "rec-4471",
    rootCause:
      "Connection pool saturation on checkout-api: pool_utilization pinned at 98% while request rate rose 2.1x after the marketing push. Requests are queuing on acquisition, not on the database.",
    confidence: 82,
    postmortemDraft:
      "Summary: checkout-api p99 latency exceeded 4s for 11 minutes due to connection pool exhaustion.\n\nImpact: ~3.4% of checkout requests exceeded the 3s client timeout.\n\nRoot cause: max_conns remained at 20 while traffic doubled; acquisition queueing dominated latency.\n\nFix: raise max_conns to 80, add pool saturation alert at 70%.\n\nPrior art: memory record #4471 (2026-06-14) describes the same failure mode.",
  },
  {
    id: "inc-9011",
    service: "payments-worker",
    summary: "Retry queue depth 12,400 and climbing",
    severity: "high",
    status: "open",
    triggeredAt: minutesAgo: 0 as never,
    alertPayload: {},
    matchedRecordId: "rec-4402",
  },
];

export async function listIncidents(): Promise<Incident[]> {
  if (DEMO_MODE) {
    await randomDelay();
    return MOCK_INCIDENTS;
  }
  // TODO: connect to CockroachDB — SELECT * FROM incidents ORDER BY triggered_at DESC
  const res = await fetch("/api/incidents");
  return (await res.json()) as Incident[];
}

export async function getIncident(id: string): Promise<Incident | null> {
  if (DEMO_MODE) {
    await randomDelay();
    return MOCK_INCIDENTS.find((i) => i.id === id) ?? null;
  }
  // TODO: connect to CockroachDB — SELECT * FROM incidents WHERE id = $1
  const res = await fetch(`/api/incidents/${id}`);
  return (await res.json()) as Incident;
}

export async function createIncident(): Promise<Incident> {
  if (DEMO_MODE) {
    await randomDelay();
    return MOCK_INCIDENTS[0];
  }
  // TODO: connect to CockroachDB — INSERT INTO incidents ... RETURNING *
  const res = await fetch("/api/incidents", { method: "POST" });
  return (await res.json()) as Incident;
}
