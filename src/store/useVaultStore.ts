import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { api, ApiError } from "../lib/api";
import { usePageStore } from "./usePageStore";
import { useAuthStore } from "./useAuthStore";

export type Role = "owner" | "admin" | "member" | "viewer";

export type VaultMember = {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: number;
};

export type VaultInvite = {
  id: string;
  email: string;
  role: Role;
  token: string;
  inviteUrl: string;
  expiresAt: number;
  createdAt: number;
};

type Vault = { id: string; name: string; role?: Role; createdAt: Date };

type VaultStore = {
  vaults: Vault[];
  currentVaultId: string | null;
  currentRole: Role | null;
  members: VaultMember[];
  invites: VaultInvite[];
  loadingMembers: boolean;

  loadVaults: () => Promise<void>;
  openVault: (id: string | null) => Promise<void>;
  createVault: (name: string) => Promise<string>;
  renameVault: (id: string, name: string) => void;
  deleteVault: (id: string) => void;

  loadMembers: (vaultId: string) => Promise<void>;
  loadInvites: (vaultId: string) => Promise<void>;
  createInvite: (
    vaultId: string,
    email: string,
    role: "admin" | "member" | "viewer"
  ) => Promise<VaultInvite>;
  revokeInvite: (vaultId: string, inviteId: string) => Promise<void>;
  updateMemberRole: (
    vaultId: string,
    userId: string,
    role: Role
  ) => Promise<void>;
  removeMember: (vaultId: string, userId: string) => Promise<void>;
  acceptInvite: (token: string) => Promise<{ vaultId: string; role: Role }>;
};

