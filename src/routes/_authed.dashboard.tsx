import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Activity, ArrowRight, Clock, Database, GitCompare, ServerCog, Sparkle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SeverityBadge, StatusBadge, timeSince } from "@/components/status-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getClusterStatus } from "@/services/clusterService";
import { listIncidents } from "@/services/incidentService";

export const Route = createFileRoute("/_authed/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Roach Watch incident triage" },
      {
        name: "description",
        content:
          "Live incident feed, triage metrics, and MCP-based CockroachDB cluster introspection for the Roach Watch on-call copilot.",
      },
      { property: "og:title", content: "Dashboard — Roach Watch incident triage" },
      {
        property: "og:description",
        content: "Live incident feed and read-only cluster introspection via the CockroachDB MCP server.",
      },
    ],
  }),
  component: Dashboard,
});

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Activity;
  tone?: "primary" | "healthy";
}) {
  return (
    <Card className="panel">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
          <Icon className={tone === "healthy" ? "h-4 w-4 text-healthy" : "h-4 w-4 text-primary"} />
        </div>
        <div className="mt-3 font-mono text-3xl font-semibold tracking-tight">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

function IntrospectionPanel() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["cluster"], queryFn: getClusterStatus });
  const [inspecting, setInspecting] = useState(false);

  const inspect = async () => {
    setInspecting(true);
    // TODO: connect to CockroachDB Cloud Managed MCP Server (read-only mode) for real cluster state
    await new Promise((r) => setTimeout(r, 1400));
    await queryClient.invalidateQueries({ queryKey: ["cluster"] });
    setInspecting(false);
    toast.success("MCP inspection complete", {
      description: "Agent verified its memory layer health before triaging.",
    });
  };

  const healthy = data?.nodes.filter((n) => n.state === "healthy").length ?? 0;

  return (
    <Card className="panel">
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">Agent Cluster Introspection</CardTitle>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">via MCP · read-only</p>
        </div>
        <Button size="sm" variant="outline" onClick={inspect} disabled={inspecting}>
          <ServerCog className="mr-1.5 h-3.5 w-3.5" />
          {inspecting ? "Agent querying via MCP Server…" : "Ask agent to inspect cluster"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The agent checked its own memory layer's health before triaging — not generic infra metrics.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: "Nodes healthy", v: data ? `${healthy}/${data.nodes.length}` : "—" },
            {
              k: "Replicas under-replicated",
              v: data ? String(data.replicasUnderReplicated) : "—",
            },
            { k: "Active connections", v: data ? String(data.activeConnections) : "—" },
            { k: "Last query latency", v: data ? `${data.lastQueryLatencyMs}ms` : "—" },
          ].map((m) => (
            <div key={m.k} className="rounded-md border border-border bg-elevated/60 p-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {m.k}
              </div>
              <div
                className={`mt-1.5 font-mono text-lg ${inspecting ? "animate-pulse text-muted-foreground" : ""}`}
              >
                {inspecting ? "···" : m.v}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Link
            to="/inspector"
            className="font-mono text-xs text-primary underline-offset-4 hover:underline"
          >
            Open full Cluster Inspector →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { data: incidents, isLoading } = useQuery({ queryKey: ["incidents"], queryFn: listIncidents });
  const { data: cluster } = useQuery({ queryKey: ["cluster"], queryFn: getClusterStatus });

  const active = incidents?.filter((i) => i.status !== "resolved").length ?? 0;
  const healthy = cluster?.nodes.filter((n) => n.state === "healthy").length ?? 0;

  const triage = useMutation({
    mutationFn: async (id: string) => id,
    onSuccess: (id) => navigate({ to: "/chat", search: { incident: id } }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Incident Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The on-call memory that never goes down — because it can't afford to.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active incidents"
          value={String(active)}
          hint="Open or investigating right now"
          icon={Activity}
        />
        <StatCard label="Mean time to triage" value="4m 12s" hint="Down 63% since memory came online" icon={Clock} />
        <StatCard
          label="Memory records stored"
          value={cluster ? cluster.memoryRecords.toLocaleString() : "—"}
          hint="Vector-indexed, immediately queryable"
          icon={Database}
        />
        <StatCard
          label="Cluster nodes healthy"
          value={cluster ? `${healthy}/${cluster.nodes.length}` : "—"}
          hint="CockroachDB roachwatch-prod"
          icon={Sparkle}
          tone="healthy"
        />
      </div>

      <IntrospectionPanel />

      <Card className="panel">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <span className="pulse-ring h-2 w-2 rounded-full bg-primary text-primary" />
            <CardTitle className="text-base">Live incident feed</CardTitle>
          </div>
          <Link to="/incidents" className="font-mono text-xs text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* TODO: replace mock incident feed with CockroachDB query results (real-time incident table) */}
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          {incidents?.map((incident) => (
            <div
              key={incident.id}
              className="rounded-lg border border-border bg-elevated/50 p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={incident.severity} />
                    <StatusBadge status={incident.status} />
                    <Link
                      to="/incidents/$id"
                      params={{ id: incident.id }}
                      className="font-mono text-sm text-primary hover:underline"
                    >
                      {incident.service}
                    </Link>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {incident.id} · {timeSince(incident.triggeredAt)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90">{incident.summary}</p>
                  {incident.matchedRecordId && (
                    <Link
                      to="/memory"
                      search={{ q: incident.summary }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[11px] text-primary transition-colors hover:bg-primary/20"
                    >
                      <GitCompare className="h-3 w-3" />
                      Similar past incident found · {incident.matchedRecordId}
                    </Link>
                  )}
                </div>
                <Button size="sm" onClick={() => triage.mutate(incident.id)}>
                  Triage with Agent
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
