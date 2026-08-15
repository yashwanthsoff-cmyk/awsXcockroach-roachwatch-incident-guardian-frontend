import { apiFetch } from "./apiClient";

export interface LearningStats {
  confirmedFixes: number;
  fixesThatRegressed: number;
  avgEffectiveness: number | null;
  explanation?: string;
}

export interface ConfirmFixResult {
  id: string;
  service: string;
  description: string;
  fix_confirmed: boolean;
  fix_effectiveness_score: number;
  explanation?: string;
}

export async function getLearningStats(): Promise<LearningStats> {
  return apiFetch<LearningStats>("/api/learning/stats");
}

export async function confirmFixWorked(incidentId: string): Promise<ConfirmFixResult> {
  return apiFetch<ConfirmFixResult>(`/api/learning/confirm-fix/${incidentId}`, { method: "POST" });
}
