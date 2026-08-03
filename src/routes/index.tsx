import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  Brain,
  Database,
  Github,
  PlayCircle,
  Radar,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

import { ClusterDiagram } from "@/components/cluster-diagram";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ClusterNode } from "@/services/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Roach Watch — on-call memory that never goes down" },
      {
        name: "description",
        content:
          "Roach Watch is an AI incident-response copilot that remembers every past outage — and keeps remembering even while its own database is being killed.",
      },
      { property: "og:title", content: "Roach Watch — on-call memory that never goes down" },
      {
        property: "og:description",
        content:
          "An AI incident-response copilot with permanent, instantly searchable memory built on CockroachDB.",
      },
    ],
  }),
  component: Landing,
});

const HERO_NODES: ClusterNode[] = [
  { id: 1, name: "Node 1", state: "healthy", region: "us-east-1a", latencyMs: 9, replicas: 24 },
  { id: 2, name: "Node 2", state: "healthy", region: "us-east-1b", latencyMs: 11, replicas: 24 },
  { id: 3, name: "Node 3", state: "healthy", region: "us-west-2a", latencyMs: 38, replicas: 24 },
];

const FEATURES = [
  {
    icon: Brain,
    title: "Remembers everything.",
    body: "Every past incident, its root cause, and its fix — stored permanently, searchable instantly.",
  },
  {
    icon: ShieldCheck,
    title: "Never loses a beat.",
    body: "Built on CockroachDB's distributed architecture, so the memory survives node failures, not just the app.",
  },
  {
    icon: Radar,
    title: "Catches problems before they page anyone.",
    body: "The agent re-checks old fixes against live system state and flags regressions early.",
  },
];

const STEPS = [
  { icon: Bell, label: "Alert comes in" },
  { icon: Database, label: "Agent searches memory instantly" },
  { icon: Wrench, label: "Agent proposes root cause & fix" },
  { icon: Sparkles, label: "Resolution written back — smarter next time" },
];

const STACK = [
  { name: "Groq", caption: "reasoning" },
  { name: "NVIDIA NIM", caption: "embeddings & reranking" },
  { name: "CockroachDB", caption: "memory that never goes down" },
  { name: "AWS", caption: "hosting & scheduled jobs" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
            <ServerCog className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Roach Watch</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
            on-call memory
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.14]">
            <ClusterDiagram nodes={HERO_NODES} className="w-full max-w-3xl border-0 bg-transparent" />
          </div>
          <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:py-32">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-primary">
              <span className="pulse-ring h-1.5 w-1.5 rounded-full bg-primary text-primary" />
              AI incident-response copilot
            </span>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              The on-call memory that never goes down — because it can't afford to.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground">
              Roach Watch is an AI incident-response copilot that remembers every past outage — and keeps
              remembering even while its own database is being killed.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/signup">Get Started</Link>
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg">
                    <PlayCircle className="mr-1.5 h-4 w-4" />
                    Watch Demo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Roach Watch demo</DialogTitle>
                    <DialogDescription>
                      Failover demo walkthrough — kill a node, keep writing, keep remembering.
                    </DialogDescription>
                  </DialogHeader>
                  {/* TODO: replace with the real demo video embed */}
                  <div className="grid-backdrop flex aspect-video items-center justify-center rounded-lg border border-border bg-elevated/60">
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                      demo video embed placeholder
                    </span>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </section>

        {/* What it does */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight">What it does</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="panel rounded-lg border border-border p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <f.icon className="h-4.5 w-4.5" />
                </span>
                <h3 className="mt-4 text-base font-medium">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-border bg-elevated/30">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <h2 className="text-center text-2xl font-semibold tracking-tight">How it works</h2>
            <ol className="mt-10 grid gap-4 md:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.label} className="relative rounded-lg border border-border bg-background/60 p-5">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    step {String(i + 1).padStart(2, "0")}
                  </div>
                  <s.icon className="mt-3 h-5 w-5 text-primary" />
                  <div className="mt-3 text-sm font-medium">{s.label}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Built on */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Built on
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STACK.map((s) => (
              <div
                key={s.name}
                className="rounded-lg border border-border bg-elevated/40 p-5 text-center transition-colors hover:border-primary/40"
              >
                <div className="font-mono text-base font-semibold tracking-tight">{s.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.caption}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-8 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Roach Watch</span>
          <a href="#" className="hover:text-primary">
            Demo video
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-primary"
          >
            <Github className="h-3.5 w-3.5" />
            GitHub repo
          </a>
          <span className="ml-auto font-mono text-[11px]">
            Built for the CockroachDB × AWS Hackathon.
          </span>
        </div>
      </footer>
    </div>
  );
}
