import { useRef, useState } from "react";
import {
  MoreHorizontal,
  ImagePlus,
  X,
  FilePlus,
  FileSpreadsheet,
  Clock,
  Star,
  Sparkles,
  ArrowRight,
  PenTool,
} from "lucide-react";
import { usePageStore } from "../../store/usePageStore";
import CollaborativeEditor from "./CollaborativeEditor";
import CollaborativeSpreadsheetEditor from "./CollaborativeSpreadsheetEditor";
import BoardEditor from "../board/BoardEditor";
import IconPicker from "./IconPicker";
import Breadcrumbs from "./Breadcrumbs";
import PageContextMenu from "../ui/PageContextMenu";
import PageIcon from "./PageIcon";
import { useClickOutside } from "../../lib/useClickOutside";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Editor() {
  const {
    pages,
    selectedPageId,
    renamePage,
    updateIcon,
    updateCover,
    addPage,
    toggleFavorite,
    duplicatePage,
    deletePage,
    selectPage,
    updateContent,
  } = usePageStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setMenuOpen(false));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const page = pages.find((p) => p.id === selectedPageId);

  const isSheetPage = Boolean(
    page?.content && (
      page.content.startsWith('{"type":"spreadsheet"') ||
      page.content.includes('"type":"spreadsheet"') ||
      page.content.includes('"type": "spreadsheet"')
    )
  );

  const isBoardPage = Boolean(
    page?.content && (
      page.content.startsWith('{"type":"board"') ||
      page.content.includes('"type":"board"') ||
      page.content.includes('"type": "board"')
    )
  );

  const [activeTabOverride, setActiveTabOverride] = useState<{
    pageId: string;
    tab: "doc" | "sheet" | "board";
  } | null>(null);

  const activeTab: "doc" | "sheet" | "board" =
    activeTabOverride && activeTabOverride.pageId === page?.id
      ? activeTabOverride.tab
      : isBoardPage
      ? "board"
      : isSheetPage
      ? "sheet"
      : "doc";

  // Home Dashboard when no page is selected
  if (!page) {
    const recentPages = [...pages]
      .filter((p) => !p.trashed)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 6);

    const favoritePages = pages.filter((p) => !p.trashed && p.favorite);

    const createSheetPage = () => {
      const defaultSpreadsheetContent = JSON.stringify({
        type: "spreadsheet",
        sheets: [
          {
            id: "sheet-1",
            title: "Sheet1",
            data: [
              ["", "", "", "", "", ""],
              ["", "", "", "", "", ""],
              ["", "", "", "", "", ""],
              ["", "", "", "", "", ""],
              ["", "", "", "", "", ""],
            ],
          },
        ],
        data: [
          ["", "", "", "", "", ""],
          ["", "", "", "", "", ""],
          ["", "", "", "", "", ""],
          ["", "", "", "", "", ""],
          ["", "", "", "", "", ""],
        ],
      });
      addPage({
        title: "Spreadsheet",
        icon: "📊",
        content: defaultSpreadsheetContent,
      });
    };

    const createBoardPage = () => {
      const defaultBoardContent = JSON.stringify({
        type: "board",
        elements: [],
      });
      addPage({
        title: "Whiteboard",
        icon: "🎨",
        content: defaultBoardContent,
      });
    };

    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8 text-zinc-900 dark:text-zinc-100">
        {/* Welcome Banner */}
        <div className="mb-8 rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 p-6 shadow-sm dark:border-zinc-800 dark:bg-gradient-to-br dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 dark:shadow-xl sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-600/20 dark:text-indigo-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Workspace Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Create new documents, launch spreadsheets, sketch on whiteboards, or pick up where you left off.
              </p>
            </div>
          </div>

          {/* Quick Action Tiles */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              onClick={() => addPage()}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-indigo-500/40 hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:hover:border-indigo-500/50 dark:hover:bg-zinc-800/50 group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500/20">
                  <FilePlus size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800 group-hover:text-indigo-600 dark:text-zinc-200 dark:group-hover:text-white">
                    New Document
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    Write notes, tasks & code
                  </p>
                </div>
              </div>
              <span className="rounded border border-zinc-200 bg-zinc-100 px-2 py-0.5 font-mono text-[10px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                Press N
              </span>
            </button>

            <button
              onClick={createSheetPage}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-emerald-500/40 hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:hover:border-emerald-500/50 dark:hover:bg-zinc-800/50 group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800 group-hover:text-emerald-600 dark:text-zinc-200 dark:group-hover:text-white">
                    New Spreadsheet
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    Formulas & multi-tabs
                  </p>
                </div>
              </div>
              <ArrowRight size={16} className="text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-600 dark:group-hover:text-zinc-300" />
            </button>

            <button
              onClick={createBoardPage}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-purple-500/40 hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:hover:border-purple-500/50 dark:hover:bg-zinc-800/50 group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500/20">
                  <PenTool size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800 group-hover:text-purple-600 dark:text-zinc-200 dark:group-hover:text-white">
                    New Whiteboard
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    Excalidraw canvas
                  </p>
                </div>
              </div>
              <ArrowRight size={16} className="text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-600 dark:group-hover:text-zinc-300" />
            </button>
          </div>
        </div>

        {/* Recent Pages Section */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <Clock size={14} className="text-zinc-400 dark:text-zinc-500" />
              Recently Edited Pages
            </h2>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{recentPages.length} documents</span>
          </div>

          {recentPages.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40">
              No documents created yet. Click &ldquo;New Document&rdquo; or press &ldquo;N&rdquo; to begin.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {recentPages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPage(p.id)}
                  className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-3.5 text-left transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60 group shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <PageIcon icon={p.icon} />
                    <span className="truncate text-sm font-medium text-zinc-800 group-hover:text-zinc-950 dark:text-zinc-200 dark:group-hover:text-white">
                      {p.title || "Untitled"}
                    </span>
                  </div>
                  <p className="mt-3 text-[11px] text-zinc-400 dark:text-zinc-500">
                    {timeAgo(p.updatedAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Favorite Pages Section */}
        {favoritePages.length > 0 && (
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <Star size={14} className="text-amber-500" />
              Starred Favorites
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {favoritePages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPage(p.id)}
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white p-3 text-left transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60 group shadow-xs"
                >
                  <PageIcon icon={p.icon} />
                  <span className="truncate text-xs font-medium text-zinc-800 group-hover:text-zinc-950 dark:text-zinc-200 dark:group-hover:text-white">
                    {p.title || "Untitled"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const handleCoverUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateCover(page.id, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mx-auto max-w-4xl text-zinc-900 dark:text-zinc-100">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverUpload}
      />

      {page.cover ? (
        <div className="group relative mb-4">
          <img
            src={page.cover}
            alt="Cover"
            className="h-48 w-full rounded-lg object-cover"
          />
          <button
            onClick={() => updateCover(page.id, "")}
            className="absolute right-2 top-2 rounded bg-zinc-900/80 p-1 text-zinc-300 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
            title="Remove cover"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}

      <div className="px-4 sm:px-8">
        <div className="mb-4 flex items-center justify-between">
          <Breadcrumbs page={page} />

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <PageContextMenu
                onRename={() => {
                  titleInputRef.current?.focus();
                  setMenuOpen(false);
                }}
                onDuplicate={() => {
                  duplicatePage(page.id);
                  setMenuOpen(false);
                }}
                onFavorite={() => {
                  toggleFavorite(page.id);
                  setMenuOpen(false);
                }}
                onDelete={() => {
                  deletePage(page.id);
                  setMenuOpen(false);
                }}
              />
            )}
          </div>
        </div>

        <div className="group/header mb-6">
          <div className="flex items-center gap-2">
            <IconPicker
              icon={page.icon}
              onSelect={(icon) => updateIcon(page.id, icon)}
            />
            {!page.cover && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 group-hover/header:opacity-100"
              >
                <ImagePlus size={14} />
                Add cover
              </button>
            )}
          </div>

          <input
            ref={titleInputRef}
            type="text"
            value={page.title}
            placeholder="Untitled"
            onChange={(e) => renamePage(page.id, e.target.value)}
            className="mt-3 w-full bg-transparent text-3xl font-bold text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-600"
          />
        </div>

        {/* Tab switch between Document, Spreadsheet, and Whiteboard (Board) mode */}
        <div className="mb-4 flex gap-1 border-b border-zinc-200 pb-2 dark:border-zinc-800">
          <button
            onClick={() => setActiveTabOverride({ pageId: page?.id ?? "", tab: "doc" })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "doc"
                ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 font-semibold"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            📝 Document
          </button>
          <button
            onClick={() => {
              setActiveTabOverride({ pageId: page?.id ?? "", tab: "sheet" });
              if (page && !isSheetPage) {
                const defaultSpreadsheetContent = JSON.stringify({
                  type: "spreadsheet",
                  sheets: [
                    {
                      id: "sheet-1",
                      title: "Sheet1",
                      data: [
                        ["", "", "", "", "", ""],
                        ["", "", "", "", "", ""],
                        ["", "", "", "", "", ""],
                        ["", "", "", "", "", ""],
                        ["", "", "", "", "", ""],
                      ],
                    },
                  ],
                  data: [
                    ["", "", "", "", "", ""],
                    ["", "", "", "", "", ""],
                    ["", "", "", "", "", ""],
                    ["", "", "", "", "", ""],
                    ["", "", "", "", "", ""],
                  ],
                });
                updateContent(page.id, defaultSpreadsheetContent);
              }
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "sheet"
                ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 font-semibold"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            📊 Spreadsheet
          </button>
          <button
            onClick={() => {
              setActiveTabOverride({ pageId: page?.id ?? "", tab: "board" });
              if (page && !isBoardPage) {
                const defaultBoardContent = JSON.stringify({
                  type: "board",
                  elements: [],
                });
                updateContent(page.id, defaultBoardContent);
              }
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "board"
                ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 font-semibold"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            🎨 Whiteboard
          </button>
        </div>

        {activeTab === "doc" ? (
          <CollaborativeEditor key={page.id} pageId={page.id} />
        ) : activeTab === "sheet" ? (
          <CollaborativeSpreadsheetEditor key={page.id} pageId={page.id} />
        ) : (
          <BoardEditor key={page.id} pageId={page.id} />
        )}
      </div>
    </div>
  );
}

export default Editor;
