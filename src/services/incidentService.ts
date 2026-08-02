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
      metric: 'http_request_duration_seconds{quantile="0.99"}',
      value: 4.21,
      threshold: 0.8,
      pool_utilization: 0.98,
      runbook: "https://runbooks.internal/checkout/latency",
    },
    matchedRecordId: "rec-4471",
    rootCause:
      "Connection pool saturation on checkout-api: pool_utilization pinned at 98% while request rate rose 2.1x. Requests are queuing on acquisition, not on the database.",
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
    triggeredAt: minutesAgo(19),
    alertPayload: {
      alert: "RetryQueueDepth",
      service: "payments-worker",
      queue: "payments.retry",
      depth: 12400,
      threshold: 2000,
      duplicate_charge_attempts: 41,
    },
    matchedRecordId: "rec-4402",
    rootCause:
      "Retry middleware is regenerating idempotency keys on 5xx responses, so the downstream processor treats retries as new charges and throttles the worker.",
    confidence: 74,
    postmortemDraft:
      "Summary: payments-worker retry queue grew to 12.4k messages after idempotency key regeneration on retry.\n\nRoot cause: retry wrapper mints a fresh key per attempt.\n\nFix: pin idempotency key to request id.\n\nPrior art: memory record #4402.",
  },
  {
    id: "inc-9010",
    service: "auth-gateway",
    summary: "401 rate 6.8% after identity provider key rotation",
    severity: "high",
    status: "open",
    triggeredAt: minutesAgo(42),
    alertPayload: {
      alert: "ElevatedAuthFailures",
      service: "auth-gateway",
      error_rate: 0.068,
      jwks_fetches_per_min: 940,
      cache_hit_ratio: 0.11,
    },
    matchedRecordId: "rec-4318",
    rootCause:
      "JWKS cache expired simultaneously across all gateway pods, stampeding the identity provider and causing verification timeouts.",
    confidence: 88,
  },
  {
    id: "inc-9009",
    service: "search-indexer",
    summary: "Index lag 14m behind primary",
    severity: "medium",
    status: "open",
    triggeredAt: minutesAgo(88),
    alertPayload: {
      alert: "IndexerLag",
      service: "search-indexer",
      lag_seconds: 840,
      batch_size: 48000,
      open_txn_duration_seconds: 190,
    },
    matchedRecordId: null,
  },
  {
    id: "inc-9008",
    service: "notifications",
    summary: "Webhook delivery failures 22% for tenant batch send",
    severity: "medium",
    status: "resolved",
    triggeredAt: minutesAgo(210),
    alertPayload: {
      alert: "WebhookDeliveryFailures",
      service: "notifications",
      failure_rate: 0.22,
      nat_port_allocation: 0.99,
      concurrency: 500,
    },
    matchedRecordId: null,
    rootCause: "Fan-out concurrency of 500 exhausted NAT gateway port allocation during a marketing send.",
    confidence: 91,
    fixSummary: "Capped fan-out concurrency at 120 and moved webhook egress to a dedicated NAT pool.",
    recurrenceRisk: "high",
  },
  {
    id: "inc-9007",
    service: "checkout-api",
    summary: "Stale cart reads during scheduled failover drill",
    severity: "low",
    status: "resolved",
    triggeredAt: minutesAgo(1440),
    alertPayload: {
      alert: "StaleFollowerReads",
      service: "checkout-api",
      staleness_bound_seconds: 30,
      affected_requests: 1207,
    },
    matchedRecordId: "rec-4098",
    rootCause: "Follower reads used a 30s staleness bound, so carts served pre-failover state.",
    confidence: 79,
    fixSummary: "Reduced staleness bound to 4.8s for cart queries.",
    recurrenceRisk: "medium",
  },
  {
    id: "inc-9006",
    service: "ledger-api",
    summary: "Contention retries on ledger_entries hot range",
    severity: "high",
    status: "resolved",
    triggeredAt: minutesAgo(2880),
    alertPayload: {
      alert: "TxnRetryRate",
      service: "ledger-api",
      retry_rate: 0.14,
      hot_range: "ledger_entries/1",
    },
    matchedRecordId: null,
    rootCause: "Monotonic primary key created a single hot range for all ledger writes.",
    confidence: 85,
    fixSummary: "Switched to hash-sharded index on ledger_entries.",
    recurrenceRisk: "low",
  },
  {
    id: "inc-9005",
    service: "media-transcoder",
    summary: "Job queue starvation on GPU pool",
    severity: "low",
    status: "resolved",
    triggeredAt: minutesAgo(4320),
    alertPayload: {
      alert: "QueueStarvation",
      service: "media-transcoder",
      waiting_jobs: 318,
      gpu_utilization: 1,
    },
    matchedRecordId: null,
    rootCause: "Priority queue starved low-tier jobs when premium volume spiked.",
    confidence: 68,
    fixSummary: "Added aging factor to queue priority scoring.",
    recurrenceRisk: "low",
  },
];

let extraIncidents: Incident[] = [];

export async function listIncidents(): Promise<Incident[]> {
  if (DEMO_MODE) {
    await randomDelay();
    return [...extraIncidents, ...MOCK_INCIDENTS];
  }
  // TODO: replace mock incident feed with CockroachDB query results (real-time incident table)
  const res = await fetch("/api/incidents");
  return (await res.json()) as Incident[];
}

export async function getIncident(id: string): Promise<Incident | null> {
  if (DEMO_MODE) {
    await randomDelay();
    return [...extraIncidents, ...MOCK_INCIDENTS].find((i) => i.id === id) ?? null;
  }
  // TODO: connect to CockroachDB — SELECT * FROM incidents WHERE id = $1
  const res = await fetch(`/api/incidents/${id}`);
  return (await res.json()) as Incident;
}

export async function createIncident(): Promise<Incident> {
  if (DEMO_MODE) {
    await randomDelay();
    const n = 9013 + extraIncidents.length;
    const incident: Incident = {
      id: `inc-${n}`,
      service: "cart-service",
      summary: "Elevated 5xx on PUT /cart/items (2.4%)",
      severity: "high",
      status: "open",
      triggeredAt: new Date().toISOString(),
      alertPayload: {
        alert: "Elevated5xx",
        service: "cart-service",
        error_rate: 0.024,
        threshold: 0.005,
      },
      matchedRecordId: "rec-4471",
    };
    extraIncidents = [incident, ...extraIncidents];
    return incident;
  }
  // TODO: connect to CockroachDB — INSERT INTO incidents ... RETURNING *
  const res = await fetch("/api/incidents", { method: "POST" });
  return (await res.json()) as Incident;
}
