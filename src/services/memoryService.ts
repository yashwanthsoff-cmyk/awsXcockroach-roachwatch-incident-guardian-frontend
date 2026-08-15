import type { MemoryRecord, MemorySearchResult } from "./types";
import { apiFetch } from "./apiClient";
import { getIncident, createIncident } from "./incidentService";

interface BackendSearchResult {
  id: string;
  service: string | null;
  text: string;
  root_cause: string | null;
  fix_summary: string | null;
  created_at: string;
  score: number;
  retrievedAfterMs: number;
  dbLatencyMs: number;
}

interface SearchResponse {
  query: string;
  results: BackendSearchResult[];
  totalLatencyMs: number;
}

function normalizeScore(score: number): number {
  return Math.max(0, Math.min(1, (score + 20) / 40));
}

function adaptResult(r: BackendSearchResult): MemorySearchResult {
  const record: MemoryRecord = {
    id: r.id,
    recordNumber: 0,
    service: r.service ?? "unspecified",
    title: r.text,
    rootCause: r.root_cause ?? "Not yet analyzed",
    resolution: r.fix_summary ?? "Not yet resolved",
    writtenAt: r.created_at,
    committedLatencyMs: r.dbLatencyMs,
  };
  return {
    record,
    similarityScore: normalizeScore(r.score),
    retrievedAtMs: r.retrievedAfterMs,
    committedLatencyMs: r.dbLatencyMs,
  };
}

export async function searchMemory(query: string): Promise<MemorySearchResult[]> {
  const result = await apiFetch<SearchResponse>(`/api/memory/search?q=${encodeURIComponent(query)}`);
  return result.results.map(adaptResult);
}

export async function getRecord(id: string): Promise<MemoryRecord | null> {
  const incident = await getIncident(id);
  if (!incident) return null;
  return {
    id: incident.id,
    recordNumber: 0,
    service: incident.service,
    title: incident.summary,
    rootCause: incident.rootCause ?? "Not yet analyzed",
    resolution: incident.fixSummary ?? "Not yet resolved",
    writtenAt: incident.triggeredAt,
    committedLatencyMs: 0,
  };
}

export async function writeRecord(input: {
  service: string;
  title: string;
  rootCause: string;
  resolution: string;
}): Promise<MemoryRecord> {
  const incident = await createIncident({
    service: input.service,
    severity: "medium",
    description: input.title,
  });
  return {
    id: incident.id,
    recordNumber: 0,
    service: incident.service,
    title: incident.summary,
    rootCause: incident.rootCause ?? input.rootCause,
    resolution: incident.fixSummary ?? input.resolution,
    writtenAt: incident.triggeredAt,
    committedLatencyMs: 0,
  };
}