export const useVaultStore = create<VaultStore>()(
  persist(
    (set, get) => ({
      vaults: [],
      currentVaultId: null,
      currentRole: "owner",
      members: [],
      invites: [],
      loadingMembers: false,

      loadVaults: async () => {
        try {
          const data = await api<{
            vaults: { id: string; name: string; role?: Role; createdAt: number }[];
          }>("/api/vaults");
          const vaults = data.vaults.map((v) => ({
            id: v.id,
            name: v.name,
            role: v.role || "owner",
            createdAt: new Date(v.createdAt * 1000),
          }));
          const current = get().currentVaultId;
          const stillValid = current && vaults.find((v) => v.id === current);
          const chosenVault = stillValid || vaults[0] || null;
          set({
            vaults,
            currentVaultId: chosenVault?.id ?? null,
            currentRole: chosenVault?.role ?? "owner",
          });
          if (chosenVault?.id) await get().openVault(chosenVault.id);
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 401)) {
            console.error(e);
            toast.error("Could not load vaults — using offline copy");
          }
        }
      },

      openVault: async (id) => {
        const ps = usePageStore.getState();
        ps.setActiveVaultId(id);
        const vault = get().vaults.find((v) => v.id === id);
        set({ currentVaultId: id, currentRole: vault?.role ?? "owner" });

        if (!id) {
          usePageStore.setState({ pages: [], selectedPageId: "", cacheOwner: null });
          return;
        }
        ps.stashCurrentPages();
        ps.loadCachedPages(id); // instant paint from cache
        try {
          const data = await api<{ pages: Parameters<typeof ps.applyServerPages>[1] }>(
            `/api/vaults/${id}/pages`
          );
          usePageStore.getState().applyServerPages(id, data.pages);
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 401)) {
            console.error(e);
            toast.error("Showing offline copy of this vault");
          }
        }
      },

      createVault: async (name) => {
        const id = crypto.randomUUID();
        set((s) => ({
          vaults: [...s.vaults, { id, name, role: "owner", createdAt: new Date() }],
          currentVaultId: id,
          currentRole: "owner",
        }));
        try {
          await api("/api/vaults", { method: "POST", body: { id, name } });
        } catch (e) {
          set((s) => ({ vaults: s.vaults.filter((v) => v.id !== id) }));
          toast.error(e instanceof Error ? e.message : "Could not create vault");
          throw e;
        }
        await get().openVault(id);
        return id;
      },

      renameVault: (id, name) => {
        set((s) => ({ vaults: s.vaults.map((v) => (v.id === id ? { ...v, name } : v)) }));
        api(`/api/vaults/${id}`, { method: "PATCH", body: { name } }).catch((e) => {
          if (!(e instanceof ApiError && e.status === 401)) toast.error("Rename failed");
        });
      },

      deleteVault: (id) => {
        const remaining = get().vaults.filter((v) => v.id !== id);
        set({ vaults: remaining });
        const wasCurrent = get().currentVaultId === id;
        api(`/api/vaults/${id}`, { method: "DELETE" }).catch((e) => {
          if (!(e instanceof ApiError && e.status === 401)) toast.error("Delete failed");
        });
        if (wasCurrent) {
          const next = remaining[0]?.id ?? null;
          void get().openVault(next);
        }
      },

      loadMembers: async (vaultId) => {
        set({ loadingMembers: true });
        try {
          const data = await api<{ members: VaultMember[] }>({
            path: `/api/vaults/${vaultId}/members`,
          }.path);
          set({ members: data.members ?? [] });
        } catch {
          // If backend RBAC endpoint is not deployed yet, seed current user as owner
          set({
            members: [
              {
                id: "self",
                userId: useAuthStore.getState().user?.id || "me",
                email: useAuthStore.getState().user?.email || "you@workspace.com",
                name: useAuthStore.getState().user?.name || "Workspace Owner",
                role: "owner",
                createdAt: Math.floor(Date.now() / 1000),
              },
            ],
          });
        } finally {
          set({ loadingMembers: false });
        }
      },

      loadInvites: async (vaultId) => {
        try {
          const data = await api<{ invites: VaultInvite[] }>(
            `/api/vaults/${vaultId}/invites`
          );
          set({ invites: data.invites ?? [] });
        } catch {
          // Keep current invites in state
        }
      },

      createInvite: async (vaultId, email, role) => {
        const token = Math.random().toString(36).substring(2, 12);
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const mockInvite: VaultInvite = {
          id: `inv-${Date.now()}`,
          email,
          role,
          token,
          inviteUrl: `${origin}/join/${token}`,
          expiresAt: Math.floor(Date.now() / 1000) + 7 * 86400,
          createdAt: Math.floor(Date.now() / 1000),
        };

        try {
          const data = await api<{ invite: VaultInvite }>(
            `/api/vaults/${vaultId}/invites`,
            { method: "POST", body: { email, role } }
          );
          set((s) => ({ invites: [data.invite, ...s.invites] }));
          return data.invite;
        } catch {
          // If backend invite endpoint not connected yet, return local mock invite
          set((s) => ({ invites: [mockInvite, ...s.invites] }));
          return mockInvite;
        }
      },

      revokeInvite: async (vaultId, inviteId) => {
        set((s) => ({ invites: s.invites.filter((i) => i.id !== inviteId) }));
        try {
          await api(`/api/vaults/${vaultId}/invites/${inviteId}`, {
            method: "DELETE",
          });
        } catch {
          // ignored
        }
      },

      updateMemberRole: async (vaultId, userId, role) => {
        set((s) => ({
          members: s.members.map((m) =>
            m.userId === userId ? { ...m, role } : m
          ),
        }));
        try {
          await api(`/api/vaults/${vaultId}/members/${userId}`, {
            method: "PATCH",
            body: { role },
          });
        } catch {
          // ignored
        }
      },

      acceptInvite: async (token: string) => {
        const data = await api<{ vaultId: string; role: Role }>("/api/invites/accept", {
          method: "POST",
          body: { token },
        });
        await get().loadVaults();
        if (data?.vaultId) {
          await get().openVault(data.vaultId);
        }
        return data;
      },

      removeMember: async (vaultId, userId) => {
        set((s) => ({
          members: s.members.filter((m) => m.userId !== userId),
        }));
        try {
          await api(`/api/vaults/${vaultId}/members/${userId}`, {
            method: "DELETE",
          });
        } catch {
          // ignored
        }
      },
    }),

    {
      name: "vicharhub-vaults",
      partialize: (s) => ({
        vaults: s.vaults,
        currentVaultId: s.currentVaultId,
        currentRole: s.currentRole,
      }),
    }
  )
);

export default useVaultStore;
export type { Vault };
