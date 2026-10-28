import { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import {
  FileSpreadsheet,
  Plus,
  Search,
  ExternalLink,
  Layers,
  Trash2,
  X,
} from "lucide-react";
import { usePageStore, type Page } from "../../../store/usePageStore";
import CollaborativeSpreadsheetEditor from "../CollaborativeSpreadsheetEditor";

function isSheetPage(page?: Page): boolean {
  if (!page || !page.content) return false;
  return (
    page.content.startsWith('{"type":"spreadsheet"') ||
    page.content.includes('"type":"spreadsheet"') ||
    page.content.includes('"type": "spreadsheet"')
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

export default function SpreadsheetEmbedView({
  node,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const pageId = (node.attrs.pageId as string) || "";
  const height = (node.attrs.height as number) || 380;

  const { pages, selectedPageId, addPage, selectPage, updateContent } = usePageStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  const linkedPage = pages.find((p) => p.id === pageId);

  // Filter available pages (exclude current active document to prevent recursive embedding)
  const availablePages = pages.filter(
    (p) => !p.trashed && p.id !== selectedPageId
  );

  const spreadsheetPages = availablePages.filter(isSheetPage);
  const otherPages = availablePages.filter((p) => !isSheetPage(p));

  const filteredSheets = spreadsheetPages.filter((p) =>
    (p.title || "Untitled").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOther = otherPages.filter((p) =>
    (p.title || "Untitled").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handler to create a brand new, completely clean spreadsheet page and link it
  const handleCreateNewSheet = () => {
    const currentDocId = selectedPageId;
    const cleanSpreadsheetContent = JSON.stringify({
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

    const newSheetId = addPage({
      title: "Spreadsheet",
      content: cleanSpreadsheetContent,
      icon: "📊",
    });

    if (currentDocId) {
      selectPage(currentDocId);
    }

    updateAttributes({ pageId: newSheetId, height: 380 });
    setIsChanging(false);
  };

  // Handler when user selects an existing page
  const handleSelectPage = (targetPage: Page) => {
    if (!isSheetPage(targetPage)) {
      const cleanSpreadsheetContent = JSON.stringify({
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
      updateContent(targetPage.id, cleanSpreadsheetContent);
    }
    updateAttributes({ pageId: targetPage.id });
    setIsChanging(false);
  };

  // -------------------------------------------------------------
  // Render: Picker UI when no sheet is linked yet or changing link
  // -------------------------------------------------------------
  if (!pageId || isChanging) {
    return (
      <NodeViewWrapper className="my-3 select-none" contentEditable={false}>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileSpreadsheet size={16} />
              </div>
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {pageId ? "Switch Linked Spreadsheet" : "Embed Spreadsheet"}
              </h3>
            </div>

            <button
              onClick={() => {
                if (pageId) {
                  setIsChanging(false);
                } else {
                  deleteNode();
                }
              }}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              title="Cancel"
            >
              <X size={15} />
            </button>
          </div>

          {/* Action Row: Search & New Sheet Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search spreadsheets..."
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1 pl-8 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:focus:border-emerald-500 dark:focus:bg-zinc-900"
              />
            </div>

            <button
              onClick={handleCreateNewSheet}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white shadow-xs transition hover:bg-emerald-500 active:scale-95"
            >
              <Plus size={13} />
              <span>Create Clean Sheet</span>
            </button>
          </div>

          {/* List of Existing Spreadsheets */}
          <div className="max-h-52 overflow-y-auto space-y-1 rounded-lg border border-zinc-100 bg-zinc-50/50 p-1 dark:border-zinc-800/60 dark:bg-zinc-950/40">
            {filteredSheets.length === 0 && filteredOther.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
                {searchQuery
                  ? "No spreadsheets match your search."
                  : "No spreadsheets found. Click \"Create Clean Sheet\" above."}
              </div>
            ) : (
              <>
                {filteredSheets.length > 0 && (
                  <div>
                    <div className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Spreadsheets ({filteredSheets.length})
                    </div>
                    {filteredSheets.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPage(p)}
                        className="group flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition hover:bg-white hover:shadow-xs dark:hover:bg-zinc-800/80"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-emerald-500 dark:text-emerald-400 text-xs">
                            📊
                          </span>
                          <span className="truncate font-medium text-zinc-800 group-hover:text-emerald-600 dark:text-zinc-200 dark:group-hover:text-emerald-400">
                            {p.title || "Untitled Spreadsheet"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                          <span className="hidden sm:inline">
                            {timeAgo(p.updatedAt)}
                          </span>
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            Link
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {filteredOther.length > 0 && (
                  <div className="pt-1.5">
                    <div className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Other Pages ({filteredOther.length})
                    </div>
                    {filteredOther.slice(0, 4).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPage(p)}
                        className="group flex w-full items-center justify-between rounded-md px-2.5 py-1 text-left text-xs transition hover:bg-white hover:shadow-xs dark:hover:bg-zinc-800/80"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-zinc-400">{p.icon || "📄"}</span>
                          <span className="truncate text-zinc-700 group-hover:text-zinc-950 dark:text-zinc-300 dark:group-hover:text-zinc-100">
                            {p.title || "Untitled Page"}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400">Convert</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  // -------------------------------------------------------------
  // Render: When linked page is deleted or not found
  // -------------------------------------------------------------
  if (!linkedPage || linkedPage.trashed) {
    return (
      <NodeViewWrapper className="my-3" contentEditable={false}>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Linked spreadsheet not found or was deleted.
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              onClick={() => setIsChanging(true)}
              className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Choose another
            </button>
            <button
              onClick={deleteNode}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Remove
            </button>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  // -------------------------------------------------------------
  // Render: Clean, Active Embedded Spreadsheet
  // -------------------------------------------------------------
  return (
    <NodeViewWrapper className="my-4" contentEditable={false}>
      <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        {/* Minimal Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 select-none dark:border-zinc-800 dark:bg-zinc-900/60">
          {/* Left: Title & Open full page */}
          <div className="flex items-center gap-2 min-w-0">
            <FileSpreadsheet size={15} className="text-emerald-500 shrink-0" />
            <span className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {linkedPage.title || "Spreadsheet"}
            </span>
            <button
              onClick={() => selectPage(pageId)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              title="Open full spreadsheet page in sidebar"
            >
              <ExternalLink size={11} />
              <span>Open</span>
            </button>
          </div>

          {/* Right: Switch & Delete */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsChanging(true)}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              title="Switch to another spreadsheet"
            >
              <Layers size={11} />
              <span>Switch</span>
            </button>

            <button
              onClick={deleteNode}
              className="rounded p-1 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
              title="Remove spreadsheet from document"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Embed Body: Pure native browser events (no synthetic stopPropagation) */}
        <div className="relative w-full">
          <CollaborativeSpreadsheetEditor
            pageId={pageId}
            isEmbedded={true}
            embeddedHeight={height}
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
