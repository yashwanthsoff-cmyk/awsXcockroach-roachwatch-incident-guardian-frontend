import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell, ChevronDown, LogOut } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/auth-context";
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

function UserMenu() {
  const { user, logOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await logOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md border-l border-border pl-3 pr-1 py-1 text-left transition-colors hover:bg-accent/40">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 font-mono text-[11px] text-primary">
            {user?.initials ?? "RW"}
          </span>
          <div className="hidden leading-tight sm:block">
            <div className="text-xs font-medium">{user?.name ?? "Operator"}</div>
            <div className="font-mono text-[10px] text-muted-foreground">{user?.role ?? "on-call · SRE"}</div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="text-xs font-medium">{user?.name}</div>
          <div className="font-mono text-[10px] text-muted-foreground">{user?.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogOut}>
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
        <UserMenu />
      </div>
    </header>
  );
}
