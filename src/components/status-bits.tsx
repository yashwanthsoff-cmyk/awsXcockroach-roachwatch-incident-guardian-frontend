import { Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";

import type { MemoryRecord, RiskLevel, Severity } from "@/services/types";
import { cn } from "@/lib/utils";

const severityClass: Record<Severity, string> = {
  critical: "border-critical/40 bg-critical/15 text-critical",
  high: "border-degraded/40 bg-degraded/15 text-degraded",
  medium: "border-primary/40 bg-primary/15 text-primary",
  low: "border-border bg-muted text-muted-foreground",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        severityClass[severity],
      )}
    >
      {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "resolved"
      ? "border-healthy/40 bg-healthy/15 text-healthy"
      : status === "investigating"
        ? "border-degraded/40 bg-degraded/15 text-degraded"
        : "border-critical/40 bg-critical/15 text-critical";
  return (
    <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider", tone)}>
      {status}
    </span>
  );
}

export function RiskBadge({ risk, regression }: { risk: RiskLevel; regression?: boolean }) {
  if (regression) {
    return (
      <span className="rounded border border-regression/50 bg-regression/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-regression">
        possible regression
      </span>
    );
  }
  const tone =
    risk === "high"
      ? "border-regression/50 bg-regression/15 text-regression"
      : risk === "medium"
        ? "border-degraded/40 bg-degraded/15 text-degraded"
        : "border-healthy/40 bg-healthy/15 text-healthy";
  return (
    <span className={cn("rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider", tone)}>
      {risk} risk
    </span>
  );
}

export function CitationCard({ record }: { record: MemoryRecord }) {
  return (
    <Link
      to="/memory"
      search={{ q: record.title }}
      className="group flex items-start gap-2 rounded-md border border-border bg-elevated/70 px-2.5 py-2 transition-colors hover:border-primary/50 hover:bg-elevated"
    >
      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <div className="min-w-0">
        <div className="font-mono text-[11px] text-primary">
          record #{record.recordNumber} · {new Date(record.writtenAt).toISOString().slice(0, 16)}Z
        </div>
        <div className="truncate text-xs text-foreground/85 group-hover:text-foreground">{record.title}</div>
      </div>
    </Link>
  );
}

export function ScoreBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-primary">{pct}%</span>
    </div>
  );
}

export function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(diff / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
