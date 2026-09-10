import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { api, ApiError } from "../lib/api";

type Page = {
  id: string;
  title: string;
  content: string;
  icon: string;
  cover: string;
  favorite: boolean;
  trashed: boolean;
  parentId: string | null;
  isExpanded: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ServerPage = {
  id: string;
  vaultId: string;
  parentId: string | null;
  title: string;
  content: string;
  icon: string;
  cover: string;
  favorite: boolean;
  trashed: boolean;
  isExpanded: boolean;
  orderIndex: number;
  createdAt: number; // unix seconds
  updatedAt: number;
};

function fromServer(p: ServerPage): Page {
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    icon: p.icon,
    cover: p.cover,
    favorite: p.favorite,
    trashed: p.trashed,
    parentId: p.parentId,
    isExpanded: p.isExpanded,
    createdAt: new Date(p.createdAt * 1000),
    updatedAt: new Date(p.updatedAt * 1000),
  };
}

type PageStore = {
  pages: Page[];
  selectedPageId: string;
  // which vault the current cached pages belong to (offline instant-paint)
  cacheOwner: string | null;
  cache?: Record<string, { pages: Page[]; selectedPageId: string }> | undefined;

  addPage: () => void;
  addChildPage: (parentId: string) => void;
  duplicatePage: (id: string) => void;

  deletePage: (id: string) => void;
  restorePage: (id: string) => void;
  permanentlyDeletePage: (id: string) => void;

  renamePage: (id: string, title: string) => void;
  updateContent: (id: string, content: string) => void;
  flushContent: (id: string) => void;
  updateIcon: (id: string, icon: string) => void;
  updateCover: (id: string, cover: string) => void;

  toggleExpanded: (id: string) => void;
  toggleFavorite: (id: string) => void;
  movePage: (id: string, newParentId: string | null) => void;
  setAllPages: (pages: Page[]) => void;
  reorderPage: (draggedId: string, targetId: string, position: "before" | "after") => void;

  selectPage: (id: string) => void;

  // ---- used by the vault store (not UI) ----
  setActiveVaultId: (vaultId: string | null) => void;
  stashCurrentPages: () => void;
  loadCachedPages: (vaultId: string) => void;
  applyServerPages: (vaultId: string, pages: ServerPage[]) => void;
};

// ---------- module-level bridge (set by vault store, avoids import cycles) ----------
let activeVaultId: string | null = null;

const fail = (e: unknown) => {
  if (e instanceof ApiError && e.status === 401) return; // global handler logs out
  console.error(e);
  toast.error("Sync failed — change kept locally, will retry on next action");
};
// debounced content saves (typing fires many updates/sec)
const contentTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const pendingContent: Record<string, string> = {};

const initialPages: Page[] = [];

