import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BrainCircuit, MessageSquare, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CitationCard, SeverityBadge, StatusBadge, timeSince } from "@/components/status-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getIncident } from "@/services/incidentService";
import { getRecord, writeRecord } from "@/services/memoryService";

export const Route = createFileRoute("/_authed/incidents/$id")({
  head: () => ({
    meta: [
      { title: "Incident detail — Roach Watch" },
      {
        name: "description",
        content: "Raw alert payload, agent root-cause analysis with confidence score, and postmortem draft.",
      },
      { property: "og:title", content: "Incident detail — Roach Watch" },
      { property: "og:description", content: "Agent root-cause analysis with memory-backed provenance." },
    ],
  }),
  component: IncidentDetail,
});

function IncidentDetail() {
  const { id } = Route.useParams();
  const { data: incident, isLoading } = useQuery({
    queryKey: ["incident", id],
    queryFn: () => getIncident(id),
  });
  const { data: matched } = useQuery({
    queryKey: ["record", incident?.matchedRecordId],
    queryFn: () => getRecord(incident!.matchedRecordId!),
    enabled: !!incident?.matchedRecordId,
  });

  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (incident) {
      setDraft(
        incident.postmortemDraft ??
          `Summary: ${incident.service} — ${incident.summary}\n\nRoot cause: ${incident.rootCause ?? "pending agent analysis"}\n\nFix: pending\n\nFollow-ups: pending`,
      );
    }
  }, [incident]);

  const save = async () => {
    if (!incident) return;
    setSaving(true);
    const record = await writeRecord({
      service: incident.service,
      title: incident.summary,
      rootCause: incident.rootCause ?? "Recorded from postmortem draft.",
      resolution: draft.slice(0, 240),
    });
    setSaving(false);
    toast.success(`Committed to memory as record #${record.recordNumber}`, {
      description: `Write committed in ${record.committedLatencyMs}ms — immediately queryable.`,
    });
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!incident) return <p className="text-sm text-muted-foreground">Incident not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
            <span className="font-mono text-xs text-muted-foreground">{incident.id}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{incident.service}</h1>
          <p className="text-sm text-muted-foreground">
            {incident.summary} · triggered {timeSince(incident.triggeredAt)}
          </p>
        </div>
        <Button asChild>
          <Link to="/chat" search={{ incident: incident.id }}>
            <MessageSquare className="mr-1.5 h-4 w-4" />
            Triage with Agent
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="panel">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Raw alert payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md border border-border bg-background/70 p-4 font-mono text-xs leading-relaxed text-foreground/85">
              {JSON.stringify(incident.alertPayload, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card className="panel">
          <CardHeader className="flex-row items-center gap-2 pb-3">
            <BrainCircuit className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Agent Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* TODO: root cause + confidence score come from Groq API reasoning call; similar-incident
                match comes from NVIDIA NIM embedding + reranker pipeline over CockroachDB vector index */}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Proposed root cause
              </div>
              <p className="mt-1.5 text-sm text-foreground/90">
                {incident.rootCause ?? "Agent has not analysed this incident yet."}
              </p>
            </div>
            {incident.confidence !== undefined && (
              <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2">
                <span className="font-mono text-2xl text-primary">{incident.confidence}%</span>
                <span className="text-xs text-muted-foreground">
                  match confidence against memory (NIM rerank score)
                </span>
              </div>
            )}
            {matched && (
              <div className="space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Similar incident from memory
                </div>
                <CitationCard record={matched} />
                <p className="text-xs text-muted-foreground">{matched.rootCause}</p>
                <Link
                  to="/memory"
                  search={{ q: matched.title }}
                  className="font-mono text-xs text-primary hover:underline"
                >
                  View full memory record →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Postmortem draft</CardTitle>
          <p className="font-mono text-[11px] text-muted-foreground">
            auto-generated · saving writes a new record back to memory
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-48 font-mono text-xs"
          />
          <Button onClick={save} disabled={saving}>
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? "Committing to memory…" : "Save to Memory"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
