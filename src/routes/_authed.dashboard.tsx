import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Activity, ArrowRight, CheckCircle2, Database, GitCompare, Globe, Radio, ServerCog, Webhook } from "lucide-react";
import { toast } from "sonner";

import { SeverityBadge, StatusBadge, timeSince } from "@/components/status-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listIncidents } from "@/services/incidentService";
import { getStats } from "@/services/statsService";
import { getClusterInfo } from "@/services/clusterInfoService";
import { simulateAlert, type SimulatedAlertKind } from "@/services/webhookService";

export const Route = createFileRoute("/_authed/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard - Roach Watch" },
      {
        name: "description",
        content:
          "Live incident feed and real triage metrics for the Roach Watch on-call copilot, backed by CockroachDB.",
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

function ClusterInfoPanel() {
  const { data: cluster, isLoading } = useQuery({ queryKey: ["cluster-info"], queryFn: getClusterInfo });

  return (
    <Card className="panel">
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">Cluster Introspection</CardTitle>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">via CockroachDB Managed MCP Server</p>
        </div>
        <ServerCog className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Every field below comes from a live MCP call against the real cluster - not simulated. CockroachDB
          Serverless does not report per-node health on this plan, so no node count is shown here.
        </p>
        {isLoading && <Skeleton className="h-24 w-full" />}
        {cluster && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: "Cluster", v: cluster.name },
              { k: "Version", v: cluster.version },
              { k: "Region", v: cluster.region },
              { k: "Availability zones", v: String(cluster.zoneCount) },
            ].map((m) => (
              <div key={m.k} className="rounded-md border border-border bg-elevated/60 p-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{m.k}</div>
                <div className="mt-1.5 font-mono text-lg">{m.v}</div>
              </div>
            ))}
          </div>
        )}
        {cluster && (
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
        )}
      </CardContent>
    </Card>
  );
}

const SIMULATE_OPTIONS: { kind: SimulatedAlertKind; label: string }[] = [
  { kind: "datadog", label: "Simulate Datadog Alert" },
  { kind: "pagerduty", label: "Simulate PagerDuty Alert" },
  { kind: "cloudwatch", label: "Simulate CloudWatch Alarm" },
];

function SimulateAlertPanel() {
  const navigate = useNavigate();

  const simulate = useMutation({
    mutationFn: (kind: SimulatedAlertKind) => simulateAlert(kind),
    onSuccess: (result) => {
      toast.success(`Incident created from simulated ${result.simulatedKind} alert`, {
        description: `${result.incident.service} - status: ${result.incident.status.replace("_", " ")}`,
      });
      navigate({ to: "/incidents/$id", params: { id: result.incident.id } });
    },
    onError: (err) => {
      toast.error("Simulated alert failed", { description: err instanceof Error ? err.message : "Unknown error" });
    },
  });

  return (
    <Card className="panel border-primary/30">
      <CardHeader className="flex-row items-start gap-3 pb-3">
        <Webhook className="mt-0.5 h-4 w-4 text-primary" />
        <div>
          <CardTitle className="text-base">Simulate External Alert</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Sends a realistic sample payload through the real webhook normalization + ingestion pipeline - the
            same path a live Datadog, PagerDuty, or CloudWatch integration would use.
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {SIMULATE_OPTIONS.map((opt) => (
          <Button
            key={opt.kind}
            size="sm"
            variant="outline"
            onClick={() => simulate.mutate(opt.kind)}
            disabled={simulate.isPending}
          >
            <Radio className="mr-1.5 h-3.5 w-3.5" />
            {simulate.isPending && simulate.variables === opt.kind ? "Sending..." : opt.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { data: incidents, isLoading } = useQuery({ queryKey: ["incidents"], queryFn: listIncidents });
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats });

  const triage = useMutation({
    mutationFn: async (id: string) => id,
    onSuccess: (id) => navigate({ to: "/chat", search: { incident: id } }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Incident Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The on-call memory that never goes down - because it can't afford to.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active incidents"
          value={stats ? String(stats.activeIncidents) : "-"}
          hint="Open, investigating, or fix proposed"
          icon={Activity}
        />
        <StatCard
          label="Resolved incidents"
          value={stats ? String(stats.resolvedIncidents) : "-"}
          hint="Closed out, watched for recurrence"
          icon={CheckCircle2}
          tone="healthy"
        />
        <StatCard
          label="Analyzed by agent"
          value={stats ? String(stats.analyzedIncidents) : "-"}
          hint={stats ? `of ${stats.totalIncidents} total incidents` : "Root cause + fix generated"}
          icon={Database}
        />
        <StatCard
          label="Total incidents"
          value={stats ? String(stats.totalIncidents) : "-"}
          hint="All-time, this cluster"
          icon={ServerCog}
          tone="healthy"
        />
      </div>

      <ClusterInfoPanel />

      <SimulateAlertPanel />

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
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          {incidents?.slice(0, 8).map((incident) => (
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
                      {incident.id} - {timeSince(incident.triggeredAt)}
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
                      Similar past incident found - {incident.matchedRecordId}
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
