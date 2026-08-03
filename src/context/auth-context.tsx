import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import * as authService from "@/services/authService";
import type { AuthUser } from "@/services/authService";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  signUp: typeof authService.signUp;
  logIn: typeof authService.logIn;
  logInWithGitHub: typeof authService.logInWithGitHub;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const signUp = useCallback<typeof authService.signUp>(async (input) => {
    const next = await authService.signUp(input);
    setUser(next);
    return next;
  }, []);

  const logIn = useCallback<typeof authService.logIn>(async (input) => {
    const next = await authService.logIn(input);
    setUser(next);
    return next;
  }, []);

  const logInWithGitHub = useCallback<typeof authService.logInWithGitHub>(async () => {
    const next = await authService.logInWithGitHub();
    setUser(next);
    return next;
  }, []);

  const logOut = useCallback(async () => {
    await authService.logOut();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, signUp, logIn, logInWithGitHub, logOut }),
    [user, signUp, logIn, logInWithGitHub, logOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
