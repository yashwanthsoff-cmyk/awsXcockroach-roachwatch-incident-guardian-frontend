# Incident Guardian

Roach Watch — Master Frontend Prompt (for Lovable)

Paste everything below into Lovable as your initial build prompt. It specifies a complete, production-ready frontend with mock data, so it renders and demos fully before your backend (Groq, NVIDIA NIM, CockroachDB, AWS) is wired in. Every screen has a clearly marked "TODO: connect to [tool]" comment so you can swap mock data for real API calls later without restructuring anything.

PROMPT TO PASTE INTO LOVABLE

You are building the frontend for Roach Watch, an AI incident-response copilot whose core pitch is: "The on-call memory that never goes down — because it can't afford to." It's a hackathon demo app (CockroachDB × AWS Hackathon), so the frontend must be fully functional and visually polished using realistic mock data, with clean seams for wiring in a real backend afterward. Build with React + TypeScript + Tailwind CSS + shadcn/ui. Use Recharts for any charts.

Visual direction

Dark-mode-first, technical/observability aesthetic — think Datadog or Grafana, not a consumer app. Deep charcoal background (#0B0E14 range), a single confident accent color for "alert/live" states (amber or red-orange, not purple/blue — avoid the generic AI-app palette), monospace font (JetBrains Mono or similar) for IDs, timestamps, and log/code snippets, a standard sans-serif (Inter) for everything else. Status colors: green = healthy/resolved, amber = degraded/investigating, red = critical/down. Motion should feel like a live system, not a static dashboard — subtle pulse on live indicators, smooth transitions when state changes, no gratuitous animation.

Global layout

Left sidebar nav (collapsible): Dashboard, Incidents, Memory Explorer, Failover Demo, Agent Chat, Settings/Tools. Top bar: cluster health indicator (green/amber/red dot + label, this is a persistent, always-visible element since "the memory is alive" is the whole pitch), current user, notification bell. Main content area per page below.

PAGE 1 — Dashboard (Core feature: incident ingestion + triage overview)

Top row: 4 stat cards — Active Incidents, Mean Time to Triage, Memory Records Stored, Cluster Nodes Healthy (e.g. "3/3").

Live incident feed: a scrolling list of incident cards, each showing service name, alert summary, severity badge, timestamp, and a "Similar past incident found" chip if the agent has already matched one (this chip is the visible hook into the vector-search feature — clicking it jumps to Memory Explorer showing the match).

Each incident card has a right-aligned "Triage with Agent" button → opens the Agent Chat page scoped to that incident.

Mock data: seed 6–8 incidents with varied severities and timestamps, at least 3 with a matched similar-incident chip, 1 currently "in progress."

// TODO: replace mock incident feed with CockroachDB query results (real-time incident table)

PAGE 1b — Cluster Introspection Panel (Core feature #2: MCP-based safe cluster inspection)

Add this as a dedicated card on the Dashboard, not just a chat badge — it needs its own visible real estate since it's a named core feature.

Card titled "Agent Cluster Introspection (via MCP, read-only)."

Shows: node count + health, replica status, active connections, last query latency — framed explicitly as "the agent checked its own memory layer's health before triaging" rather than generic infra metrics.

A small "Ask agent to inspect cluster" button that, when clicked, plays a brief loading state ("Agent querying via MCP Server...") then populates the panel — this makes the MCP tool-use moment visible and demoable on its own, separate from the chat flow.

// TODO: connect to CockroachDB Cloud Managed MCP Server (read-only mode) for real cluster state

PAGE 2 — Incident Detail

Header: service, severity, status (Open/Investigating/Resolved), time since triggered.

Left column: raw alert payload (rendered as a formatted code block, monospace).

Right column: "Agent Analysis" panel — shows the agent's proposed root cause, confidence score (visible number, e.g. "82% match"), and a linked "similar incident" card pulled from memory with a "View full memory record" link to Memory Explorer.

Bottom: postmortem draft section (Advanced feature) — auto-generated summary text in an editable textarea with a "Save to Memory" button, so closing the loop (new record written back) is visually obvious.

// TODO: root cause + confidence score come from Groq API reasoning call; similar-incident match comes from NVIDIA NIM embedding + reranker pipeline over CockroachDB vector index

PAGE 3 — Memory Explorer (Advanced feature: synchronous retrieval + provenance)

Search bar at top: "Ask the memory anything" (semantic search demo).

Results list: each result shows the matched incident record, a similarity score bar (visual, 0–100%), and a provenance stamp: "Retrieved from record #4471, written 2026-06-14 03:12 UTC, committed in 340ms" — this exact provenance/latency framing is your differentiator, make it visually prominent, not buried in metadata.

A small "Write → Read" live indicator: when a new mock incident is created (simulate via a button "Simulate new incident"), show a brief animated timeline: write commits → immediately queryable → appears in search results within the same view, with a millisecond timestamp. This visualizes the "no background processing delay" claim directly.

// TODO: connect search bar to NVIDIA NIM embedding API (query embedding) → CockroachDB vector index query → NVIDIA NIM reranker API (reorder results)

PAGE 4 — Failover Demo (Special feature: THE signature demo screen)

This is the most important page in the whole app — it needs to look impressive standing alone.

Center: a visual diagram of 3 CockroachDB nodes (simple circles/icons in a row, each labeled Node 1/2/3, each with a green "healthy" pulse).

A large, obvious button: "Kill Node 2" (styled as a destructive/danger action, red outline).

On click: Node 2's circle animates to red/offline with a brief shake or fade, a toast notification appears ("Node 2 down — cluster continues serving reads/writes"), and — critically — a live counter below labeled "Writes succeeded during outage" ticks upward in real time (mock: increment every ~400ms) to visually prove the system kept working.

Below that: a mini live log panel streaming mock lines like [03:14:02] INSERT incidents ... OK (routed via Node 1) so it reads like a real terminal, not a toy.

A "Restore Node 2" button resets the demo state.

// TODO: replace simulated kill/restore with actual ccloud CLI calls or CockroachDB Cloud API node-drain endpoints; replace mock write counter with real write throughput metrics via the MCP Server

PAGE 5 — Agent Chat (Core feature: triage conversation)

Standard chat UI, scoped to a specific incident (breadcrumb showing which incident at top).

Agent messages should render structured content, not just prose: when the agent cites a memory record, render it as an inline citation card (small, clickable, shows record ID + timestamp) rather than plain text — this reinforces the provenance theme across the whole app, not just Memory Explorer.

Input box has a small icon row showing which tools are active for this session: Groq (reasoning), NIM Embed, NIM Rerank, CockroachDB MCP — each as a small badge that lights up/pulses briefly when "used" in a demo response, so the tool stack is visibly demoed even before real integration.

Calls agentService.sendMessage() (see architecture section) for the reasoning loop.

PAGE 6 — Cluster Inspector (Core feature #2: MCP-based introspection — previously missing, now its own page, not a badge)

This page exists specifically because "the agent inspects its own memory layer via MCP" is a named Core feature and deserves to be seen doing something, not implied by a badge.

Top: the same 3-node cluster diagram used on the Failover Demo page (reuse the component) — but here it's read-only and live-status-driven, showing real node health/latency/replica count.

A "Run Inspection" button triggers a visible, step-by-step log of what the agent is checking via the MCP Server, e.g.: Checking node liveness... Checking replica health for incidents table... Checking backup status via ccloud CLI... Cluster healthy. Rendered as a streaming terminal-style log (reuse the log-stream component from the Failover Demo page).

Below: a small history table of past inspection runs (timestamp, result, duration) so it reads as something the agent does routinely, not a one-off gimmick.

Calls mcpService.runInspection().

PAGE 7 — Recurrence Watch (Nuclear feature: self-healing memory validation loop — previously missing entirely)

This is your hardest-to-copy feature and it needs its own dedicated screen, not a mention.

Top: explainer strip — one sentence: "The agent periodically re-checks resolved incidents against live system state to catch regressions before they page anyone."

Main panel: a list of "Watched Resolutions" — past incidents marked Resolved, each showing: original root cause, fix summary, and a Recurrence Risk badge (Low/Medium/High) computed from how closely current system state matches the pre-fix state.

If a watched resolution's risk flips to High, it surfaces as a distinct alert type — visually different from a fresh incident (e.g., a purple/violet badge instead of red) labeled "Possible Regression" — so in the demo you can show the agent catching something before it becomes a new incident, which is the whole point of the feature.

A "Run Recurrence Check Now" button so this can be triggered live on demand for the demo video rather than waiting for a real schedule.

Calls recurrenceService.checkAll() / recurrenceService.checkOne(incidentId).

PAGE 8 — Settings / Tools (supporting page, shows engineering seriousness)

A status table: each tool (Groq API, NVIDIA NIM Embedding, NVIDIA NIM Reranker, CockroachDB, CockroachDB MCP Server, AWS) with a connection status pill, last-checked timestamp, and a "Test Connection" button per row that actually calls each service's health-check endpoint (see architecture section — this page is real, not demo-mode, once each service exists, since a health check is cheap and safe to leave live even before the rest of the app is wired up).

This page exists so a judge scanning your app immediately sees the full stack named and accounted for.

Architecture — real service layer, not scattered mock objects

Do not hardcode mock data directly inside components. Build a proper services/ folder with one file per backend concern, each exporting real, typed async functions with the exact shape a live API would return. Every component calls these functions — never inline fake data:

services/incidentService.ts — listIncidents(), getIncident(id), createIncident(). Shape maps to a future CockroachDB incidents table query.

services/memoryService.ts — searchMemory(query: string) → returns { record, similarityScore, retrievedAtMs, committedLatencyMs }[]. Shape maps to NVIDIA NIM embedding call → CockroachDB vector query → NVIDIA NIM reranker call.

services/agentService.ts — sendMessage(incidentId, message) → returns { text, citedRecords: MemoryRecord[], toolsUsed: string[] }. Shape maps to a Groq API chat completion call.

services/mcpService.ts — runInspection() → returns a step-by-step log array + final cluster health object. Shape maps to CockroachDB MCP Server tool calls.

services/recurrenceService.ts — checkAll() / checkOne(id) → returns updated risk levels. Shape maps to a scheduled AWS Lambda job querying CockroachDB.

services/clusterService.ts — getClusterStatus(), killNode(id), restoreNode(id) → returns node health state. Shape maps to ccloud CLI / CockroachDB Cloud API calls.

services/toolStatusService.ts — checkHealth(tool) for the Settings page — this one should attempt a real, lightweight fetch/ping wherever the tool exposes a public health endpoint, since it's low-risk to leave live even before the rest of the backend exists.

Every service file has a single DEMO_MODE boolean at the top (default true). When true, the function returns realistic canned data with a small artificial delay (150–400ms) to simulate network latency — never instant, since instant responses look fake in a demo video. When you flip DEMO_MODE to false per file as each backend piece comes online, the function body swaps to a real fetch()/SDK call with the exact same return type, so no component ever needs to change — that's the actual point of doing it this way instead of hardcoded mocks.

Do not build yet

Do not implement real auth. Everything else — the full service-layer architecture above — should be built as if it's real, just running in DEMO_MODE until Groq, NVIDIA NIM, CockroachDB, and AWS are wired in one file at a time.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c9e9e54a-254f-4316-9c85-5438f2913184).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
