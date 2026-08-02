import { MEMORY_RECORDS } from "./memoryRecords";
import type { MemoryRecord, MemorySearchResult } from "./types";
import { delay, randomDelay } from "./types";

// Flip to false once NIM embedding + CockroachDB vector index + NIM reranker are wired.
const DEMO_MODE = true;

let liveRecords: MemoryRecord[] = [];

const score = (record: MemoryRecord, query: string) => {
  const q = query.toLowerCase().trim();
  if (!q) return 0.62 + Math.random() * 0.2;
  const haystack = `${record.title} ${record.rootCause} ${record.service} ${record.resolution}`.toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  const hits = terms.filter((t) => haystack.includes(t)).length;
  return Math.min(0.97, 0.44 + (hits / Math.max(terms.length, 1)) * 0.5 + Math.random() * 0.06);
};

export async function searchMemory(query: string): Promise<MemorySearchResult[]> {
  if (DEMO_MODE) {
    await randomDelay();
    const all = [...liveRecords, ...MEMORY_RECORDS];
    return all
      .map((record) => ({
        record,
        similarityScore: score(record, query),
        retrievedAtMs: 8 + Math.round(Math.random() * 26),
        committedLatencyMs: record.committedLatencyMs,
      }))
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 5);
  }
  // TODO: connect search bar to NVIDIA NIM embedding API (query embedding) →
  // CockroachDB vector index query → NVIDIA NIM reranker API (reorder results)
  const res = await fetch(`/api/memory/search?q=${encodeURIComponent(query)}`);
  return (await res.json()) as MemorySearchResult[];
}

export async function getRecord(id: string): Promise<MemoryRecord | null> {
  if (DEMO_MODE) {
    await randomDelay();
    return [...liveRecords, ...MEMORY_RECORDS].find((r) => r.id === id) ?? null;
  }
  // TODO: connect to CockroachDB — SELECT * FROM memory_records WHERE id = $1
  const res = await fetch(`/api/memory/${id}`);
  return (await res.json()) as MemoryRecord;
}

/** Writes a new record and returns it plus the commit latency, immediately queryable. */
export async function writeRecord(input: {
  service: string;
  title: string;
  rootCause: string;
  resolution: string;
}): Promise<MemoryRecord> {
  if (DEMO_MODE) {
    await delay(180 + Math.round(Math.random() * 160));
    const highest = Math.max(...[...liveRecords, ...MEMORY_RECORDS].map((r) => r.recordNumber));
    const record: MemoryRecord = {
      id: `rec-${highest + 1}`,
      recordNumber: highest + 1,
      service: input.service,
      title: input.title,
      rootCause: input.rootCause,
      resolution: input.resolution,
      writtenAt: new Date().toISOString(),
      committedLatencyMs: 120 + Math.round(Math.random() * 240),
    };
    liveRecords = [record, ...liveRecords];
    return record;
  }
  // TODO: connect to CockroachDB — INSERT INTO memory_records (embedding via NVIDIA NIM) RETURNING *
  const res = await fetch("/api/memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await res.json()) as MemoryRecord;
}
