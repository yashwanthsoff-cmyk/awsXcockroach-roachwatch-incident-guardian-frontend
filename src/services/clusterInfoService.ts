import { apiFetch } from "./apiClient";

export interface ClusterInfo {
  name: string;
  version: string;
  cloudProvider: string;
  plan: string;
  state: string;
  region: string;
  zones: string[];
  zoneCount: number;
}

export async function getClusterInfo(): Promise<ClusterInfo> {
  return apiFetch<ClusterInfo>("/api/cluster-info");
}
