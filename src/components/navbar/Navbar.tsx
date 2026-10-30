import { useState } from "react";
import {
  Menu,
  Search,
  Settings,
  ChevronDown,
  Check,
  Plus,
  LogOut,
  Moon,
  Sun,
  Link2,
  UserPlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useUIStore } from "../../store/useUIStore";
import { usePageStore } from "../../store/usePageStore";
import useVaultStore from "../../store/useVaultStore";
import { useAuthStore } from "../../store/useAuthStore";
import ActivityDropdown from "./ActivityDropdown";
import ShareModal from "../modals/ShareModal";

function Navbar() {
  const { setSidebarOpen, setCommandOpen, setSettingsOpen, theme, toggleTheme } =
    useUIStore();
  const { pages, selectedPageId } = usePageStore();
  const { vaults, currentVaultId, openVault, createVault, deleteVault } = useVaultStore();
  const [vaultMenuOpen, setVaultMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentPage = pages.find((p) => p.id === selectedPageId);
  const currentVault = vaults.find((v) => v.id === currentVaultId);
  const { user, logout } = useAuthStore();

  function handleDeleteVault(v: { id: string; name: string }) {
    if (
      confirm(
        `Are you sure you want to delete vault "${v.name}"?\nAll pages and documents in this vault will be permanently deleted.`
      )
    ) {
      deleteVault(v.id);
      toast.success(`Vault "${v.name}" deleted`);
      if (v.id === currentVaultId) {
        setVaultMenuOpen(false);
      }
    }
  }

  return (
    <>
      <header className="relative z-[60] flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-3 text-zinc-900 transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 md:px-6">
        <div className="flex items-center gap-2.5">
          {/* Modern Fitted Circular Logo Badge */}
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-300/80 bg-zinc-100 p-1.5 shadow-xs dark:border-zinc-700/80 dark:bg-zinc-950">
            <img
              src="/logo.png"
              alt="VicharHub"
              className="h-full w-full object-contain filter drop-shadow-xs"
            />
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 md:hidden"
          >
            <Menu size={20} />
          </button>
          <div className="relative">
            <button
              onClick={() => setVaultMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              {currentVault?.name ?? "VicharHub"}
              <ChevronDown size={14} className="text-zinc-400 dark:text-zinc-500" />
            </button>
            {vaultMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-[90]"
                  onClick={() => setVaultMenuOpen(false)}
                />
                <div className="absolute left-0 top-full z-[100] mt-1 w-64 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Vaults
                  </p>
                  {vaults.map((v) => (
                    <div
                      key={v.id}
                      className="group flex items-center justify-between rounded-md px-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <button
                        onClick={() => {
                          void openVault(v.id);
                          setVaultMenuOpen(false);
                        }}
                        className="flex flex-1 items-center justify-between py-2 pl-2 pr-1 text-sm text-zinc-700 dark:text-zinc-300"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>{v.name}</span>
                          {v.role && (
                            <span className="rounded bg-zinc-100 px-1.5 py-0.2 text-[10px] uppercase font-mono text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                              {v.role}
                            </span>
                          )}
                        </div>
                        {v.id === currentVaultId && (
                          <Check size={14} className="text-indigo-600 dark:text-zinc-400" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVault(v);
                        }}
                        className="opacity-0 group-hover:opacity-100 rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-opacity"
                        title={`Delete vault "${v.name}"`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                  {user?.email && (
                    <p className="truncate px-3 py-1 text-xs text-zinc-500">
                      {user.email}
                    </p>
                  )}
                  <button
                    onClick={() => {
                      void logout();
                      setVaultMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-500 hover:bg-zinc-100 dark:text-red-400 dark:hover:bg-zinc-800"
                  >
                    <LogOut size={14} /> Log out
                  </button>
                  <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                  <button
                    onClick={() => {
                      const name = prompt("Enter new vault name:");
                      if (name && name.trim()) void createVault(name.trim());
                      setVaultMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <Plus size={14} /> New vault
                  </button>
                  {currentVault && (
                    <button
                      onClick={() => handleDeleteVault(currentVault)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
                      title="Delete this vault"
                    >
                      <Trash2 size={14} /> Delete current vault
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Share / Invite Button */}
          {currentVaultId && (
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
              title="Invite members & manage permissions"
            >
              <UserPlus size={14} />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-zinc-50 p-2 text-sm text-zinc-600 hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:px-3 sm:py-1.5"
          >
            <Search size={16} />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-500 sm:inline">
              Ctrl K
            </kbd>
          </button>
          {currentPage && (
            <button
              onClick={async () => {
                const url = `${window.location.origin}/p/${currentPage.id}`;
                await navigator.clipboard.writeText(url);
                setCopied(true);
                toast.success("Page link copied to clipboard!");
                setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              title="Copy link to this page"
            >
              {copied ? <Check size={18} /> : <Link2 size={18} />}
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            title={
              theme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <ActivityDropdown />
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Workspace Share & RBAC Modal */}
      {currentVaultId && (
        <ShareModal
          vaultId={currentVaultId}
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  );
}

export default Navbar;
