import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Github, ServerCog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — Roach Watch" },
      {
        name: "description",
        content: "Create a Roach Watch account and give your on-call rotation a memory that never goes down.",
      },
      { property: "og:title", content: "Sign up — Roach Watch" },
      {
        property: "og:description",
        content: "Create a Roach Watch account and start triaging incidents against permanent memory.",
      },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const { signUp, logInWithGitHub } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signUp(form);
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setBusy(false);
    }
  };

  const github = async () => {
    setBusy(true);
    try {
      await logInWithGitHub();
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "GitHub sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid-backdrop flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
            <ServerCog className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Roach Watch</span>
        </Link>
        <div className="panel rounded-xl border border-border p-6 sm:p-7">
          <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            demo mode · any valid email works
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={set("name")} placeholder="Avery Mills" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="avery@roachwatch.dev"
                className="font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={set("password")}
                placeholder="min. 8 characters"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={github} disabled={busy}>
            <Github className="mr-1.5 h-4 w-4" />
            Continue with GitHub
          </Button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
