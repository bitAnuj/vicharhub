import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { api, ApiError } from "../lib/api";
import { usePageStore } from "./usePageStore";

type Vault = { id: string; name: string; createdAt: Date };

type VaultStore = {
  vaults: Vault[];
  currentVaultId: string | null;

  loadVaults: () => Promise<void>;
  openVault: (id: string | null) => Promise<void>;
  createVault: (name: string) => Promise<string>;
  renameVault: (id: string, name: string) => void;
  deleteVault: (id: string) => void;
};

export const useVaultStore = create<VaultStore>()(
  persist(
    (set, get) => ({
      vaults: [],
      currentVaultId: null,

      loadVaults: async () => {
        try {
          const data = await api<{ vaults: { id: string; name: string; createdAt: number }[] }>("/api/vaults");
          const vaults = data.vaults.map((v) => ({ id: v.id, name: v.name, createdAt: new Date(v.createdAt * 1000) }));
          const current = get().currentVaultId;
          const stillValid = current && vaults.some((v) => v.id === current);
          set({ vaults, currentVaultId: stillValid ? current : vaults[0]?.id ?? null });
          if (get().currentVaultId) await get().openVault(get().currentVaultId);
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
        set({ currentVaultId: id });
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
        set((s) => ({ vaults: [...s.vaults, { id, name, createdAt: new Date() }] }));
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
    }),

    {
      name: "vicharhub-vaults",
      partialize: (s) => ({ vaults: s.vaults, currentVaultId: s.currentVaultId }),
    }
  )
);

export default useVaultStore;
export type { Vault };
