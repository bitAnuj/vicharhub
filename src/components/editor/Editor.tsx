import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, ImagePlus, X } from "lucide-react";
import { usePageStore } from "../../store/usePageStore";
import CollaborativeEditor from "./CollaborativeEditor";
import CollaborativeSpreadsheetEditor from "./CollaborativeSpreadsheetEditor";
import IconPicker from "./IconPicker";
import Breadcrumbs from "./Breadcrumbs";
import PageContextMenu from "../ui/PageContextMenu";
import { useClickOutside } from "../../lib/useClickOutside";

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
  } = usePageStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setMenuOpen(false));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const page = pages.find((p) => p.id === selectedPageId);

  const isSheetPage = Boolean(
    page?.content && page.content.startsWith('{"type":"spreadsheet"')
  );

  const [activeTab, setActiveTab] = useState<"doc" | "sheet">(
    isSheetPage ? "sheet" : "doc"
  );

  useEffect(() => {
    setActiveTab(isSheetPage ? "sheet" : "doc");
  }, [page?.id, isSheetPage]);

  if (!page) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-2xl">📄</p>
        <p className="text-zinc-400">No page selected</p>
        <button
          onClick={() => addPage()}
          className="rounded-md border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
        >
          Create a new page
        </button>
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
    <div className="mx-auto max-w-4xl">
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

          <div className="flex items-center gap-1">
            {!page.cover && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
              >
                <ImagePlus size={14} />
                <span>Add cover</span>
              </button>
            )}

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                title="Page options"
              >
                <MoreHorizontal size={16} />
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
        </div>

        <IconPicker
          icon={page.icon}
          onSelect={(emoji) => updateIcon(page.id, emoji)}
        />

        <input
          ref={titleInputRef}
          value={page.title}
          onChange={(e) => renamePage(page.id, e.target.value)}
          placeholder="Untitled"
          className="mb-1 w-full bg-transparent text-3xl font-bold outline-none placeholder:text-zinc-600 sm:text-4xl"
        />

        <p className="mb-4 text-xs text-zinc-600">
          Last updated {new Date(page.updatedAt).toLocaleString()}
        </p>

        {/* View Switcher Tabs */}
        <div className="mb-4 flex items-center gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab("doc")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "doc"
                ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            📝 Document
          </button>
          <button
            onClick={() => setActiveTab("sheet")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "sheet"
                ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            📊 Spreadsheet
          </button>
        </div>

        {activeTab === "doc" ? (
          <CollaborativeEditor key={page.id} pageId={page.id} />
        ) : (
          <CollaborativeSpreadsheetEditor key={page.id} pageId={page.id} />
        )}
      </div>
    </div>
  );
}

export default Editor;
