import type { ClusterNode, ClusterStatus } from "./types";
import { delay, randomDelay } from "./types";

// Flip to false once ccloud CLI / CockroachDB Cloud API node endpoints are wired.
const DEMO_MODE = true;

let nodes: ClusterNode[] = [
  { id: 1, name: "Node 1", state: "healthy", region: "us-east-1a", latencyMs: 9, replicas: 24 },
  { id: 2, name: "Node 2", state: "healthy", region: "us-east-1b", latencyMs: 11, replicas: 24 },
  { id: 3, name: "Node 3", state: "healthy", region: "us-west-2a", latencyMs: 38, replicas: 24 },
];

const status = (): ClusterStatus => ({
  nodes: nodes.map((n) => ({ ...n })),
  activeConnections: nodes.some((n) => n.state === "down") ? 61 : 42,
  lastQueryLatencyMs: nodes.some((n) => n.state === "down") ? 19 : 11,
  replicasUnderReplicated: nodes.some((n) => n.state === "down") ? 8 : 0,
  memoryRecords: 4471,
});

export async function getClusterStatus(): Promise<ClusterStatus> {
  if (DEMO_MODE) {
    await randomDelay();
    return status();
  }
  // TODO: connect to CockroachDB Cloud API / MCP Server for real node health
  const res = await fetch("/api/cluster");
  return (await res.json()) as ClusterStatus;
}

export async function killNode(id: number): Promise<ClusterStatus> {
  if (DEMO_MODE) {
    await delay(320);
    nodes = nodes.map((n) => (n.id === id ? { ...n, state: "down", latencyMs: 0, replicas: 0 } : n));
    return status();
  }
  // TODO: replace simulated kill with actual ccloud CLI call / Cloud API node-drain endpoint
  const res = await fetch(`/api/cluster/nodes/${id}/drain`, { method: "POST" });
  return (await res.json()) as ClusterStatus;
}

export async function restoreNode(id: number): Promise<ClusterStatus> {
  if (DEMO_MODE) {
    await delay(320);
    nodes = nodes.map((n) =>
      n.id === id ? { ...n, state: "healthy", latencyMs: id === 3 ? 38 : 11, replicas: 24 } : n,
    );
    return status();
  }
  // TODO: replace simulated restore with actual ccloud CLI call / Cloud API node endpoint
  const res = await fetch(`/api/cluster/nodes/${id}/restore`, { method: "POST" });
  return (await res.json()) as ClusterStatus;
}
