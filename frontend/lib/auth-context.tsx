"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, clearToken } from "./api";

interface User {
  id: string;
  uniqueId: string;
  fullName: string;
  role: "SUPER_ADMIN" | "CAPTAIN" | "STUDENT_ATHLETE" | "FITNESS_MEMBER";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (uniqueId: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function refresh() {
    try {
      const me = await api("/api/auth/me");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(uniqueId: string, password: string) {
    const data = await api("/api/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ uniqueId, password }),
    });
    setToken(data.token);
    setUser(data.user);
    if (data.user.role === "SUPER_ADMIN") {
      router.push("/dashboard/admin");
    } else if (data.user.role === "CAPTAIN") {
      router.push("/dashboard/captain");
    } else {
      router.push("/dashboard");
    }
  }

  function logout() {
    clearToken();
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
