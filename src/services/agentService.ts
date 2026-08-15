import type { AgentReply } from "./types";
import { apiFetch } from "./apiClient";

interface ChatResponse {
  text: string;
  citedRecords: AgentReply["citedRecords"];
  evidence: AgentReply["evidence"];
  toolsUsed: string[];
  trace: AgentReply["trace"];
  totalDurationMs: number;
}

/**
 * Real chat endpoint - each message runs a genuine pipeline: MCP health
 * check, NIM embedding, NIM reranking against stored incidents, then Groq
 * reasoning grounded in whatever was actually retrieved. citedRecords,
 * evidence, and trace below are real data from that pipeline.
 */
export async function sendMessage(incidentId: string, message: string, history?: Array<{ role: string; text: string }>): Promise<AgentReply> {
  const result = await apiFetch<ChatResponse>("/api/agent/message", {
    method: "POST",
    body: JSON.stringify({ incidentId, message, history }),
  });

  return {
    text: result.text,
    citedRecords: result.citedRecords,
    evidence: result.evidence,
    toolsUsed: result.toolsUsed,
    trace: result.trace,
    totalDurationMs: result.totalDurationMs,
  };
}
