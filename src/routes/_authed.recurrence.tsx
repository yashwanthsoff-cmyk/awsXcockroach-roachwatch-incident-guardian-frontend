import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { RiskBadge } from "@/components/status-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { checkAll, checkOne, listWatched } from "@/services/recurrenceService";

export const Route = createFileRoute("/_authed/recurrence")({
  head: () => ({
    meta: [
      { title: "Recurrence Watch — Roach Watch" },
      {
        name: "description",
        content:
          "The agent re-checks resolved incidents against live system state to catch regressions before they page anyone.",
      },
      { property: "og:title", content: "Recurrence Watch — Roach Watch" },
      {
        property: "og:description",
        content: "Self-healing memory validation loop: catch regressions before they become incidents.",
      },
    ],
  }),
  component: RecurrenceWatch,
});

function RecurrenceWatch() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ["recurrence"], queryFn: listWatched });
  const [running, setRunning] = useState<string | "all" | null>(null);

  const runAll = async () => {
    setRunning("all");
    // TODO: connect to the scheduled AWS Lambda recurrence job querying CockroachDB
    const results = await checkAll();
    setRunning(null);
    await refetch();
    const regressions = results.filter((r) => r.regression).length;
    if (regressions > 0) {
      toast.warning(`${regressions} possible regression detected`, {
        description: "Live state matches the pre-fix signature.",
      });
    } else {
      toast.success("All watched resolutions still holding");
    }
  };

  const runOne = async (id: string) => {
    setRunning(id);
    await checkOne(id);
    setRunning(null);
    await refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recurrence Watch</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The agent periodically re-checks resolved incidents against live system state to catch
            regressions before they page anyone.
          </p>
        </div>
        <Button onClick={runAll} disabled={running !== null}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${running === "all" ? "animate-spin" : ""}`} />
          {running === "all" ? "Re-checking resolutions…" : "Run Recurrence Check Now"}
        </Button>
      </div>

      <Card className="panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Watched resolutions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          {data?.map((w) => (
            <div
              key={w.incidentId}
              className={`rounded-lg border p-4 ${
                w.regression ? "border-regression/50 bg-regression/5" : "border-border bg-elevated/40"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <RiskBadge risk={w.risk} regression={w.regression} />
                    <Link
                      to="/incidents/$id"
                      params={{ id: w.incidentId }}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {w.incidentId}
                    </Link>
                    <span className="font-mono text-xs text-muted-foreground">{w.service}</span>
                  </div>
                  <p className="text-sm font-medium">{w.title}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono text-foreground/70">root cause:</span> {w.rootCause}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono text-foreground/70">fix:</span> {w.fixSummary}
                  </p>
                  <p
                    className={`flex items-center gap-1.5 font-mono text-[11px] ${
                      w.regression ? "text-regression" : "text-muted-foreground"
                    }`}
                  >
                    {w.regression && <ShieldAlert className="h-3.5 w-3.5" />}
                    {w.signal} · checked{" "}
                    {new Date(w.lastCheckedAt).toISOString().replace("T", " ").slice(0, 16)}Z
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runOne(w.incidentId)}
                  disabled={running !== null}
                >
                  {running === w.incidentId ? "Checking…" : "Re-check"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
