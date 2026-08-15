import { apiFetch } from "./apiClient";

export interface BackendStats {
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  analyzedIncidents: number;
}

export async function getStats(): Promise<BackendStats> {
  return apiFetch<BackendStats>("/api/stats");
}
