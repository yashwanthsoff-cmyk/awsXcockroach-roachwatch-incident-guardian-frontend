import { getClusterStatus } from "./clusterService";
import type { ClusterStatus, InspectionRun } from "./types";
import { delay } from "./types";

// Flip to false once the CockroachDB Cloud Managed MCP Server (read-only) is reachable.
const DEMO_MODE = true;

const STEPS = [
  "mcp.connect(cluster=roachwatch-prod, mode=read-only) ... OK",
  "Checking node liveness ... 3/3 nodes live",
  "Checking replica health for incidents table ... 9 replicas, 0 under-replicated",
  "Checking replica health for memory_records table ... 15 replicas, 0 under-replicated",
  "Sampling query latency (SELECT 1) ... 11ms p50 / 24ms p99",
  "Checking active connections ... 42 of 500",
  "Checking backup status via ccloud CLI ... last full backup 34m ago",
  "Cluster healthy — safe to triage against memory.",
];

let history: InspectionRun[] = [
  {
    id: "insp-0031",
    startedAt: new Date(Date.now() - 26 * 60_000).toISOString(),
    result: "healthy",
    durationMs: 1420,
    steps: STEPS,
  },
  {
    id: "insp-0030",
    startedAt: new Date(Date.now() - 91 * 60_000).toISOString(),
    result: "degraded",
    durationMs: 2870,
    steps: STEPS,
  },
  {
    id: "insp-0029",
    startedAt: new Date(Date.now() - 184 * 60_000).toISOString(),
    result: "healthy",
    durationMs: 1310,
    steps: STEPS,
  },
];

export interface InspectionResult {
  run: InspectionRun;
  cluster: ClusterStatus;
}

/** Streams inspection steps through onStep, then resolves with the final run + cluster health. */
export async function runInspection(onStep?: (step: string) => void): Promise<InspectionResult> {
  if (DEMO_MODE) {
    const startedAt = new Date().toISOString();
    const start = Date.now();
    for (const step of STEPS) {
      await delay(180 + Math.round(Math.random() * 220));
      onStep?.(step);
    }
    const cluster = await getClusterStatus();
    const run: InspectionRun = {
      id: `insp-${String(32 + history.length - 3).padStart(4, "0")}`,
      startedAt,
      result: cluster.nodes.every((n) => n.state === "healthy") ? "healthy" : "degraded",
      durationMs: Date.now() - start,
      steps: STEPS,
    };
    history = [run, ...history];
    return { run, cluster };
  }
  // TODO: connect to CockroachDB Cloud Managed MCP Server (read-only mode) for real cluster state
  const res = await fetch("/api/mcp/inspect", { method: "POST" });
  return (await res.json()) as InspectionResult;
}

export async function listInspections(): Promise<InspectionRun[]> {
  if (DEMO_MODE) {
    await delay(200);
    return history;
  }
  // TODO: connect to CockroachDB — SELECT * FROM inspection_runs ORDER BY started_at DESC
  const res = await fetch("/api/mcp/inspections");
  return (await res.json()) as InspectionRun[];
}
