import { Home, Plus, Star, Trash2, X, PenTool } from "lucide-react";

import { usePageStore } from "../../store/usePageStore";
import useVaultStore from "../../store/useVaultStore";
import { toast } from "sonner";
import { useUIStore } from "../../store/useUIStore";
import PageTreeItem from "./PageTreeItem";
import TrashPanel from "./TrashPanel";
import SettingsPanel from "./SettingsPanel";
import { useNewPageShortcut } from "../../hooks/useHotkeys";

function Sidebar() {
  const { pages, addPage, selectPage } = usePageStore();
  const { setTrashOpen, sidebarOpen, setSidebarOpen } = useUIStore();
  const { vaults, currentVaultId, deleteVault } = useVaultStore();
  const currentVault = vaults.find((v) => v.id === currentVaultId);

  // Register 'N' hotkey to create a new page when not typing
  useNewPageShortcut(() => {
    addPage();
  });

  const visiblePages = pages.filter((page) => !page.trashed);
  const favoritePages = visiblePages.filter((page) => page.favorite);
  const rootPages = visiblePages.filter((page) => page.parentId === null);

  const handleOpenBoard = () => {
    const existingBoard = visiblePages.find(
      (p) =>
        p.icon === "🎨" ||
        p.title.toLowerCase().includes("board") ||
        p.title.toLowerCase().includes("whiteboard") ||
        (p.content && p.content.includes('"type":"board"'))
    );
    if (existingBoard) {
      selectPage(existingBoard.id);
    } else {
      addPage({
        title: "Whiteboard",
        icon: "🎨",
        content: JSON.stringify({
          type: "board",
          elements: [],
        }),
      });
    }
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Dark backdrop behind the sidebar on mobile, tap to close */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 -translate-x-full flex-col border-r border-zinc-200 bg-zinc-50 text-zinc-800 transition-transform duration-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 md:static md:z-auto md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : ""
        }`}
      >
        <div className="flex items-center justify-between p-2 md:hidden">
          <span className="px-2 text-sm font-semibold">VicharHub</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Vault Section */}
        {currentVault && (
          <div className="border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  {currentVault.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {currentVault.name}
                  </p>
                  <span className="text-[10px] text-zinc-400 uppercase font-mono">
                    {currentVault.role || "owner"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  if (
                    confirm(
                      `Are you sure you want to delete vault "${currentVault.name}"?\nAll documents in this vault will be permanently deleted.`
                    )
                  ) {
                    deleteVault(currentVault.id);
                    toast.success(`Vault "${currentVault.name}" deleted`);
                  }
                }}
                className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                title={`Delete vault "${currentVault.name}"`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )}

        <div className="space-y-0.5 p-2">
          <button
            onClick={() => {
              selectPage("");
              setSidebarOpen(false);
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <Home size={16} className="text-zinc-500 dark:text-zinc-400" />
            Home Dashboard
          </button>

          <button
            onClick={handleOpenBoard}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <PenTool size={16} className="text-purple-500 dark:text-purple-400" />
            Whiteboard
          </button>

          <button
            onClick={() => setTrashOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <Trash2 size={16} className="text-zinc-500 dark:text-zinc-400" />
            Trash
          </button>
        </div>

        <div className="mx-2 border-t border-zinc-200 dark:border-zinc-800" />

        <div className="p-2">
          <button
            onClick={() => addPage()}
            className="group flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <div className="flex items-center gap-2.5">
              <Plus size={16} className="text-zinc-500 group-hover:text-zinc-800 dark:text-zinc-400 dark:group-hover:text-zinc-200" />
              <span>New Page</span>
            </div>
            <kbd className="rounded border border-zinc-300 bg-zinc-200/90 px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-700 group-hover:border-zinc-400 dark:border-zinc-700/60 dark:bg-zinc-800/80 dark:text-zinc-400 dark:group-hover:text-zinc-200 shadow-xs">
              N
            </kbd>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {favoritePages.length > 0 && (
            <>
              <p className="mb-1 mt-2 flex items-center gap-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                <Star size={11} />
                Favorites
              </p>
              {favoritePages.map((page) => (
                <PageTreeItem key={page.id} page={page} depth={0} />
              ))}
            </>
          )}

          <p className="mb-1 mt-3 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
            Pages
          </p>

          {rootPages.length === 0 && (
            <p className="px-2.5 py-2 text-xs text-zinc-500 dark:text-zinc-500">
              No pages yet
            </p>
          )}

          {rootPages.map((page) => (
            <PageTreeItem key={page.id} page={page} depth={0} />
          ))}
        </div>

        <TrashPanel />
        <SettingsPanel />
      </aside>
    </>
  );
}

export default Sidebar;
