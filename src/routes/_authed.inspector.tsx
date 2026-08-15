import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Globe, Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { LogStream } from "@/components/log-stream";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getClusterInfo } from "@/services/clusterInfoService";
import { listInspections, runInspection } from "@/services/mcpService";

export const Route = createFileRoute("/_authed/inspector")({
  head: () => ({
    meta: [
      { title: "Cluster Inspector - Roach Watch" },
      {
        name: "description",
        content:
          "Watch the agent inspect its own memory layer through the read-only CockroachDB MCP server, step by step.",
      },
    ],
  }),
  component: ClusterInspector,
});

function ClusterInspector() {
  const { data: cluster, isLoading } = useQuery({
    queryKey: ["cluster-info"],
    queryFn: getClusterInfo,
  });
  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ["inspections"],
    queryFn: listInspections,
  });
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setLines([]);
    const { run: result } = await runInspection((step) => setLines((l) => [...l, step]));
    setRunning(false);
    await refetchHistory();
    toast.success(`Inspection ${result.id} complete`, {
      description: `${result.result} - ${result.durationMs}ms`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cluster Inspector</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The agent inspects its own memory layer via the MCP server - read-only, no mutations possible.
        </p>
      </div>

      <Card className="panel">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Live cluster state</CardTitle>
          <Button size="sm" onClick={run} disabled={running}>
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {running ? "Inspecting via MCP..." : "Run Inspection"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading || !cluster ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Every field below is real, from a live MCP get_cluster call - no simulated node data.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { k: "Cluster", v: cluster.name },
                  { k: "Version", v: cluster.version },
                  { k: "Plan", v: cluster.plan },
                  { k: "State", v: cluster.state },
                ].map((m) => (
                  <div key={m.k} className="rounded-md border border-border bg-elevated/60 p-3">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {m.k}
                    </div>
                    <div className="mt-1.5 font-mono text-lg">{m.v}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cluster.zones.map((z) => (
                  <span
                    key={z}
                    className="rounded border border-border bg-elevated px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    <Globe className="mr-1 inline h-2.5 w-2.5" />
                    {z}
                  </span>
                ))}
              </div>
            </div>
          )}
          <LogStream lines={lines} emptyLabel="// run an inspection to stream MCP tool calls" />
        </CardContent>
      </Card>

      <Card className="panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inspection history</CardTitle>
          <p className="font-mono text-[11px] text-muted-foreground">
            this session only - backend does not persist inspection history yet
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Run</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Started</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Result</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history?.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-mono text-xs text-primary">{h.id}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(h.startedAt).toISOString().replace("T", " ").slice(0, 19)}Z
                  </TableCell>
                  <TableCell
                    className={
                      h.result === "healthy" ? "font-mono text-xs text-healthy" : "font-mono text-xs text-degraded"
                    }
                  >
                    {h.result}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{h.durationMs}ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
