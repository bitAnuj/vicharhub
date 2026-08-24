import { create } from "zustand";
import { api } from "../lib/api";

type User = { id: string; email: string; name: string };

type AuthStore = {
  user: User | null;
  status: "checking" | "signedOut" | "signedIn";

  init: () => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  status: "checking",

  init: async () => {
    try {
      const data = await api<{ user: User }>("/api/auth/me");
      set({ user: data.user, status: "signedIn" });
    } catch {
      set({ user: null, status: "signedOut" });
    }
  },

  signup: async (email, password, name) => {
    const data = await api<{ user: User }>("/api/auth/signup", {
      method: "POST",
      body: { email, password, name },
    });
    set({ user: data.user, status: "signedIn" });
  },

  login: async (email, password) => {
    const data = await api<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    set({ user: data.user, status: "signedIn" });
  },

  logout: async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    set({ user: null, status: "signedOut" });
  },
}));
