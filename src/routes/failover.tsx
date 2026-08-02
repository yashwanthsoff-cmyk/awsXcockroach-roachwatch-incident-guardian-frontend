import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Power, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ClusterDiagram } from "@/components/cluster-diagram";
import { LogStream } from "@/components/log-stream";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getClusterStatus, killNode, restoreNode } from "@/services/clusterService";

export const Route = createFileRoute("/failover")({
  head: () => ({
    meta: [
      { title: "Failover Demo — Roach Watch" },
      {
        name: "description",
        content:
          "Kill a CockroachDB node live and watch writes keep succeeding — the signature Roach Watch resilience demo.",
      },
      { property: "og:title", content: "Failover Demo — Roach Watch" },
      {
        property: "og:description",
        content: "Kill a node. Writes keep committing. That's the whole pitch.",
      },
    ],
  }),
  component: FailoverDemo,
});

const clock = () => new Date().toISOString().slice(11, 19);

function FailoverDemo() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["cluster"], queryFn: getClusterStatus });
  const [logs, setLogs] = useState<string[]>([]);
  const [writes, setWrites] = useState(0);
  const [outage, setOutage] = useState(false);
  const [shake, setShake] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!outage) {
      if (timer.current) clearInterval(timer.current);
      return;
    }
    timer.current = setInterval(() => {
      setWrites((w) => w + 1);
      const routed = Math.random() > 0.5 ? "Node 1" : "Node 3";
      setLogs((l) =>
        [
          ...l,
          `[${clock()}] INSERT incidents (id, service, payload) ... OK (routed via ${routed}, ${8 + Math.round(Math.random() * 22)}ms)`,
        ].slice(-120),
      );
    }, 400);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [outage]);

  const kill = async () => {
    setBusy(true);
    setShake(2);
    // TODO: replace simulated kill with actual ccloud CLI calls or CockroachDB Cloud API node-drain endpoints
    setLogs((l) => [...l, `[${clock()}] ccloud cluster node drain --node 2 ... issued`]);
    await killNode(2);
    await queryClient.invalidateQueries({ queryKey: ["cluster"] });
    setLogs((l) => [
      ...l,
      `[${clock()}] node 2 status=down · leases transferred`,
      `[${clock()}] range rebalancing started (8 ranges under-replicated)`,
    ]);
    setOutage(true);
    setBusy(false);
    setTimeout(() => setShake(null), 600);
    toast.error("Node 2 down", {
      description: "Cluster continues serving reads/writes.",
    });
  };

  const restore = async () => {
    setBusy(true);
    setOutage(false);
    await restoreNode(2);
    await queryClient.invalidateQueries({ queryKey: ["cluster"] });
    setLogs((l) => [
      ...l,
      `[${clock()}] ccloud cluster node restore --node 2 ... OK`,
      `[${clock()}] node 2 rejoined · 0 ranges under-replicated`,
    ]);
    setWrites(0);
    setBusy(false);
    toast.success("Node 2 restored", { description: "Cluster back to 3/3 healthy." });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Failover Demo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The memory layer survives node loss without dropping a single write.
        </p>
      </div>

      <Card className="panel">
        <CardContent className="space-y-6 p-6">
          {isLoading || !data ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ClusterDiagram nodes={data.nodes} shakeNodeId={shake} />
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={kill}
              disabled={busy || outage}
              className="border-critical/60 text-critical hover:bg-critical/10 hover:text-critical"
            >
              <Power className="mr-1.5 h-4 w-4" />
              Kill Node 2
            </Button>
            <Button variant="secondary" onClick={restore} disabled={busy || !outage}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Restore Node 2
            </Button>
          </div>

          <div className="mx-auto max-w-sm rounded-lg border border-primary/40 bg-primary/10 p-5 text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary/80">
              Writes succeeded during outage
            </div>
            <div key={writes} className="tick-in mt-2 font-mono text-5xl font-semibold text-primary">
              {writes.toLocaleString()}
            </div>
            <div className="mt-1 font-mono text-[11px] text-muted-foreground">
              {outage ? "streaming · node 2 offline" : "idle · cluster healthy"}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Write log</CardTitle>
          <p className="font-mono text-[11px] text-muted-foreground">
            {/* TODO: replace mock write counter with real write throughput metrics via the MCP Server */}
            tail -f roachwatch-prod/sql.log
          </p>
        </CardHeader>
        <CardContent>
          <LogStream lines={logs} className="h-64" emptyLabel="// waiting for a node failure…" />
        </CardContent>
      </Card>
    </div>
  );
}
