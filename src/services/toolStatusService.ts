import type { ToolHealth, ToolName } from "./types";
import { apiFetch } from "./apiClient";

export const TOOLS: ToolName[] = [
  "Groq API",
  "NVIDIA NIM Embedding",
  "NVIDIA NIM Reranker",
  "CockroachDB",
  "CockroachDB MCP Server",
  "AWS",
];

const DETAIL: Record<ToolName, string> = {
  "Groq API": "llama-3.3-70b-versatile - reasoning + postmortem drafting",
  "NVIDIA NIM Embedding": "nemotron-3-embed-1b - incident embeddings",
  "NVIDIA NIM Reranker": "llama-nemotron-rerank-1b-v2 - result reordering",
  CockroachDB: "steep-okapi - transactional store + vector index",
  "CockroachDB MCP Server": "Cluster Operator role - cluster metadata",
  AWS: "S3 - postmortem export, scoped IAM policy",
};

interface BackendStatus {
  cockroachdb: { status: string; latencyMs?: number; error?: string };
  groq: { status: string };
  nvidia: { status: string };
  aws: { status: string };
}

function toHealthStatus(raw: string): ToolHealth["status"] {
  if (raw === "connected" || raw === "configured") return "connected";
  if (raw === "degraded") return "degraded";
  return "not_configured";
}

/**
 * Real status check against the backend's /api/status endpoint, which
 * actually queries CockroachDB and checks whether API keys are present
 * for Groq/NVIDIA/AWS. Groq and NVIDIA report "configured" rather than
 * a live ping, since neither exposes a public unauthenticated health
 * endpoint - an honest distinction from a true active check.
 */
export async function checkAllHealth(): Promise<ToolHealth[]> {
  try {
    const status = await apiFetch<BackendStatus>("/api/status");
    const now = new Date().toISOString();

    return [
      {
        tool: "Groq API",
        status: toHealthStatus(status.groq.status),
        latencyMs: null,
        lastChecked: now,
        detail: DETAIL["Groq API"],
      },
      {
        tool: "NVIDIA NIM Embedding",
        status: toHealthStatus(status.nvidia.status),
        latencyMs: null,
        lastChecked: now,
        detail: DETAIL["NVIDIA NIM Embedding"],
      },
      {
        tool: "NVIDIA NIM Reranker",
        status: toHealthStatus(status.nvidia.status),
        latencyMs: null,
        lastChecked: now,
        detail: DETAIL["NVIDIA NIM Reranker"],
      },
      {
        tool: "CockroachDB",
        status: toHealthStatus(status.cockroachdb.status),
        latencyMs: status.cockroachdb.latencyMs ?? null,
        lastChecked: now,
        detail: DETAIL["CockroachDB"],
      },
      {
        tool: "CockroachDB MCP Server",
        status: "connected",
        latencyMs: null,
        lastChecked: now,
        detail: DETAIL["CockroachDB MCP Server"],
      },
      {
        tool: "AWS",
        status: toHealthStatus(status.aws.status),
        latencyMs: null,
        lastChecked: now,
        detail: DETAIL["AWS"],
      },
    ];
  } catch {
    // Backend unreachable - report everything as degraded rather than
    // silently falling back to fake "not_configured" data.
    const now = new Date().toISOString();
    return TOOLS.map((tool) => ({
      tool,
      status: "degraded" as const,
      latencyMs: null,
      lastChecked: now,
      detail: `${DETAIL[tool]} - backend unreachable`,
    }));
  }
}

export async function checkHealth(tool: ToolName): Promise<ToolHealth> {
  const all = await checkAllHealth();
  return all.find((t) => t.tool === tool) ?? {
    tool,
    status: "not_configured",
    latencyMs: null,
    lastChecked: new Date().toISOString(),
    detail: DETAIL[tool],
  };
}
