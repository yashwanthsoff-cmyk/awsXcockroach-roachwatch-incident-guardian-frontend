import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { SeverityBadge, StatusBadge, timeSince } from "@/components/status-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { listIncidents } from "@/services/incidentService";

export const Route = createFileRoute("/_authed/incidents/")({
  head: () => ({
    meta: [
      { title: "Incidents — Roach Watch" },
      {
        name: "description",
        content: "Every ingested incident with severity, status, and matched memory records.",
      },
      { property: "og:title", content: "Incidents — Roach Watch" },
      { property: "og:description", content: "Every ingested incident with severity and matched memory." },
    ],
  }),
  component: IncidentList,
});

function IncidentList() {
  const { data, isLoading } = useQuery({ queryKey: ["incidents"], queryFn: listIncidents });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Incidents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ingested alerts, triage state, and memory matches.
        </p>
      </div>

      <Card className="panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All incidents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* TODO: replace with CockroachDB query results (incidents table, paginated) */}
          {isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          {data?.map((incident) => (
            <div
              key={incident.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-elevated/40 px-4 py-3"
            >
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
              <span className="font-mono text-xs text-muted-foreground">{incident.id}</span>
              <span className="font-mono text-sm text-primary">{incident.service}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground/85">{incident.summary}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {timeSince(incident.triggeredAt)}
              </span>
              <Button asChild size="sm" variant="outline">
                <Link to="/incidents/$id" params={{ id: incident.id }}>
                  Open
                </Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
