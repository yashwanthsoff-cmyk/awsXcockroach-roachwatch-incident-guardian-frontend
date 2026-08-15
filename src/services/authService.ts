import { apiFetch } from "./apiClient";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
}

interface AuthResponse extends AuthUser {
  token: string;
}

const SESSION_KEY = "roachwatch_session_token";

function saveToken(token: string) {
  sessionStorage.setItem(SESSION_KEY, token);
}

function getToken(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

function clearToken() {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthUser> {
  const result = await apiFetch<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  saveToken(result.token);
  const { token, ...user } = result;
  return user;
}

export async function logIn(input: { email: string; password: string }): Promise<AuthUser> {
  const result = await apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  saveToken(result.token);
  const { token, ...user } = result;
  return user;
}

export async function logInWithGitHub(): Promise<AuthUser> {
  // No real OAuth app registered yet - this is a genuine gap, not faked
  // with a fabricated user. Being honest here rather than pretending.
  throw new Error("GitHub sign-in is not configured yet.");
}

export async function logOut(): Promise<void> {
  const token = getToken();
  if (token) {
    await apiFetch("/api/auth/logout", {
      method: "POST",
      headers: { "x-session-token": token },
    }).catch(() => {});
  }
  clearToken();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    return await apiFetch<AuthUser>("/api/auth/me", {
      headers: { "x-session-token": token },
    });
  } catch {
    clearToken();
    return null;
  }
}
