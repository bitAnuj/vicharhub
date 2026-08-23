import { create } from "zustand";
import { persist } from "zustand/middleware";

let vaultId: string | null = null;

export const setCurrentVaultId = (id: string | null) => {
  vaultId = id;
};

const customStorage = {
  getItem: (name: string) => {
    const key = vaultId ? `vicharhub-vault-${vaultId}-${name}` : name;
    return localStorage.getItem(key);
  },
  setItem: (name: string, value: string) => {
    const key = vaultId ? `vicharhub-vault-${vaultId}-${name}` : name;
    localStorage.setItem(key, value);
  },
  removeItem: (name: string) => {
    const key = vaultId ? `vicharhub-vault-${vaultId}-${name}` : name;
    localStorage.removeItem(key);
  },
};

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

type PageStore = {
  pages: Page[];
  selectedPageId: string;

  addPage: () => void;
  addChildPage: (parentId: string) => void;
  duplicatePage: (id: string) => void;

  deletePage: (id: string) => void;
  restorePage: (id: string) => void;
  permanentlyDeletePage: (id: string) => void;

  renamePage: (id: string, title: string) => void;
  updateContent: (id: string, content: string) => void;
  updateIcon: (id: string, icon: string) => void;
  updateCover: (id: string, cover: string) => void;

  toggleExpanded: (id: string) => void;
  toggleFavorite: (id: string) => void;
  movePage: (id: string, newParentId: string | null) => void;
  setAllPages: (pages: Page[]) => void;
  reorderPage: (
    draggedId: string,
    targetId: string,
    position: "before" | "after"
  ) => void;

  selectPage: (id: string) => void;
};

const initialPages: Page[] = [
  {
    id: crypto.randomUUID(),
    title: "Welcome",
    content: "",
    icon: "🏠",
    cover: "",
    favorite: false,
    trashed: false,
    parentId: null,
    isExpanded: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];


export const usePageStore = create<PageStore>()(
  persist(
    (set) => ({
      pages: initialPages,

      selectedPageId: initialPages[0]?.id ?? "",

      addPage: () =>
        set((state) => ({
          pages: [
            ...state.pages,
            {
              id: crypto.randomUUID(),
              title: "Untitled",
              content: "",
              icon: "📄",
              cover: "",
              favorite: false,
              trashed: false,
              parentId: null,
              isExpanded: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        })),

      addChildPage: (parentId: string) =>
        set((state) => ({
          pages: [
            ...state.pages,
            {
              id: crypto.randomUUID(),
              title: "Untitled",
              content: "",
              icon: "📄",
              cover: "",
              favorite: false,
              trashed: false,
              parentId,
              isExpanded: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        })),

      duplicatePage: (id: string) =>
        set((state) => {
          const page = state.pages.find((p) => p.id === id);
          if (!page) return state;

          const copy = {
            ...page,
            id: crypto.randomUUID(),
            title: `${page.title} Copy`,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          return {
            pages: [...state.pages, copy],
          };
        }),

      deletePage: (id: string) =>
        set((state) => {
          const idsToTrash = new Set<string>();
          const collect = (targetId: string) => {
            idsToTrash.add(targetId);
            state.pages
              .filter((page) => page.parentId === targetId)
              .forEach((child) => collect(child.id));
          };
          collect(id);

          const updatedPages = state.pages.map((page) =>
            idsToTrash.has(page.id) ? { ...page, trashed: true } : page
          );

          const visiblePages = updatedPages.filter((p) => !p.trashed);

          return {
            pages: updatedPages,
            selectedPageId: idsToTrash.has(state.selectedPageId)
              ? visiblePages[0]?.id ?? ""
              : state.selectedPageId,
          };
        }),

      restorePage: (id) =>
        set((state) => {
          const idsToRestore = new Set<string>();
          const collect = (targetId: string) => {
            idsToRestore.add(targetId);
            state.pages
              .filter((page) => page.parentId === targetId)
              .forEach((child) => collect(child.id));
          };
          collect(id);

          return {
            pages: state.pages.map((page) =>
              idsToRestore.has(page.id) ? { ...page, trashed: false } : page
            ),
          };
        }),

      permanentlyDeletePage: (id) =>
        set((state) => {
          const idsToDelete = new Set<string>();
          const collect = (targetId: string) => {
            idsToDelete.add(targetId);
            state.pages
              .filter((page) => page.parentId === targetId)
              .forEach((child) => collect(child.id));
          };
          collect(id);

          return {
            pages: state.pages.filter((page) => !idsToDelete.has(page.id)),
          };
        }),

      renamePage: (id: string, title: string) =>
        set((state) => ({
          pages: state.pages.map((page) =>
            page.id === id ? { ...page, title, updatedAt: new Date() } : page
          ),
        })),

      updateContent: (id: string, content: string) =>
        set((state) => ({
          pages: state.pages.map((page) =>
            page.id === id ? { ...page, content, updatedAt: new Date() } : page
          ),
        })),

      updateIcon: (id: string, icon: string) =>
        set((state) => ({
          pages: state.pages.map((page) =>
            page.id === id ? { ...page, icon, updatedAt: new Date() } : page
          ),
        })),

      updateCover: (id: string, cover: string) =>
        set((state) => ({
          pages: state.pages.map((page) =>
            page.id === id ? { ...page, cover, updatedAt: new Date() } : page
          ),
        })),

      toggleFavorite: (id: string) =>
        set((state) => ({
          pages: state.pages.map((page) =>
            page.id === id
              ? { ...page, favorite: !page.favorite, updatedAt: new Date() }
              : page
          ),
        })),

      toggleExpanded: (id: string) =>
        set((state) => ({
          pages: state.pages.map((page) =>
            page.id === id ? { ...page, isExpanded: !page.isExpanded } : page
          ),
        })),

      movePage: (id: string, newParentId: string | null) =>
        set((state) => {
          const isDescendant = (
            candidateId: string,
            ancestorId: string
          ): boolean => {
            const candidate = state.pages.find((p) => p.id === candidateId);
            if (!candidate || candidate.parentId === null) return false;
            if (candidate.parentId === ancestorId) return true;
            return isDescendant(candidate.parentId, ancestorId);
          };

          if (newParentId === id) return state;
          if (newParentId && isDescendant(newParentId, id)) return state;

          return {
            pages: state.pages.map((page) =>
              page.id === id
                ? { ...page, parentId: newParentId, isExpanded: true }
                : page
            ),
          };
        }),

      setAllPages: (pages: Page[]) =>
        set({
          pages,
          selectedPageId: pages[0]?.id ?? "",
        }),

      reorderPage: (draggedId: string, targetId: string, position: "before" | "after") =>
        set((state) => {
          const dragged = state.pages.find((p) => p.id === draggedId);
          const target = state.pages.find((p) => p.id === targetId);

          if (!dragged || !target || dragged.id === target.id) return state;

          const withoutDragged = state.pages.filter(
            (p) => p.id !== draggedId
          );
          const updatedDragged = { ...dragged, parentId: target.parentId };

          const targetIndex = withoutDragged.findIndex(
            (p) => p.id === targetId
          );
          const insertIndex = position === "before" ? targetIndex : targetIndex + 1;

          const newPages = [...withoutDragged];
          newPages.splice(insertIndex, 0, updatedDragged);

          return { pages: newPages };
        }),

      selectPage: (id: string) =>
        set({
          selectedPageId: id,
        }),
    }),

    {
      name: "notion-clone-storage",
      storage: customStorage as unknown as import("zustand/middleware").PersistStorage<PageStore, PageStore>,
    }
  )
);
