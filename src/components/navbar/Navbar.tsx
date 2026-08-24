import { useState } from "react";
import { useUIStore } from "../../store/useUIStore";
import { usePageStore } from "../../store/usePageStore";
import useVaultStore from "../../store/useVaultStore";
import { useAuthStore } from "../../store/useAuthStore";
import { Search, Settings, Menu, Sun, Moon, Link2, Check, ChevronDown, Plus, Pencil, Trash2, LogOut } from "lucide-react";
import ActivityDropdown from "./ActivityDropdown";

function Navbar() {
  const { setCommandOpen, setSettingsOpen, setSidebarOpen, theme, toggleTheme } = useUIStore();
  const { pages, selectedPageId } = usePageStore();
  const { vaults, currentVaultId, openVault, createVault, renameVault, deleteVault } = useVaultStore();
  const [copied, setCopied] = useState(false);
  const [vaultMenuOpen, setVaultMenuOpen] = useState(false);
  const currentPage = pages.find((p) => p.id === selectedPageId);
  const currentVault = vaults.find((v) => v.id === currentVaultId);
  const { user, logout } = useAuthStore();

  return (
    <header className="relative z-[60] flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3 md:px-6">
      <div className="flex items-center gap-2">
        <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 md:hidden"><Menu size={20} /></button>
        <div className="relative">
          <button onClick={() => setVaultMenuOpen((o) => !o)} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800">
            {currentVault?.name ?? "VicharHub"}
            <ChevronDown size={14} className="text-zinc-500" />
          </button>
          {vaultMenuOpen && (
            <>
              <div className="fixed inset-0 z-[90]" onClick={() => setVaultMenuOpen(false)} />
              <div className="absolute left-0 top-full z-[100] mt-1 w-64 rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-xl">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Vaults</p>
                {vaults.map((v) => (
                  <div key={v.id} className="group flex items-center rounded-md px-1 hover:bg-zinc-800">
                    <button onClick={() => { void openVault(v.id); setVaultMenuOpen(false); }} className="flex flex-1 items-center justify-between py-2 pl-2 pr-1 text-sm text-zinc-300">
                      <span>{v.name}</span>
                      {v.id === currentVaultId && <Check size={14} className="text-zinc-400" />}
                    </button>
                    <div className="flex items-center gap-0.5 pr-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button title="Rename vault" onClick={() => { const name = prompt("Rename vault:", v.name); if (name && name.trim()) renameVault(v.id, name.trim()); }} className="rounded p-1.5 text-zinc-500 hover:text-zinc-100"><Pencil size={13} /></button>
                      <button title="Delete vault" onClick={() => { if (confirm(`Delete vault "${v.name}"? Its pages will be permanently removed.`)) deleteVault(v.id); }} className="rounded p-1.5 text-zinc-500 hover:text-red-400"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
                <div className="my-1 border-t border-zinc-800" />
                <p className="px-3 py-1.5 truncate text-[11px] text-zinc-600">{user?.email}</p>
                <button onClick={() => { void logout(); setVaultMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 hover:bg-zinc-800">
                  <LogOut size={14} /> Log out
                </button>
                <div className="my-1 border-t border-zinc-800" />
                <button onClick={() => { const name = prompt("Enter new vault name:"); if (name && name.trim()) void createVault(name.trim()); setVaultMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
                  <Plus size={14} /> New vault
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 md:gap-2">
        <button onClick={() => setCommandOpen(true)} className="flex items-center gap-2 rounded-lg border border-zinc-700 p-2 text-sm text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-100 sm:px-3 sm:py-1.5"><Search size={16} /><span className="hidden sm:inline">Search</span><kbd className="hidden rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500 sm:inline">Ctrl K</kbd></button>
        {currentPage && (<button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?page=${currentPage.id}`); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" title="Copy link to this page">{copied ? <Check size={18} /> : <Link2 size={18} />}</button>)}
        <button onClick={toggleTheme} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
        <ActivityDropdown />
        <button onClick={() => setSettingsOpen(true)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"><Settings size={18} /></button>
      </div>
    </header>
  );
}
export default Navbar;
