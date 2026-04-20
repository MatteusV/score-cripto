"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface UserProfile {
  analysisCount: number;
  analysisLimit: number;
  createdAt: string;
  email: string;
  id: string;
  name: string | null;
  plan: string;
  role: string;
}

interface AuthState {
  loading: boolean;
  user: UserProfile | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const user = (await res.json()) as UserProfile;
        setState({ user, loading: false });
      } else {
        setState({ user: null, loading: false });
      }
    } catch {
      setState({ user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { user?: UserProfile; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Falha no login");
      }
      setState({ user: data.user ?? null, loading: false });
      startTransition(() => router.push("/dashboard"));
    },
    [router]
  );

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = (await res.json()) as { user?: UserProfile; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Falha no registro");
      }
      setState({ user: data.user ?? null, loading: false });
      startTransition(() => router.push("/dashboard"));
    },
    [router]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setState({ user: null, loading: false });
    startTransition(() => router.push("/login"));
  }, [router]);

  return (
    <AuthContext value={{ ...state, login, register, logout, refresh }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
