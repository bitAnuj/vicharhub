import { useRef, useState } from "react";
import { MoreHorizontal, ImagePlus, X } from "lucide-react";
import { usePageStore } from "../../store/usePageStore";
import CollaborativeEditor from "./CollaborativeEditor";
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

  const page = pages.find((p) => p.id === selectedPageId);

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

  const handleCoverUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const { url } = await response.json();
    updateCover(page.id, url);
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
            className="h-56 w-full object-cover"
          />
          <div className="absolute right-4 top-4 flex gap-2 md:hidden md:group-hover:flex">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-md bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur-sm hover:bg-black/80"
            >
              <ImagePlus size={13} />
              Change
            </button>
            <button
              onClick={() => updateCover(page.id, "")}
              className="flex items-center gap-1.5 rounded-md bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur-sm hover:bg-black/80"
            >
              <X size={13} />
              Remove
            </button>
          </div>
        </div>
      ) : null}

      <div className="px-4 sm:px-8 md:px-16">
        <div className="mb-4 flex items-center justify-between">
          <Breadcrumbs page={page} />

          <div className="flex items-center gap-1">
            {!page.cover && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <ImagePlus size={13} />
                Add cover
              </button>
            )}

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <MoreHorizontal size={18} />
              </button>

              {menuOpen && (
                <PageContextMenu
                  onRename={() => setMenuOpen(false)}
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
          value={page.title}
          onChange={(e) => renamePage(page.id, e.target.value)}
          placeholder="Untitled"
          className="mb-1 w-full bg-transparent text-3xl font-bold outline-none placeholder:text-zinc-600 sm:text-4xl"
        />

        <p className="mb-8 text-xs text-zinc-600">
          Last updated {new Date(page.updatedAt).toLocaleString()}
        </p>

        <CollaborativeEditor key={page.id} pageId={page.id} />
      </div>
    </div>
  );
}

export default Editor;
