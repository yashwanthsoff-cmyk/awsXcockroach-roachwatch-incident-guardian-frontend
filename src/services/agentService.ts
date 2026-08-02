import { MEMORY_RECORDS, findRecord } from "./memoryRecords";
import type { AgentReply } from "./types";
import { delay } from "./types";

// Flip to false once the Groq chat-completion route is live.
const DEMO_MODE = true;

const CANNED: Array<Omit<AgentReply, "citedRecords"> & { records: string[] }> = [
  {
    text: "I pulled the alert payload and checked my own memory layer health via the MCP server first (3/3 nodes healthy, last query 11ms). pool_utilization is pinned at 0.98 while request rate is 2.1x baseline — this is acquisition queueing, not slow SQL. I found a near-identical prior incident in memory.",
    toolsUsed: ["CockroachDB MCP", "NIM Embed", "NIM Rerank", "Groq"],
    records: ["rec-4471"],
  },
  {
    text: "Recommended mitigation, in order: 1) raise max_conns from 20 to 80 on checkout-api, 2) confirm p99 falls below 800ms within 3 minutes, 3) add a pool saturation alert at 70% so this pages earlier next time. The prior fix held for 6 weeks, so I'd expect the same result here.",
    toolsUsed: ["Groq", "NIM Rerank"],
    records: ["rec-4471", "rec-4098"],
  },
  {
    text: "Blast radius check: only POST /checkout and POST /checkout/confirm share this pool. Cart reads are on a separate pool at 31% utilization, so carts should be unaffected. I also see one adjacent memory record about stale follower reads in the same service — unrelated cause, but worth noting during the postmortem.",
    toolsUsed: ["CockroachDB MCP", "Groq"],
    records: ["rec-4098"],
  },
  {
    text: "I drafted a postmortem from this conversation and the matched record. Once you save it, it is committed to memory and immediately retrievable — no background indexing window — so the next occurrence of this failure mode matches against it right away.",
    toolsUsed: ["Groq", "NIM Embed", "CockroachDB MCP"],
    records: ["rec-4402"],
  },
];

let turn = 0;

export async function sendMessage(incidentId: string, message: string): Promise<AgentReply> {
  if (DEMO_MODE) {
    await delay(400 + Math.round(Math.random() * 500));
    const canned = CANNED[turn % CANNED.length]!;
    turn += 1;
    return {
      text: canned.text,
      citedRecords: canned.records.map(findRecord).filter((r): r is (typeof MEMORY_RECORDS)[number] => !!r),
      toolsUsed: canned.toolsUsed,
    };
  }
  // TODO: root cause + reasoning come from a Groq API chat completion; cited records come from the
  // NVIDIA NIM embedding + reranker pipeline over the CockroachDB vector index
  const res = await fetch("/api/agent/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ incidentId, message }),
  });
  return (await res.json()) as AgentReply;
}
