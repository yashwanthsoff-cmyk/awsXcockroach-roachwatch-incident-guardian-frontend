import { apiFetch } from "./apiClient";

export type ValidationStatus = "validated" | "pending" | "failed";

export interface ValidationResult {
  incidentId: string;
  service: string;
  status: ValidationStatus;
  daysHeld: number;
  explanation: string;
}

interface BackendValidationResult {
  id: string;
  service: string;
  validationStatus: ValidationStatus;
  daysHeld: number;
  explanation: string;
}

interface ValidationRunResponse {
  results: BackendValidationResult[];
}

function adaptResult(item: BackendValidationResult): ValidationResult {
  return {
    incidentId: item.id,
    service: item.service,
    status: item.validationStatus,
    daysHeld: item.daysHeld,
    explanation: item.explanation,
  };
}

/**
 * Runs a real validation pass - evaluates every human-confirmed fix
 * against actual elapsed time and real recurrence detection, no
 * fabricated before/after metrics. Returns a verdict per fix:
 * validated (held clean long enough), failed (a real recurrence was
 * detected), or pending (not enough time has passed yet).
 */
export async function runValidation(): Promise<ValidationResult[]> {
  const data = await apiFetch<ValidationRunResponse>("/api/validation/run", { method: "POST" });
  return (data.results ?? []).map(adaptResult);
}
