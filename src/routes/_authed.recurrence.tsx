import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, RefreshCw, ShieldAlert, ShieldCheck, ShieldX, Clock, TrendingDown, Gauge, History } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { RiskBadge } from "@/components/status-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { checkAll, checkOne, listWatched } from "@/services/recurrenceService";
import { getLearningStats, confirmFixWorked } from "@/services/learningService";
import { runValidation, type ValidationResult } from "@/services/validationService";

export const Route = createFileRoute("/_authed/recurrence")({
  head: () => ({
    meta: [
      { title: "Recurrence Watch - Roach Watch" },
      {
        name: "description",
        content: "The agent re-checks resolved incidents against live system state to catch regressions before they page anyone.",
      },
    ],
  }),
  component: RecurrenceWatch,
});

function LearningStatsCard() {
  const { data } = useQuery({ queryKey: ["learning-stats"], queryFn: getLearningStats });

  return (
    <Card className="panel border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Self-Improving Memory</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Trust in a past fix is grounded in whether it actually held over time - confirmed by a human, then
          automatically re-checked against live recurrence data.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md border border-border bg-elevated/60 p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Confirmed fixes</div>
            <div className="mt-1.5 flex items-center gap-1.5 font-mono text-2xl">
              <CheckCircle2 className="h-4 w-4 text-healthy" />
              {data ? data.confirmedFixes : "-"}
            </div>
          </div>
          <div className="rounded-md border border-border bg-elevated/60 p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Later regressed</div>
            <div className="mt-1.5 flex items-center gap-1.5 font-mono text-2xl">
              <TrendingDown className="h-4 w-4 text-regression" />
              {data ? data.fixesThatRegressed : "-"}
            </div>
          </div>
          <div className="rounded-md border border-border bg-elevated/60 p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Avg. effectiveness</div>
            <div className="mt-1.5 font-mono text-2xl">
              {data?.avgEffectiveness != null ? `${Math.round(data.avgEffectiveness * 100)}%` : "-"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ValidationStatusBadge({ status }: { status: ValidationResult["status"] }) {
  if (status === "validated") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-healthy/40 bg-healthy/10 px-2 py-0.5 font-mono text-[11px] text-healthy">
        <ShieldCheck className="h-3 w-3" />
        validated
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-regression/40 bg-regression/10 px-2 py-0.5 font-mono text-[11px] text-regression">
        <ShieldX className="h-3 w-3" />
        failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-elevated/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
      <Clock className="h-3 w-3" />
      pending
    </span>
  );
}

function ValidationCard() {
  const [results, setResults] = useState<ValidationResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const queryClient = useQueryClient();

  const run = async () => {
    setRunning(true);
    try {
      const data = await runValidation();
      setResults(data);
      queryClient.invalidateQueries({ queryKey: ["learning-stats"] });
      const failed = data.filter((r) => r.status === "failed").length;
      if (failed > 0) {
        toast.warning(`${failed} fix${failed === 1 ? "" : "es"} failed validation`, {
          description: "A real recurrence was detected against a confirmed fix.",
        });
      } else if (data.length > 0) {
        toast.success("Validation pass complete", { description: "No failures found among confirmed fixes." });
      } else {
        toast.info("No confirmed fixes to validate yet");
      }
    } catch (err) {
      toast.error("Validation pass failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="panel border-primary/30">
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">Fix Validation</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Automatic, evidence-based validation - a fix is only marked validated once it has genuinely held clean
            for real elapsed time, using actual recurrence detection. No fabricated before/after metrics.
          </p>
        </div>
        <Button size="sm" onClick={run} disabled={running}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} />
          {running ? "Validating..." : "Run Validation Pass"}
        </Button>
      </CardHeader>
      {results && (
        <CardContent className="space-y-2">
          {results.length === 0 && (
            <p className="text-xs text-muted-foreground">No human-confirmed fixes to validate yet.</p>
          )}
          {results.map((r) => (
            <div
              key={r.incidentId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-elevated/40 px-3 py-2"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ValidationStatusBadge status={r.status} />
                  <Link to="/incidents/$id" params={{ id: r.incidentId }} className="font-mono text-xs text-primary hover:underline">
                    {r.incidentId}
                  </Link>
                  <span className="font-mono text-xs text-muted-foreground">{r.service}</span>
                  <span className="font-mono text-[10px] text-muted-foreground/70">{r.daysHeld}d held</span>
                </div>
                <p className="text-xs text-muted-foreground">{r.explanation}</p>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

function ConfidenceBadge({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const tone =
    pct >= 55 ? "border-regression/40 bg-regression/10 text-regression"
    : pct >= 30 ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
    : "border-border bg-elevated/60 text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] ${tone}`}>
      <Gauge className="h-3 w-3" />
      {pct}% recurrence confidence
    </span>
  );
}

function RecurrenceWatch() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ["recurrence"], queryFn: listWatched });
  const [running, setRunning] = useState<string | "all" | null>(null);
  const queryClient = useQueryClient();

  const confirmMutation = useMutation({
    mutationFn: (incidentId: string) => confirmFixWorked(incidentId),
    onSuccess: () => {
      toast.success("Fix confirmed as effective", { description: "This record is now trusted higher in future search." });
      queryClient.invalidateQueries({ queryKey: ["learning-stats"] });
      refetch();
    },
    onError: (err) => {
      toast.error("Could not confirm fix", { description: err instanceof Error ? err.message : "Unknown error" });
    },
  });

  const runAll = async () => {
    setRunning("all");
    const results = await checkAll();
    setRunning(null);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["learning-stats"] });
    const regressions = results.filter((r) => r.regression).length;
    if (regressions > 0) {
      toast.warning(`${regressions} possible regression detected`, { description: "Live state matches the pre-fix signature." });
    } else {
      toast.success("All watched resolutions still holding");
    }
  };

  const runOne = async (id: string) => {
    setRunning(id);
    await checkOne(id);
    setRunning(null);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["learning-stats"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recurrence Watch</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The agent periodically re-checks resolved incidents against live system state to catch regressions before they page anyone.
          </p>
        </div>
        <Button onClick={runAll} disabled={running !== null}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${running === "all" ? "animate-spin" : ""}`} />
          {running === "all" ? "Re-checking resolutions..." : "Run Recurrence Check Now"}
        </Button>
      </div>

      <LearningStatsCard />
      <ValidationCard />

      <Card className="panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Watched resolutions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          {data?.map((w) => (
            <div
              key={w.incidentId}
              className={`rounded-lg border p-4 ${w.regression ? "border-regression/50 bg-regression/5" : "border-border bg-elevated/40"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <RiskBadge risk={w.risk} regression={w.regression} />
                    <ConfidenceBadge pct={w.confidencePct} />
                    {w.effectivenessDowngraded && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-regression/40 bg-regression/10 px-2 py-0.5 font-mono text-[11px] text-regression">
                        <TrendingDown className="h-3 w-3" />
                        Fix trust downgraded
                      </span>
                    )}
                    <Link to="/incidents/$id" params={{ id: w.incidentId }} className="font-mono text-xs text-primary hover:underline">
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

                  {w.matchedIncidentText && (
                    <div className="flex items-start gap-1.5 rounded-md border border-border bg-elevated/40 px-2 py-1.5 text-xs text-muted-foreground">
                      <History className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        <span className="font-mono text-foreground/70">matched: </span>
                        {w.matchedIncidentText}
                        {w.daysSinceResolution != null && (
                          <span className="text-foreground/50"> ({w.daysSinceResolution.toFixed(1)} days after resolution)</span>
                        )}
                      </span>
                    </div>
                  )}

                  <p className={`flex items-center gap-1.5 text-xs ${w.regression ? "text-regression" : "text-muted-foreground"}`}>
                    {w.regression && <ShieldAlert className="h-3.5 w-3.5 shrink-0" />}
                    <span>{w.signal}</span>
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground/70">
                    checked {new Date(w.lastCheckedAt).toISOString().replace("T", " ").slice(0, 16)}Z
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => runOne(w.incidentId)} disabled={running !== null}>
                    {running === w.incidentId ? "Checking..." : "Re-check"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => confirmMutation.mutate(w.incidentId)}
                    disabled={confirmMutation.isPending}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Confirm fix worked
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
