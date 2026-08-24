import { create } from "zustand";

type Theme = "dark" | "light";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("vicharhub-theme");
  return stored === "light" ? "light" : "dark";
}

type UIStore = {
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;

  trashOpen: boolean;
  setTrashOpen: (open: boolean) => void;

  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  theme: Theme;
  toggleTheme: () => void;
};

export const useUIStore = create<UIStore>((set, get) => ({
  commandOpen: false,

  setCommandOpen: (open) =>
    set({
      commandOpen: open,
    }),

  trashOpen: false,

  setTrashOpen: (open) =>
    set({
      trashOpen: open,
    }),

  settingsOpen: false,

  setSettingsOpen: (open) =>
    set({
      settingsOpen: open,
    }),

  sidebarOpen: false,

  setSidebarOpen: (open) =>
    set({
      sidebarOpen: open,
    }),

  theme: getInitialTheme(),

  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    localStorage.setItem("vicharhub-theme", next);
    set({ theme: next });
  },
}));
