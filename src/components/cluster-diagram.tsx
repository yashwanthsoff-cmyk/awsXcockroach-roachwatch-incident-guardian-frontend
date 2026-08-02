import { Database } from "lucide-react";

import type { ClusterNode } from "@/services/types";
import { cn } from "@/lib/utils";

export function ClusterDiagram({
  nodes,
  shakeNodeId,
  className,
}: {
  nodes: ClusterNode[];
  shakeNodeId?: number | null;
  className?: string;
}) {
  return (
    <div className={cn("grid-backdrop rounded-lg border border-border bg-background/40 p-6", className)}>
      <div className="flex flex-wrap items-start justify-center gap-6 sm:gap-10">
        {nodes.map((node) => {
          const down = node.state === "down";
          const degraded = node.state === "degraded";
          return (
            <div
              key={node.id}
              className={cn(
                "flex w-36 flex-col items-center gap-2 transition-all duration-500",
                shakeNodeId === node.id && "shake-once",
              )}
            >
              <div
                className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all duration-500",
                  down && "border-critical/60 bg-critical/10 text-critical opacity-70",
                  degraded && "border-degraded/60 bg-degraded/10 text-degraded",
                  !down && !degraded && "pulse-ring border-healthy/60 bg-healthy/10 text-healthy",
                )}
              >
                <Database className="h-7 w-7" />
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">{node.name}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{node.region}</div>
                <div
                  className={cn(
                    "mt-1 font-mono text-[11px]",
                    down ? "text-critical" : degraded ? "text-degraded" : "text-healthy",
                  )}
                >
                  {down ? "OFFLINE" : `${node.latencyMs}ms · ${node.replicas} replicas`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
