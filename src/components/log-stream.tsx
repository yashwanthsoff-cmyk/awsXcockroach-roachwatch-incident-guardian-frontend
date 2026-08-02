import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export function LogStream({
  lines,
  className,
  emptyLabel = "// no output yet",
}: {
  lines: string[];
  className?: string;
  emptyLabel?: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [lines.length]);

  return (
    <div
      className={cn(
        "h-56 overflow-y-auto rounded-md border border-border bg-background/70 p-3 font-mono text-xs leading-relaxed",
        className,
      )}
    >
      {lines.length === 0 ? (
        <div className="text-muted-foreground">{emptyLabel}</div>
      ) : (
        lines.map((line, i) => (
          <div key={`${i}-${line}`} className="tick-in flex gap-2">
            <span className="select-none text-muted-foreground/50">{String(i + 1).padStart(2, "0")}</span>
            <span
              className={cn(
                line.includes("OK") || line.includes("healthy") ? "text-healthy" : "text-foreground/85",
                line.includes("FAIL") || line.includes("down") ? "text-critical" : undefined,
              )}
            >
              {line}
            </span>
          </div>
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}
