"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

type User = { id: string; email: string; name?: string; role?: "parent" | "super_admin" };

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    router.push("/login");
  }, [router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await authApi.login(email.trim().toLowerCase(), password);
      if (error) return error;
      if (data?.token && data?.user) {
        setToken(data.token);
        setUser(data.user);
        if (typeof window !== "undefined") {
          localStorage.setItem(TOKEN_KEY, data.token);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        }
        return null;
      }
      return "Login failed";
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    if (!storedToken) {
      setLoading(false);
      return;
    }

    setToken(storedToken);

    const restoreSession = async () => {
      // Re-validate token and hydrate user from API so session survives refreshes reliably.
      const { data } = await authApi.me(storedToken);
      if (data) {
        setUser(data);
        localStorage.setItem(USER_KEY, JSON.stringify(data));
        setLoading(false);
        return;
      }

      // Fallback: keep previously cached user if present.
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setLoading(false);
          return;
        } catch {
          localStorage.removeItem(USER_KEY);
        }
      }

      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
      setLoading(false);
    };

    void restoreSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        setUser,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
