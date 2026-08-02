import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { checkAllHealth, checkHealth } from "@/services/toolStatusService";
import type { ToolHealth, ToolName } from "@/services/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Tools — Roach Watch" },
      {
        name: "description",
        content:
          "Connection status for Groq, NVIDIA NIM embedding and reranking, CockroachDB, the CockroachDB MCP server, and AWS.",
      },
      { property: "og:title", content: "Settings & Tools — Roach Watch" },
      { property: "og:description", content: "Live health checks for every service in the Roach Watch stack." },
    ],
  }),
  component: SettingsPage,
});

function statusPill(status: ToolHealth["status"]) {
  const map = {
    connected: "border-healthy/40 bg-healthy/15 text-healthy",
    degraded: "border-degraded/40 bg-degraded/15 text-degraded",
    not_configured: "border-border bg-muted text-muted-foreground",
  } as const;
  return (
    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase ${map[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function SettingsPage() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ["tool-health"], queryFn: checkAllHealth });
  const [rows, setRows] = useState<Partial<Record<ToolName, ToolHealth>>>({});
  const [testing, setTesting] = useState<ToolName | null>(null);

  const test = async (tool: ToolName) => {
    setTesting(tool);
    const result = await checkHealth(tool);
    setRows((r) => ({ ...r, [tool]: result }));
    setTesting(null);
  };

  const merged = data?.map((row) => rows[row.tool] ?? row);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings / Tools</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every service in the stack, named and accounted for. Health checks are live, not simulated.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          Re-check all
        </Button>
      </div>

      <Card className="panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Service connections</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-[10px] uppercase tracking-widest">Tool</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-widest">Status</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-widest">Latency</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-widest">
                    Last checked
                  </TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {merged?.map((row) => (
                  <TableRow key={row.tool}>
                    <TableCell>
                      <div className="text-sm font-medium">{row.tool}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{row.detail}</div>
                    </TableCell>
                    <TableCell>{statusPill(row.status)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.latencyMs === null ? "—" : `${row.latencyMs}ms`}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(row.lastChecked).toISOString().replace("T", " ").slice(0, 19)}Z
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => test(row.tool)}
                        disabled={testing === row.tool}
                      >
                        {testing === row.tool ? "Testing…" : "Test Connection"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
