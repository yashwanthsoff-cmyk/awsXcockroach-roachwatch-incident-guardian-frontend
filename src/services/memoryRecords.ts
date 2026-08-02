import type { MemoryRecord } from "./types";

// Shared canned memory corpus used by DEMO_MODE service implementations.
export const MEMORY_RECORDS: MemoryRecord[] = [
  {
    id: "rec-4471",
    recordNumber: 4471,
    service: "checkout-api",
    title: "Checkout p99 latency spike after connection pool exhaustion",
    rootCause:
      "Connection pool max_conns left at 20 while traffic doubled; requests queued behind pool acquisition.",
    resolution: "Raised max_conns to 80 and added pool saturation alert at 70%.",
    writtenAt: "2026-06-14T03:12:00Z",
    committedLatencyMs: 340,
  },
  {
    id: "rec-4402",
    recordNumber: 4402,
    service: "payments-worker",
    title: "Payment retries storm caused by idempotency key collision",
    rootCause:
      "Retry middleware regenerated idempotency keys on 5xx, causing duplicate charge attempts and downstream throttling.",
    resolution: "Pinned idempotency key to request id; added dedupe index on payments table.",
    writtenAt: "2026-05-29T21:44:00Z",
    committedLatencyMs: 212,
  },
  {
    id: "rec-4318",
    recordNumber: 4318,
    service: "auth-gateway",
    title: "JWKS cache stampede on key rotation",
    rootCause: "JWKS cache TTL expired for all pods simultaneously, stampeding the identity provider.",
    resolution: "Added jittered TTL and stale-while-revalidate fetch.",
    writtenAt: "2026-05-11T09:02:00Z",
    committedLatencyMs: 288,
  },
  {
    id: "rec-4290",
    recordNumber: 4290,
    service: "search-indexer",
    title: "Indexer lag from unbounded batch size",
    rootCause: "Batch size scaled with backlog, producing multi-minute transactions that blocked compaction.",
    resolution: "Capped batch at 5k docs and split transactions.",
    writtenAt: "2026-04-27T14:31:00Z",
    committedLatencyMs: 401,
  },
  {
    id: "rec-4155",
    recordNumber: 4155,
    service: "notifications",
    title: "Webhook fan-out saturated egress NAT",
    rootCause: "Fan-out concurrency of 500 exhausted NAT gateway ports during a marketing send.",
    resolution: "Limited concurrency to 120 and moved to a dedicated egress pool.",
    writtenAt: "2026-04-02T18:19:00Z",
    committedLatencyMs: 176,
  },
  {
    id: "rec-4098",
    recordNumber: 4098,
    service: "checkout-api",
    title: "Region failover left stale read replicas serving cart data",
    rootCause: "Follower reads configured with 30s staleness bound during failover drill.",
    resolution: "Reduced staleness bound to 4.8s for cart queries.",
    writtenAt: "2026-03-18T11:57:00Z",
    committedLatencyMs: 254,
  },
];

export const findRecord = (id: string) => MEMORY_RECORDS.find((r) => r.id === id) ?? null;
