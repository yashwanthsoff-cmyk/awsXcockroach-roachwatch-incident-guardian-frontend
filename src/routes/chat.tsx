import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CitationCard, SeverityBadge } from "@/components/status-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "@/services/agentService";
import { listIncidents } from "@/services/incidentService";
import type { MemoryRecord } from "@/services/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  validateSearch: (s: Record<string, unknown>) => ({
    incident: typeof s["incident"] === "string" ? (s["incident"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Agent Chat — Roach Watch triage" },
      {
        name: "description",
        content:
          "Triage an incident with the Roach Watch agent: Groq reasoning, NIM embedding and reranking, and inline memory citations.",
      },
      { property: "og:title", content: "Agent Chat — Roach Watch triage" },
      { property: "og:description", content: "Triage conversation with inline, clickable memory citations." },
    ],
  }),
  component: AgentChat,
});

const TOOLS = ["Groq", "NIM Embed", "NIM Rerank", "CockroachDB MCP"] as const;

interface ChatMessage {
  role: "user" | "agent";
  text: string;
  citedRecords?: MemoryRecord[];
  toolsUsed?: string[];
}

function AgentChat() {
  const { incident: incidentId } = Route.useSearch();
  const { data: incidents } = useQuery({ queryKey: ["incidents"], queryFn: listIncidents });
  const incident = incidents?.find((i) => i.id === incidentId) ?? incidents?.[0];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, thinking]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !incident || thinking) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setThinking(true);
    const reply = await sendMessage(incident.id, text);
    setActiveTools(reply.toolsUsed);
    setMessages((m) => [
      ...m,
      { role: "agent", text: reply.text, citedRecords: reply.citedRecords, toolsUsed: reply.toolsUsed },
    ]);
    setThinking(false);
    setTimeout(() => setActiveTools([]), 2200);
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
            <Link
              to="/incidents/$id"
              params={{ id: incident.id }}
              className="text-primary hover:underline"
            >
              {incident.id}
            </Link>
            <span className="text-foreground/80">{incident.service}</span>
            <SeverityBadge severity={incident.severity} />
            <span className="truncate">{incident.summary}</span>
          </>
        ) : (
          <span>loading incident…</span>
        )}
      </div>

      <Card className="panel flex min-h-0 flex-1 flex-col">
        <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
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
                  <div className="rounded-lg bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
                    {m.text}
                  </div>
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
                    <p className="text-sm leading-relaxed text-foreground/90">{m.text}</p>
                    {!!m.citedRecords?.length && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {m.citedRecords.map((r) => (
                          <CitationCard key={r.id} record={r} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="font-mono text-xs text-muted-foreground">
              <span className="animate-pulse">agent reasoning via Groq…</span>
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
              placeholder="Ask the agent about this incident…"
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