export const usePageStore = create<PageStore>()(
  persist(
    (set, get) => ({
      pages: initialPages,
      selectedPageId: "",
      cacheOwner: null,

      addPage: () => {
        const id = crypto.randomUUID();
        const now = new Date();
        const vaultId = activeVaultId;
        set((s) => ({
          pages: [
            ...s.pages,
            { id, title: "Untitled", content: "", icon: "📄", cover: "", favorite: false, trashed: false, parentId: null, isExpanded: true, createdAt: now, updatedAt: now },
          ],
          selectedPageId: s.selectedPageId || id,
        }));
        if (vaultId)
          api("/api/pages", { method: "POST", body: { id, vaultId } }).catch(fail);
      },

      addChildPage: (parentId) => {
        const id = crypto.randomUUID();
        const now = new Date();
        const vaultId = activeVaultId;
        set((s) => ({
          pages: [...s.pages, { id, title: "Untitled", content: "", icon: "📄", cover: "", favorite: false, trashed: false, parentId, isExpanded: true, createdAt: now, updatedAt: now }],
        }));
        if (vaultId)
          api("/api/pages", { method: "POST", body: { id, vaultId, parentId } }).catch(fail);
      },

      duplicatePage: (id) => {
        const source = get().pages.find((p) => p.id === id);
        if (!source) return;
        const vaultId = activeVaultId;
        if (!vaultId) return;
        api<{ page: ServerPage }>(`/api/pages/${id}/duplicate`, { method: "POST", body: {} })
          .then(({ page }) => {
            if (page) set((s) => ({ pages: [...s.pages, fromServer(page)] }));
          })
          .catch(fail);
      },

      deletePage: (id) => {
        const idsToTrash = new Set<string>();
        const collect = (targetId: string) => {
          idsToTrash.add(targetId);
          get().pages.filter((p) => p.parentId === targetId).forEach((c) => collect(c.id));
        };
        collect(id);
        set((s) => ({
          pages: s.pages.map((p) => (idsToTrash.has(p.id) ? { ...p, trashed: true, updatedAt: new Date() } : p)),
          selectedPageId: idsToTrash.has(s.selectedPageId)
            ? s.pages.filter((p) => !p.trashed && !idsToTrash.has(p.id))[0]?.id ?? ""
            : s.selectedPageId,
        }));
        api(`/api/pages/${id}`, { method: "DELETE" }).catch(fail);
      },

      restorePage: (id) => {
        const ids = new Set<string>();
        const collect = (targetId: string) => {
          ids.add(targetId);
          get().pages.filter((p) => p.parentId === targetId).forEach((c) => collect(c.id));
        };
        collect(id);
        set((s) => ({ pages: s.pages.map((p) => (ids.has(p.id) ? { ...p, trashed: false, updatedAt: new Date() } : p)) }));
        api(`/api/pages/${id}/restore`, { method: "POST" }).catch(fail);
      },

      permanentlyDeletePage: (id) => {
        const ids = new Set<string>();
        const collect = (targetId: string) => {
          ids.add(targetId);
          get().pages.filter((p) => p.parentId === targetId).forEach((c) => collect(c.id));
        };
        collect(id);
        set((s) => ({ pages: s.pages.filter((p) => !ids.has(p.id)) }));
        api(`/api/pages/${id}?permanent=true`, { method: "DELETE" }).catch(fail);
      },

      renamePage: (id, title) => {
        set((s) => ({ pages: s.pages.map((p) => (p.id === id ? { ...p, title, updatedAt: new Date() } : p)) }));
        api(`/api/pages/${id}`, { method: "PATCH", body: { title } }).catch(fail);
      },

      updateContent: (id, content) => {
        set((s) => ({ pages: s.pages.map((p) => (p.id === id ? { ...p, content, updatedAt: new Date() } : p)) }));
        pendingContent[id] = content;
        clearTimeout(contentTimers[id]);
        contentTimers[id] = setTimeout(() => {
          api(`/api/pages/${id}`, { method: "PATCH", body: { content } }).catch(fail);
          delete pendingContent[id];
        }, 600);
      },

      flushContent: (id) => {
        if (!(id in pendingContent)) return;
        clearTimeout(contentTimers[id]);
        const content = pendingContent[id];
        delete pendingContent[id];
        api(`/api/pages/${id}`, { method: "PATCH", body: { content } }).catch(fail);
      },

      updateIcon: (id, icon) => {
        set((s) => ({ pages: s.pages.map((p) => (p.id === id ? { ...p, icon, updatedAt: new Date() } : p)) }));
        api(`/api/pages/${id}`, { method: "PATCH", body: { icon } }).catch(fail);
      },

      updateCover: (id, cover) => {
        set((s) => ({ pages: s.pages.map((p) => (p.id === id ? { ...p, cover, updatedAt: new Date() } : p)) }));
        api(`/api/pages/${id}`, { method: "PATCH", body: { cover } }).catch(fail);
      },

      toggleFavorite: (id) => {
        let next = false;
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== id) return p;
            next = !p.favorite;
            return { ...p, favorite: next, updatedAt: new Date() };
          }),
        }));
        api(`/api/pages/${id}`, { method: "PATCH", body: { favorite: next } }).catch(fail);
      },

      toggleExpanded: (id) => {
        let next = true;
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== id) return p;
            next = !p.isExpanded;
            return { ...p, isExpanded: next };
          }),
        }));
        api(`/api/pages/${id}`, { method: "PATCH", body: { isExpanded: next } }).catch(fail);
      },

      movePage: (id, newParentId) => {
        const isDescendant = (candidateId: string, ancestorId: string): boolean => {
          const c = get().pages.find((p) => p.id === candidateId);
          if (!c || c.parentId === null) return false;
          if (c.parentId === ancestorId) return true;
          return isDescendant(c.parentId, ancestorId);
        };
        if (newParentId === id) return;
        if (newParentId && isDescendant(newParentId, id)) return;
        set((s) => ({
          pages: s.pages.map((p) => (p.id === id ? { ...p, parentId: newParentId, isExpanded: true, updatedAt: new Date() } : p)),
        }));
        api(`/api/pages/${id}`, { method: "PATCH", body: { parentId: newParentId } }).catch(fail);
      },

      setAllPages: (pages) => {
        // Settings → Import: apply instantly, then push every page to the server (option a)
        set({ pages, selectedPageId: pages[0]?.id ?? "" });
        const vaultId = activeVaultId;
        if (!vaultId) {
          toast.error("Import kept locally only — no vault selected");
          return;
        }
        (async () => {
          let done = 0;
          for (const p of pages) {
            try {
              await api("/api/pages", {
                method: "POST",
                body: {
                  id: p.id, vaultId, parentId: p.parentId, title: p.title, icon: p.icon,
                  content: p.content, cover: p.cover, favorite: p.favorite,
                  trashed: p.trashed, isExpanded: p.isExpanded,
                },
              });
              done++;
            } catch (e) {
              fail(e);
            }
          }
          toast.success(`Imported ${done}/${pages.length} pages to the cloud`);
        })();
      },

      reorderPage: (draggedId, targetId, position) => {
        const state = get();
        const dragged = state.pages.find((p) => p.id === draggedId);
        const target = state.pages.find((p) => p.id === targetId);
        if (!dragged || !target || dragged.id === target.id) return;
        const withoutDragged = state.pages.filter((p) => p.id !== draggedId);
        const updated = { ...dragged, parentId: target.parentId };
        const tIdx = withoutDragged.findIndex((p) => p.id === targetId);
        const insertIndex = position === "before" ? tIdx : tIdx + 1;
        const newPages = [...withoutDragged];
        newPages.splice(insertIndex, 0, updated);
        set({ pages: newPages });
        api("/api/pages/reorder", { method: "POST", body: { draggedId, targetId, position } }).catch(fail);
      },

      selectPage: (id) => set({ selectedPageId: id }),

      // ---- vault-store internals ----
      setActiveVaultId: (vaultId) => {
        activeVaultId = vaultId;
      },

      stashCurrentPages: () => {
        const owner = get().cacheOwner;
        if (!owner) return;
        set((s) => ({
          cache: { ...(s.cache ?? {}), [owner]: { pages: s.pages, selectedPageId: s.selectedPageId } },
        }));
      },

      loadCachedPages: (vaultId) => {
        const cached = get().cache?.[vaultId];
        if (cached) set({ pages: cached.pages, selectedPageId: cached.selectedPageId, cacheOwner: vaultId });
        else set({ pages: [], selectedPageId: "", cacheOwner: vaultId });
      },

      applyServerPages: (vaultId, serverPages) => {
        const pages = serverPages.map(fromServer);
        set((s) => ({
          pages,
          selectedPageId: s.cacheOwner === vaultId && s.selectedPageId && pages.some((p) => p.id === s.selectedPageId)
            ? s.selectedPageId
            : pages.find((p) => !p.trashed)?.id ?? "",
          cacheOwner: vaultId,
          cache: { ...(s.cache ?? {}), [vaultId]: { pages, selectedPageId: s.cacheOwner === vaultId ? s.selectedPageId : "" } },
        }));
      },
    }),

    {
      name: "vicharhub-cache",
      partialize: (s) => ({ pages: s.pages, selectedPageId: s.selectedPageId, cacheOwner: s.cacheOwner, cache: s.cache }),
    }
  )
);
