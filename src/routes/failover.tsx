import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Power, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ClusterDiagram } from "@/components/cluster-diagram";
import { LogStream } from "@/components/log-stream";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getClusterStatus, killNode, restoreNode } from "@/services/clusterService";

export const Route = createFileRoute("/failover")({
  head: () => ({
    meta: [
      { title: "Failover Demo — Roach Watch" },
      {
        name: "description",
        content:
          "Kill a CockroachDB node live and watch writes keep succeeding — the signature Roach Watch resilience demo.",
      },
      { property: "og:title", content: "Failover Demo — Roach Watch" },
      { property: "og:description", content: "Kill a node. Writes keep committing. That's the whole pitch." },
    ],
  }),
  component: FailoverDemo;
});

function FailoverDemo() {
  return null;
}
