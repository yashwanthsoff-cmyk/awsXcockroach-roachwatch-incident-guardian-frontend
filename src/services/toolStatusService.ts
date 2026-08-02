import type { ToolHealth, ToolName } from "./types";
import { delay } from "./types";

// This service intentionally attempts real, lightweight health checks where a public
// endpoint exists. DEMO_MODE only controls the fallback when nothing is configured.
const DEMO_MODE = true;

export const TOOLS: ToolName[] = [
  "Groq API",
  "NVIDIA NIM Embedding",
  "NVIDIA NIM Reranker",
  "CockroachDB",
  "CockroachDB MCP Server",
  "AWS",
];

const DETAIL: Record<ToolName, string> = {
  "Groq API": "llama-3.3-70b-versatile · reasoning + postmortem drafting",
  "NVIDIA NIM Embedding": "nv-embedqa-e5-v5 · 1024-dim incident embeddings",
  "NVIDIA NIM Reranker": "nv-rerankqa-mistral-4b · result reordering",
  CockroachDB: "roachwatch-prod · 3 nodes · vector index on memory_records",
  "CockroachDB MCP Server": "read-only mode · node liveness + replica health",
  AWS: "Lambda (recurrence job) + EventBridge schedule",
};

export async function checkHealth(tool: ToolName): Promise<ToolHealth> {
  const started = Date.now();
  // TODO: point each tool at its real health-check endpoint as it comes online.
  const endpoint: Partial<Record<ToolName, string>> = {};
  const url = endpoint[tool];

  if (url) {
    try {
      await fetch(url, { method: "GET" });
      return {
        tool,
        status: "connected",
        latencyMs: Date.now() - started,
        lastChecked: new Date().toISOString(),
        detail: DETAIL[tool],
      };
    } catch {
      return {
        tool,
        status: "degraded",
        latencyMs: null,
        lastChecked: new Date().toISOString(),
        detail: `${DETAIL[tool]} · health check failed`,
      };
    }
  }

  if (DEMO_MODE) {
    await delay(200 + Math.round(Math.random() * 260));
    return {
      tool,
      status: "not_configured",
      latencyMs: null,
      lastChecked: new Date().toISOString(),
      detail: `${DETAIL[tool]} · credentials not yet wired (DEMO_MODE)`,
    };
  }

  return {
    tool,
    status: "not_configured",
    latencyMs: null,
    lastChecked: new Date().toISOString(),
    detail: DETAIL[tool],
  };
}

export async function checkAllHealth(): Promise<ToolHealth[]> {
  return Promise.all(TOOLS.map(checkHealth));
}
