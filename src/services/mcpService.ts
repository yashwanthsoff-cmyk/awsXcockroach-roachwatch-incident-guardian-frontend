import { getClusterStatus } from "./clusterService";
import type { ClusterStatus, InspectionRun } from "./types";
import { apiFetch } from "./apiClient";

interface BackendInspectionStep {
  step: string;
  result?: unknown;
  error?: string;
}

interface InspectResponse {
  steps: BackendInspectionStep[];
  explanation?: string;
}

export interface InspectionResult {
  run: InspectionRun & { explanation?: string };
  cluster: ClusterStatus;
}

let history: (InspectionRun & { explanation?: string })[] = [];

export async function runInspection(onStep?: (step: string) => void): Promise<InspectionResult> {
  const startedAt = new Date().toISOString();
  const start = Date.now();

  const result = await apiFetch<InspectResponse>("/api/mcp/inspect", { method: "POST" });

  for (const step of result.steps) {
    onStep?.(step.step);
  }

  const anyFailed = result.steps.some((s) => !!s.error);
  const cluster = await getClusterStatus();

  const run: InspectionRun & { explanation?: string } = {
    id: `insp-${history.length + 1}`,
    startedAt,
    result: anyFailed ? "degraded" : "healthy",
    durationMs: Date.now() - start,
    steps: result.steps.map((s) => s.step),
    explanation: result.explanation,
  };
  history = [run, ...history];

  return { run, cluster };
}

export async function listInspections(): Promise<(InspectionRun & { explanation?: string })[]> {
  return history;
}
