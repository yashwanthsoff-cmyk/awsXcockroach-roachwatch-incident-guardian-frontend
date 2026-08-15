import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useEffect, useRef, useState } from "react";

import { SeverityBadge } from "@/components/status-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "@/services/agentService";
import { listIncidents } from "@/services/incidentService";
import type { CitedRecord, Evidence, TraceStep } from "@/services/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/chat")({
  validateSearch: (s: Record<string, unknown>) => ({
    incident: typeof s["incident"] === "string" ? (s["incident"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Agent Chat - Roach Watch triage" },
      {
        name: "description",
        content:
          "Triage an incident with the Roach Watch agent: Groq reasoning, NIM embedding and reranking, and inline memory citations.",
      },
    ],
  }),
  component: AgentChat,
});

const TOOLS = ["Groq", "NIM Embed", "NIM Rerank", "CockroachDB MCP"] as const;
const STORAGE_PREFIX = "roachwatch_chat_";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
  citedRecords?: CitedRecord[];
  evidence?: Evidence;
  toolsUsed?: string[];
  trace?: TraceStep[];
  totalDurationMs?: number;
}

/**
 * Backed by sessionStorage, not just an in-memory Map - a JS-memory-only
 * cache does not survive a page reload or a dev-server hot-reload, both
 * of which happen routinely while actively developing. sessionStorage
 * survives those, and only clears when the tab itself closes, which is
 * the correct lifetime for a per-session chat history.
 */
function loadCachedMessages(incidentId: string): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + incidentId);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function saveCachedMessages(incidentId: string, messages: ChatMessage[]) {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + incidentId, JSON.stringify(messages));
  } catch {
    // sessionStorage full or unavailable - conversation just won't
    // persist across a reload for this incident, not a hard failure.
  }
}

function CitationChip({ record, index }: { record: CitedRecord; index: number }) {
  return (
    <div className="rounded-md border border-border bg-elevated/60 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-primary">[{index + 1}]</span>
        <span className="font-mono text-[10px] text-muted-foreground">score {record.score.toFixed(2)}</span>
      </div>
      <p className="mt-1 text-xs text-foreground/90">{record.text}</p>
      {record.root_cause && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          <span className="text-foreground/70">root cause:</span> {record.root_cause}
        </p>
      )}
    </div>
  );
}

function EvidenceBar({ evidence }: { evidence: Evidence }) {
  if (evidence.similarIncidentsFound === 0) return null;
  const pct = evidence.avgEffectiveness != null ? Math.round(evidence.avgEffectiveness * 100) : null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border bg-elevated/40 px-3 py-2 font-mono text-[11px]">
      <span className="text-muted-foreground">
        <span className="text-foreground/90">{evidence.similarIncidentsFound}</span> similar incident
        {evidence.similarIncidentsFound === 1 ? "" : "s"} found
      </span>
      <span className={cn(evidence.confirmedFixCount > 0 ? "text-healthy" : "text-degraded")}>
        {evidence.confirmedFixCount} confirmed-effective fix{evidence.confirmedFixCount === 1 ? "" : "es"}
      </span>
      {pct != null && <span className="text-muted-foreground">avg effectiveness {pct}%</span>}
    </div>
  );
}

