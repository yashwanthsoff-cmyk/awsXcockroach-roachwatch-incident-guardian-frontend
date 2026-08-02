import { listIncidents } from "./incidentService";
import type { Incident, RiskLevel } from "./types";
import { delay, randomDelay } from "./types";

// Flip to false once the scheduled AWS Lambda recurrence job is live.
const DEMO_MODE = true;

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
}

let overrides: Record<string, { risk: RiskLevel; signal: string; lastCheckedAt: string }> = {};

const SIGNALS: Record<RiskLevel, string> = {
  low: "Current metrics diverge from pre-fix state by 84% — fix is holding.",
  medium: "Two of five pre-fix indicators are trending back toward failure thresholds.",
  high: "Live state now matches 91% of the pre-fix signature — regression likely.",
};

const toWatched = (incident: Incident): WatchedResolution => {
  const override = overrides[incident.id];
  const risk = override?.risk ?? incident.recurrenceRisk ?? "low";
  return {
    incidentId: incident.id,
    service: incident.service,
    title: incident.summary,
    rootCause: incident.rootCause ?? "Root cause not recorded.",
    fixSummary: incident.fixSummary ?? "Fix summary not recorded.",
    risk,
    lastCheckedAt: override?.lastCheckedAt ?? new Date(Date.now() - 37 * 60_000).toISOString(),
    signal: override?.signal ?? SIGNALS[risk],
    regression: risk === "high",
  };
};

export async function listWatched(): Promise<WatchedResolution[]> {
  if (DEMO_MODE) {
    await randomDelay();
    const incidents = await listIncidents();
    return incidents.filter((i) => i.status === "resolved").map(toWatched);
  }
  // TODO: connect to CockroachDB — SELECT resolved incidents joined with recurrence_checks
  const res = await fetch("/api/recurrence");
  return (await res.json()) as WatchedResolution[];
}

export async function checkAll(): Promise<WatchedResolution[]> {
  if (DEMO_MODE) {
    await delay(1100);
    const incidents = (await listIncidents()).filter((i) => i.status === "resolved");
    const escalate = incidents[1]?.id;
    overrides = Object.fromEntries(
      incidents.map((i) => {
        const risk: RiskLevel = i.id === escalate ? "high" : (i.recurrenceRisk ?? "low");
        return [
          i.id,
          { risk, signal: SIGNALS[risk], lastCheckedAt: new Date().toISOString() },
        ];
      }),
    );
    return incidents.map(toWatched);
  }
  // TODO: connect to the AWS Lambda recurrence job (invoke on demand)
  const res = await fetch("/api/recurrence/check", { method: "POST" });
  return (await res.json()) as WatchedResolution[];
}

export async function checkOne(incidentId: string): Promise<WatchedResolution | null> {
  if (DEMO_MODE) {
    await delay(650);
    const incident = (await listIncidents()).find((i) => i.id === incidentId);
    if (!incident) return null;
    const risk: RiskLevel = incident.recurrenceRisk === "high" ? "high" : "medium";
    overrides = {
      ...overrides,
      [incidentId]: { risk, signal: SIGNALS[risk], lastCheckedAt: new Date().toISOString() },
    };
    return toWatched(incident);
  }
  // TODO: connect to the AWS Lambda recurrence job for a single incident
  const res = await fetch(`/api/recurrence/check/${incidentId}`, { method: "POST" });
  return (await res.json()) as WatchedResolution;
}
