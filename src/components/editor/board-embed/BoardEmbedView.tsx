import { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import {
  PenTool,
  Plus,
  Search,
  ExternalLink,
  Layers,
  Trash2,
  X,
} from "lucide-react";
import { usePageStore, type Page } from "../../../store/usePageStore";
import BoardEditor from "../../board/BoardEditor";

function isBoardPage(page?: Page): boolean {
  if (!page || !page.content) return false;
  return (
    page.content.startsWith('{"type":"board"') ||
    page.content.includes('"type":"board"') ||
    page.content.includes('"type": "board"')
  );
}

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

export default function BoardEmbedView({
  node,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const pageId = (node.attrs.pageId as string) || "";
  const height = (node.attrs.height as number) || 520;

  const { pages, selectedPageId, addPage, selectPage, updateContent } = usePageStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  const linkedPage = pages.find((p) => p.id === pageId);

  // Filter available pages (exclude current active document to prevent recursive embedding)
  const availablePages = pages.filter(
    (p) => !p.trashed && p.id !== selectedPageId
  );

  const boardPages = availablePages.filter(isBoardPage);
  const otherPages = availablePages.filter((p) => !isBoardPage(p));

  const filteredBoards = boardPages.filter((p) =>
    (p.title || "Untitled").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredOther = otherPages.filter((p) =>
    (p.title || "Untitled").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNewBoard = () => {
    const cleanContent = JSON.stringify({
      type: "board",
      elements: [],
    });

    const newId = addPage({
      title: "Whiteboard",
      icon: "🎨",
      content: cleanContent,
    });

    updateAttributes({ pageId: newId });
    setIsChanging(false);
  };

  const handleSelectPage = (id: string) => {
    const target = pages.find((p) => p.id === id);
    if (target && !isBoardPage(target)) {
      const cleanContent = JSON.stringify({
        type: "board",
        elements: [],
      });
      updateContent(id, cleanContent);
    }
    updateAttributes({ pageId: id });
    setIsChanging(false);
  };

  const cycleHeight = () => {
    const heights = [400, 520, 680];
    const currentIndex = heights.indexOf(height);
    const nextHeight = heights[(currentIndex + 1) % heights.length];
    updateAttributes({ height: nextHeight });
  };

  // If no page is linked or user clicked "Switch", show selector card
  if (!pageId || isChanging || !linkedPage || linkedPage.trashed) {
    return (
      <NodeViewWrapper className="my-4 block not-prose">
        <div className="rounded-xl border border-purple-200 bg-white p-4 shadow-sm dark:border-purple-900/50 dark:bg-zinc-900/90">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                <PenTool size={18} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Embed Whiteboard (Excalidraw)
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Select an existing whiteboard or create a new drawing canvas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {pageId && (
                <button
                  onClick={() => setIsChanging(false)}
                  className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              )}
              <button
                onClick={deleteNode}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                title="Remove embed block"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search whiteboards..."
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-9 pr-3 text-xs text-zinc-800 outline-none focus:border-purple-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:focus:border-purple-500"
              />
            </div>
            <button
              onClick={handleCreateNewBoard}
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-purple-700 transition"
            >
              <Plus size={14} />
              New Whiteboard
            </button>
          </div>

          <div className="mt-3 max-h-52 overflow-y-auto space-y-1 pr-1">
            {filteredBoards.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1">
                  Existing Whiteboards
                </span>
                {filteredBoards.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPage(p.id)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-zinc-700 hover:bg-purple-50 hover:text-purple-700 dark:text-zinc-300 dark:hover:bg-purple-950/40 dark:hover:text-purple-300 transition"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{p.icon || "🎨"}</span>
                      <span className="font-medium truncate">{p.title || "Untitled Whiteboard"}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {timeAgo(p.updatedAt)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {filteredBoards.length === 0 && (
              <div className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
                No whiteboards found. Click &ldquo;New Whiteboard&rdquo; to start sketching!
              </div>
            )}

            {filteredOther.length > 0 && (
              <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1">
                  Attach to Another Page
                </span>
                {filteredOther.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPage(p.id)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{p.icon || "📄"}</span>
                      <span className="truncate">{p.title || "Untitled"}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      Convert to board
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="my-5 block not-prose">
      <div className="rounded-xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-zinc-200/80 bg-zinc-50/80 px-3 py-2 dark:border-zinc-800/80 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2 truncate">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
              <PenTool size={13} />
            </div>
            <span className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {linkedPage.title || "Untitled Whiteboard"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => selectPage(linkedPage.id)}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition"
              title="Open full page whiteboard"
            >
              <ExternalLink size={12} />
              Open ↗
            </button>

            <button
              onClick={cycleHeight}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition"
              title={`Cycle height: current is ${height}px`}
            >
              <Layers size={12} />
              {height}px
            </button>

            <button
              onClick={() => setIsChanging(true)}
              className="rounded px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition"
              title="Switch to another board"
            >
              Switch
            </button>

            <button
              onClick={deleteNode}
              className="rounded p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition"
              title="Remove embed block"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Embedded Excalidraw Canvas */}
        <div className="p-1 bg-white dark:bg-zinc-950">
          <BoardEditor
            pageId={pageId}
            isEmbedded={true}
            height={height}
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
