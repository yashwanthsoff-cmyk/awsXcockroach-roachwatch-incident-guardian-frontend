import { delay } from "./types";

// Flip to false once real auth (OAuth + user table) is wired.
const DEMO_MODE = true;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function initialsFor(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "RW"
  );
}

function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "operator";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase() + p.slice(1))
    .join(" ");
}

/** Demo-mode session lives in memory only (React context owns it). */
let currentUser: AuthUser | null = null;

function validate(email: string, password: string) {
  if (!EMAIL_RE.test(email.trim())) throw new Error("Enter a valid email address.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthUser> {
  if (DEMO_MODE) {
    await delay(500);
    if (input.name.trim().length < 2) throw new Error("Enter your name.");
    validate(input.email, input.password);
    if (input.password !== input.confirmPassword) throw new Error("Passwords do not match.");
    currentUser = {
      id: "usr-demo-1",
      name: input.name.trim(),
      email: input.email.trim(),
      role: "on-call · SRE",
      initials: initialsFor(input.name.trim()),
    };
    return currentUser;
  }
  // TODO: POST /api/auth/signup — real user record + session cookie
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await res.json()) as AuthUser;
}

export async function logIn(input: { email: string; password: string }): Promise<AuthUser> {
  if (DEMO_MODE) {
    await delay(500);
    validate(input.email, input.password);
    const name = nameFromEmail(input.email.trim());
    currentUser = {
      id: "usr-demo-1",
      name,
      email: input.email.trim(),
      role: "on-call · SRE",
      initials: initialsFor(name),
    };
    return currentUser;
  }
  // TODO: POST /api/auth/login — verify credentials, issue session
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await res.json()) as AuthUser;
}

export async function logInWithGitHub(): Promise<AuthUser> {
  if (DEMO_MODE) {
    await delay(600);
    currentUser = {
      id: "usr-demo-gh",
      name: "Avery Mills",
      email: "avery@roachwatch.dev",
      role: "on-call · SRE",
      initials: "AM",
    };
    return currentUser;
  }
  // TODO: redirect to real GitHub OAuth authorize URL
  throw new Error("GitHub sign-in is not configured yet.");
}

export async function logOut(): Promise<void> {
  if (DEMO_MODE) {
    await delay(150);
    currentUser = null;
    return;
  }
  // TODO: POST /api/auth/logout — clear server session
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (DEMO_MODE) {
    await delay(80);
    return currentUser;
  }
  // TODO: GET /api/auth/me
  const res = await fetch("/api/auth/me");
  if (!res.ok) return null;
  return (await res.json()) as AuthUser;
}
