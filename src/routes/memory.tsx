import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, PlusCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { ScoreBar } from "@/components/status-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { searchMemory, writeRecord } from "@/services/memoryService";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/memory")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s["q"] === "string" ? (s["q"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Memory Explorer — Roach Watch" },
      {
        name: "description",
        content:
          "Semantic search over past incidents with similarity scores and write→read provenance stamps down to the millisecond.",
      },
      { property: "og:title", content: "Memory Explorer — Roach Watch" },
      {
        property: "og:description",
        content: "Ask the memory anything — provenance-stamped retrieval with no indexing delay.",
      },
    ],
  }),
  component: MemoryExplorer,
});

type Stage = 0 | 1 | 2 | 3;

function MemoryExplorer() {
  const { q } = Route.useSearch();
  const [input, setInput] = useState(q);
  const [query, setQuery] = useState(q);
  const [stage, setStage] = useState<Stage>(0);
  const [commitMs, setCommitMs] = useState<number | null>(null);

  useEffect(() => {
    setInput(q);
    setQuery(q);
  }, [q]);

  const { data, isFetching } = useQuery({
    queryKey: ["memory", query],
    queryFn: () => searchMemory(query),
  });

  const simulate = async () => {
    setStage(1);
    // TODO: replace with a real INSERT via CockroachDB + NVIDIA NIM embedding of the new record
    const record = await writeRecord({
      service: "cart-service",
      title: "Elevated 5xx on PUT /cart/items after pool resize",
      rootCause: "Cart pool resized without draining, leaving half the pods on the old pool size.",
      resolution: "Rolled restart with drain, verified pool utilization below 60%.",
    });
    setCommitMs(record.committedLatencyMs);
    setStage(2);
    setQuery(record.title);
    setInput(record.title);
    setTimeout(() => setStage(3), 500);
  };

  const steps = [
    { label: "Write commits", detail: commitMs ? `${commitMs}ms` : "…" },
    { label: "Immediately queryable", detail: "0ms indexing delay" },
    { label: "Appears in search results", detail: "same view" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Memory Explorer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Synchronous retrieval with provenance — every result says exactly where it came from and how fast
          it committed.
        </p>
      </div>

      <Card className="panel">
        <CardContent className="p-4">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(input);
            }}
          >
            <div className="relative min-w-64 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the memory anything…"
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={isFetching}>
              {isFetching ? "Retrieving…" : "Search memory"}
            </Button>
            <Button type="button" variant="outline" onClick={simulate} disabled={stage === 1}>
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Simulate new incident
            </Button>
          </form>
          {/* TODO: connect search bar to NVIDIA NIM embedding API (query embedding) → CockroachDB
              vector index query → NVIDIA NIM reranker API (reorder results) */}
        </CardContent>
      </Card>

      {stage > 0 && (
        <Card className="panel border-primary/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Write → Read, live</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              {steps.map((step, i) => (
                <div key={step.label} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 transition-all duration-500",
                      stage > i
                        ? "border-healthy/50 bg-healthy/10 text-healthy"
                        : "border-border bg-elevated/50 text-muted-foreground",
                    )}
                  >
                    {stage > i ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                    )}
                    <span className="text-xs font-medium">{step.label}</span>
                    <span className="font-mono text-[11px] opacity-80">{step.detail}</span>
                  </div>
                  {i < steps.length - 1 && <span className="font-mono text-muted-foreground">→</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {isFetching && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        {!isFetching &&
          data?.map((result) => (
            <Card key={result.record.id} className="panel">
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-primary">
                      {result.record.service} · {result.record.id}
                    </div>
                    <h2 className="mt-1 text-sm font-medium">{result.record.title}</h2>
                  </div>
                  <ScoreBar value={result.similarityScore} />
                </div>
                <p className="text-sm text-muted-foreground">{result.record.rootCause}</p>
                <p className="text-xs text-foreground/70">Resolution: {result.record.resolution}</p>
                <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-[11px] text-primary">
                  Retrieved from record #{result.record.recordNumber}, written{" "}
                  {new Date(result.record.writtenAt).toISOString().replace("T", " ").slice(0, 16)} UTC,
                  committed in {result.committedLatencyMs}ms · read served in {result.retrievedAtMs}ms
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
