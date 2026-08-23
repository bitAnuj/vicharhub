import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setCurrentVaultId as setPageVaultId, usePageStore } from "./usePageStore";

type Vault = { id: string; name: string; createdAt: string };
type VaultStore = {
  vaults: Vault[];
  currentVaultId: string | null;
  createVault: (name: string) => string;
  renameVault: (id: string, name: string) => void;
  deleteVault: (id: string) => void;
  setCurrentVaultId: (id: string | null) => void;
};

export const useVaultStore = create<VaultStore>()(
  persist<VaultStore>((set, get) => {
    // Safe switch: READ the target vault's saved data FIRST, swap the
    // storage prefix, then load straight from disk. No write ever happens
    // against an existing vault's key, so nothing can be wiped.
    const enterVault = (id: string | null) => {
      const key = id ? `vicharhub-vault-${id}-notion-clone-storage` : "notion-clone-storage";
      const raw = localStorage.getItem(key);
      setPageVaultId(id);

      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
          usePageStore.setState({
            ...usePageStore.getInitialState(),
            ...((parsed.state ?? {}) as object),
          });
          return;
        } catch {
          /* corrupted save — fall through and start clean */
        }
        usePageStore.setState(usePageStore.getInitialState());
        return;
      }

      // Fresh / empty vault only: seed initial state (key has no data yet,
      // so this write cannot destroy anything)
      usePageStore.setState(usePageStore.getInitialState());
    };

    return {
      vaults: [],
      currentVaultId: null,

      createVault: (name) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        set((state) => ({
          vaults: [...state.vaults, { id, name, createdAt: now }],
          currentVaultId: id,
        }));
        enterVault(id);
        return id;
      },

      renameVault: (id, name) =>
        set((state) => ({
          vaults: state.vaults.map((v) => (v.id === id ? { ...v, name } : v)),
        })),

      deleteVault: (id) => {
        const { vaults, currentVaultId } = get();
        const remaining = vaults.filter((v) => v.id !== id);
        localStorage.removeItem(`vicharhub-vault-${id}-notion-clone-storage`);

        if (currentVaultId !== id) {
          set({ vaults: remaining });
          return;
        }

        const next = remaining[0];
        if (next) {
          set({ vaults: remaining, currentVaultId: next.id });
          enterVault(next.id);
        } else {
          set({ vaults: [], currentVaultId: null });
          enterVault(null);
        }
      },

      setCurrentVaultId: (id) => {
        set({ currentVaultId: id });
        enterVault(id);
      },
    };
  }, { name: "vicharhub-vaults-registry" })
);

export default useVaultStore;
export type { Vault, VaultStore };
