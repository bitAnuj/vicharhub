import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  status: "signedIn" | "signedOut" | "checking" | "loggingIn";
  user: User;
  accessToken: string;
  refreshToken: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  loadUser: () => Promise<void>;
  init: () => void;
}

function decodeJwtPayload(token: string): { sub?: string } | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function clearStoredTokens() {
  localStorage.removeItem("vh_access_token");
  localStorage.removeItem("vh_refresh_token");
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: "checking",
  user: { id: "", email: "", name: "" },
  accessToken: "",
  refreshToken: "",
  login: async (email: string, password: string) => {
    set({ status: "loggingIn" });
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("vh_access_token", data.accessToken ?? "");
        set({
          accessToken: data.accessToken ?? "",
          user: { id: data.user.id, email: data.user.email, name: data.user.name ?? "" },
          status: "signedIn",
        });
        await get().loadUser();
      } else {
        set({ status: "signedOut" });
        throw new Error(data.error ?? "Login failed");
      }
    } catch (error) {
      set({ status: "signedOut" });
      throw error;
    }
  },
  logout: async () => {
    clearStoredTokens();
    set({ user: { id: "", email: "", name: "" }, status: "signedOut", accessToken: "", refreshToken: "" });
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.error("Logout failed", e);
    }
  },
  signup: async (email: string, password: string, name?: string) => {
    set({ status: "loggingIn" });
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("vh_access_token", data.accessToken ?? "");
        set({
          accessToken: data.accessToken ?? "",
          user: { id: data.user.id, email: data.user.email, name: data.user.name ?? name ?? "" },
          status: "signedIn",
        });
        await get().loadUser();
      } else {
        set({ status: "signedOut" });
        throw new Error(data.error ?? "Signup failed");
      }
    } catch (error) {
      set({ status: "signedOut" });
      throw error;
    }
  },
  loadUser: async () => {
    const token = localStorage.getItem("vh_access_token");
    const payload = token ? decodeJwtPayload(token) : null;
    if (!token || !payload?.sub) {
      clearStoredTokens();
      set({ status: "signedOut", accessToken: "" });
      return;
    }
    set({ status: "signedIn", accessToken: token, user: { id: payload.sub, email: "", name: "" } });
  },
  init: () => {
    const token = localStorage.getItem("vh_access_token");
    const payload = token ? decodeJwtPayload(token) : null;
    if (!token || !payload?.sub) {
      clearStoredTokens();
      set({ status: "signedOut", accessToken: "" });
      return;
    }
    set({ user: { id: payload.sub, email: "", name: "" }, status: "signedIn", accessToken: token });
  },
}));
