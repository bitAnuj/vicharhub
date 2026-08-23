import { useUIStore } from "../../store/useUIStore";
import { usePageStore } from "../../store/usePageStore";
import { Search, Settings, Menu, Sun, Moon, Link2, Check } from "lucide-react";
import { useState } from "react";
import ActivityDropdown from "./ActivityDropdown";

function Navbar() {
  const { setCommandOpen, setSettingsOpen, setSidebarOpen, theme, toggleTheme } =
    useUIStore();
  const [copied, setCopied] = useState(false);
  const { pages, selectedPageId } = usePageStore();
  const currentPage = pages.find((p) => p.id === selectedPageId);

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-3 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 md:hidden"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-semibold tracking-tight">VicharHub</h1>
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        <button
          onClick={() => setCommandOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 p-2 text-sm text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-100 sm:px-3 sm:py-1.5"
        >
          <Search size={16} />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500 sm:inline">
            Ctrl K
          </kbd>
        </button>
        {currentPage && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}?page=${currentPage.id}`
              );
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            title="Copy link to this page"
          >
            {copied ? <Check size={18} /> : <Link2 size={18} />}
          </button>
        )}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <ActivityDropdown />

        <button
          onClick={() => setSettingsOpen(true)}
          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}

export default Navbar;
