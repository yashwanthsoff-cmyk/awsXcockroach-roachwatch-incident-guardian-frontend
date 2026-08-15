import type { Incident, Severity, IncidentStatus } from "./types";
import { apiFetch } from "./apiClient";

interface BackendIncident {
  id: string;
  service: string;
  severity: string;
  status: string;
  description: string;
  created_at: string;
  root_cause?: string | null;
  fix_summary?: string | null;
  markdown_response?: string | null;
}

interface BackendAnalysis {
  rootCause: string;
  fixSuggestion: string;
  confidence: number;
  citedRecordIds: string[];
  markdownResponse?: string;
  degraded?: boolean;
}

interface CreateIncidentResponse {
  incident: BackendIncident;
  similarIncidents: unknown[];
  analysis: BackendAnalysis;
  s3: { uploaded: boolean; key?: string };
  likelyDuplicateOf: { id: string; service: string; description: string; similarity: number } | null;
}

interface ListIncidentsResponse {
  incidents: BackendIncident[];
}

interface ResolveIncidentResponse {
  id: string;
  service: string;
  status: string;
  resolved_at: string;
  irregularTransition: boolean;
  previousStatus: string;
}

const VALID_STATUSES: IncidentStatus[] = ["open", "investigating", "fix_proposed", "resolved", "monitoring"];

function toIncidentStatus(status: string): IncidentStatus {
  if (VALID_STATUSES.includes(status as IncidentStatus)) return status as IncidentStatus;
  console.warn(`Unknown incident status "${status}" - defaulting to "open"`);
  return "open";
}

function toSeverity(severity: string): Severity {
  if (severity === "low" || severity === "medium" || severity === "high" || severity === "critical") return severity;
  return "medium";
}

function adaptIncident(raw: BackendIncident, analysis?: BackendAnalysis): Incident {
  return {
    id: raw.id,
    service: raw.service,
    summary: raw.description,
    severity: toSeverity(raw.severity),
    status: toIncidentStatus(raw.status),
    triggeredAt: raw.created_at,
    alertPayload: {},
    matchedRecordId: analysis?.citedRecordIds?.[0] ?? null,
    rootCause: analysis?.rootCause ?? raw.root_cause ?? undefined,
    confidence: analysis ? Math.round(analysis.confidence * 100) : undefined,
    fixSummary: analysis?.fixSuggestion ?? raw.fix_summary ?? undefined,
    markdownResponse: analysis?.markdownResponse ?? raw.markdown_response ?? undefined,
  };
}

export async function listIncidents(): Promise<Incident[]> {
  const result = await apiFetch<ListIncidentsResponse>("/api/incidents?limit=50");
  return result.incidents.map((raw) => adaptIncident(raw));
}

export async function getIncident(id: string): Promise<Incident | null> {
  try {
    const raw = await apiFetch<BackendIncident>(`/api/incidents/${id}`);
    return adaptIncident(raw);
  } catch {
    return null;
  }
}

export async function createIncident(input: {
  service: string;
  severity: Severity;
  description: string;
}): Promise<Incident> {
  const result = await apiFetch<CreateIncidentResponse>("/api/incidents", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return adaptIncident(result.incident, result.analysis);
}

export async function resolveIncident(id: string): Promise<ResolveIncidentResponse> {
  return apiFetch<ResolveIncidentResponse>(`/api/incidents/${id}/resolve`, {
    method: "POST",
  });
}
