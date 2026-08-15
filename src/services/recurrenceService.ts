import type { RiskLevel } from "./types";
import { apiFetch } from "./apiClient";

export interface WatchedResolution {
  incidentId: string;
  service: string;
  title: string;
  rootCause: string;
  fixSummary: string;
  risk: RiskLevel;
  lastCheckedAt: string;
  signal: string;
  regression: boolean;
  confidencePct: number | null;
  daysSinceResolution: number | null;
  effectivenessDowngraded: boolean;
  matchedIncidentText: string | null;
}

interface BackendWatchItem {
  id: string;
  service: string;
  description: string;
  root_cause?: string | null;
  fix_summary?: string | null;
  riskLevel: RiskLevel;
  matchedIncident?: { id: string; text: string; score: number } | null;
  explanation?: string;
  recurrenceConfidence?: number | null;
  daysSinceResolution?: number | null;
  effectivenessDowngraded?: boolean;
}

interface WatchListResponse {
  watchList: BackendWatchItem[];
}

function adaptWatchItem(item: BackendWatchItem): WatchedResolution {
  return {
    incidentId: item.id,
    service: item.service,
    title: item.description,
    rootCause: item.root_cause ?? "Root cause not recorded.",
    fixSummary: item.fix_summary ?? "Fix summary not recorded.",
    risk: item.riskLevel,
    lastCheckedAt: new Date().toISOString(),
    signal: item.explanation ?? "No recurrence assessment available.",
    regression: item.riskLevel === "high",
    confidencePct: item.recurrenceConfidence != null ? Math.round(item.recurrenceConfidence * 100) : null,
    daysSinceResolution: item.daysSinceResolution ?? null,
    effectivenessDowngraded: item.effectivenessDowngraded ?? false,
    matchedIncidentText: item.matchedIncident?.text ?? null,
  };
}

export async function listWatched(): Promise<WatchedResolution[]> {
  const data = await apiFetch<WatchListResponse>("/api/recurrence/watch-list");
  return (data.watchList ?? []).map(adaptWatchItem);
}

export async function checkAll(): Promise<WatchedResolution[]> {
  return listWatched();
}

export async function checkOne(incidentId: string): Promise<WatchedResolution | null> {
  const all = await listWatched();
  return all.find((w) => w.incidentId === incidentId) ?? null;
}