function ReasoningTrace({ trace, totalDurationMs }: { trace: TraceStep[]; totalDurationMs?: number }) {
  const [open, setOpen] = useState(false);
  if (!trace?.length) return null;

  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Reasoning steps {totalDurationMs != null && `- ${(totalDurationMs / 1000).toFixed(1)}s total`}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-1.5 border-t border-border p-3">
          {trace.map((t, i) => (
            <div key={i} className="flex items-start gap-2 font-mono text-[11px]">
              <span className={cn("mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full", t.ok ? "bg-healthy" : "bg-critical")} />
              <span className="text-muted-foreground">{new Date(t.time).toISOString().slice(11, 23)}</span>
              <span className="text-foreground/90">{t.step}</span>
              <span className="text-muted-foreground">({t.tool})</span>
              <span className="ml-auto text-muted-foreground">{t.durationMs}ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentChat() {
  const { incident: incidentId } = Route.useSearch();
  const { data: incidents } = useQuery({ queryKey: ["incidents"], queryFn: listIncidents });
  const incident = incidents?.find((i) => i.id === incidentId) ?? incidents?.[0];

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    incident ? loadCachedMessages(incident.id) : [],
  );
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const loadedIncidentId = useRef<string | null>(null);
  const autoTriageInFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, thinking]);

  // When the incident changes (not just a remount for the same one),
  // load THAT incident's persisted conversation from sessionStorage.
  useEffect(() => {
    if (incident && loadedIncidentId.current !== incident.id) {
      loadedIncidentId.current = incident.id;
      setMessages(loadCachedMessages(incident.id));
    }
  }, [incident]);

  const persistMessages = (id: string, next: ChatMessage[]) => {
    saveCachedMessages(id, next);
    setMessages(next);
  };

  const runTriage = async (text: string) => {
    if (!text || !incident || thinking) return;
    const existingMessages = loadCachedMessages(incident.id);
    const withUser = [...existingMessages, { role: "user" as const, text }];
    persistMessages(incident.id, withUser);
    setThinking(true);
    const reply = await sendMessage(incident.id, text, existingMessages);
    setActiveTools(reply.toolsUsed);
    const withAgent = [
      ...withUser,
      {
        role: "agent" as const,
        text: reply.text,
        citedRecords: reply.citedRecords,
        evidence: reply.evidence,
        toolsUsed: reply.toolsUsed,
        trace: reply.trace,
        totalDurationMs: reply.totalDurationMs,
      },
    ];
    persistMessages(incident.id, withAgent);
    setThinking(false);
    setTimeout(() => setActiveTools([]), 2200);
  };

  // Auto-fire triage only if this incident has NO persisted conversation
  // yet (checked against sessionStorage, the real source of truth) and
  // isn't already mid-flight for this exact incident right now.
  useEffect(() => {
    if (
      incident &&
      loadCachedMessages(incident.id).length === 0 &&
      !autoTriageInFlight.current.has(incident.id)
    ) {
      autoTriageInFlight.current.add(incident.id);
      runTriage(
        `Triage this incident: ${incident.summary}. Check memory layer health, find similar past incidents, and propose a root cause and fix.`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    await runTriage(text);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-7.5rem)] max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
        <Link to="/incidents" className="hover:text-primary">
          Incidents
        </Link>
        <span>/</span>
        {incident ? (
          <>
            <Link to="/incidents/$id" params={{ id: incident.id }} className="text-primary hover:underline">
              {incident.id}
            </Link>
            <span className="text-foreground/80">{incident.service}</span>
            <SeverityBadge severity={incident.severity} />
            <span className="truncate">{incident.summary}</span>
          </>
        ) : (
          <span>loading incident...</span>
        )}
      </div>

      <Card className="panel flex min-h-0 flex-1 flex-col">
        <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && !thinking && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Ask the agent to triage this incident. It checks its memory layer health via MCP, embeds the
                alert, and reranks matching past incidents before reasoning.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] space-y-2", m.role === "agent" && "w-full")}>
                {m.role === "user" ? (
                  <div className="rounded-lg bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">{m.text}</div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="pulse-ring h-1.5 w-1.5 rounded-full bg-primary text-primary" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        roach watch agent
                      </span>
                      {m.toolsUsed?.map((t) => (
                        <span
                          key={t}
                          className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed text-foreground/90 prose-headings:mt-3 prose-headings:mb-1.5 prose-headings:text-sm prose-headings:font-semibold prose-headings:text-foreground prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-strong:text-foreground prose-code:rounded prose-code:bg-elevated prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-pre:bg-elevated prose-pre:border prose-pre:border-border">
                      <ReactMarkdown>{m.text}</ReactMarkdown>
                    </div>
                    {m.evidence && <EvidenceBar evidence={m.evidence} />}
                    {!!m.citedRecords?.length && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {m.citedRecords.map((r, idx) => (
                          <CitationChip key={r.id} record={r} index={idx} />
                        ))}
                      </div>
                    )}
                    {m.trace && <ReasoningTrace trace={m.trace} totalDurationMs={m.totalDurationMs} />}
                  </>
                )}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="font-mono text-xs text-muted-foreground">
              <span className="animate-pulse">agent reasoning via Groq...</span>
            </div>
          )}
          <div ref={endRef} />
        </CardContent>

        <div className="border-t border-border p-3">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {TOOLS.map((tool) => {
              const active = activeTools.some((t) => t.toLowerCase().includes(tool.split(" ")[0]!.toLowerCase()));
              return (
                <span
                  key={tool}
                  className={cn(
                    "rounded border px-2 py-0.5 font-mono text-[10px] transition-all duration-300",
                    active
                      ? "border-primary/60 bg-primary/15 text-primary shadow-[var(--shadow-glow)]"
                      : "border-border bg-elevated text-muted-foreground",
                  )}
                >
                  {tool}
                </span>
              );
            })}
          </div>
          <form onSubmit={submit} className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) submit(e);
              }}
              placeholder="Ask the agent about this incident..."
              className="min-h-11 resize-none"
              rows={1}
            />
            <Button type="submit" size="icon" disabled={thinking || !input.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
