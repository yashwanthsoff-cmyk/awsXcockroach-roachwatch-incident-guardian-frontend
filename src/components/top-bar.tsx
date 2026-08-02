import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { getClusterStatus } from "@/services/clusterService";
import { cn } from "@/lib/utils";

export function ClusterHealthPill() {
  const { data } = useQuery({
    queryKey: ["cluster"],
    queryFn: getClusterStatus,
    refetchInterval: 5000,
  });

  const nodes = data?.nodes ?? [];
  const down = nodes.filter((n) => n.state !== "healthy").length;
  const label = !data
    ? "Checking cluster…"
    : down === 0
      ? `Cluster healthy · ${nodes.length}/${nodes.length} nodes`
      : down < nodes.length
        ? `Degraded · ${nodes.length - down}/${nodes.length} nodes serving`
        : "Cluster down";

  const tone = !data || down === 0 ? "healthy" : down < nodes.length ? "degraded" : "critical";

  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1.5">
      <span
        className={cn(
          "pulse-ring h-2 w-2 rounded-full",
          tone === "healthy" && "bg-healthy text-healthy",
          tone === "degraded" && "bg-degraded text-degraded",
          tone === "critical" && "bg-critical text-critical",
        )}
      />
      <span className="font-mono text-xs text-foreground/90">{label}</span>
    </div>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur">
      <SidebarTrigger />
      <ClusterHealthPill />
      <div className="ml-auto flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </Button>
        <div className="flex items-center gap-2 border-l border-border pl-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 font-mono text-[11px] text-primary">
            AM
          </span>
          <div className="hidden leading-tight sm:block">
            <div className="text-xs font-medium">Avery Mills</div>
            <div className="font-mono text-[10px] text-muted-foreground">on-call · SRE</div>
          </div>
        </div>
      </div>
    </header>
  );
}
