import { useEffect, useRef } from "react";
import jspreadsheet from "jspreadsheet-ce";
import "jspreadsheet-ce/dist/jspreadsheet.css";
import "jsuites/dist/jsuites.css";
import { usePageStore } from "../../store/usePageStore";
import { useBroadcastEvent, useEventListener } from "../../lib/liveblocks";
import PresenceAvatars from "./PresenceAvatars";

type Props = {
  pageId: string;
};

const DEFAULT_SHEET_DATA = [
  ["Item", "Quantity", "Price", "=B1*C1"],
  ["Notebook", "5", "12", "=B2*C2"],
  ["Pen", "10", "2", "=B3*C3"],
  ["Desk Mat", "1", "25", "=B4*C4"],
];

export default function SpreadsheetEditor({ pageId }: Props) {
  const sheetContainerRef = useRef<HTMLDivElement>(null);
  const sheetInstanceRef = useRef<any>(null);
  const isRemoteChangeRef = useRef(false);

  const { pages, updateContent, flushContent } = usePageStore();
  const page = pages.find((p) => p.id === pageId);

  // Liveblocks hooks for multi-account communication
  const broadcast = useBroadcastEvent();

  // Listen for changes sent by other users
  useEventListener(({ event }) => {
    if (event.type === "SHEET_CELL_CHANGE") {
      const worksheet = sheetInstanceRef.current?.[0];
      if (!worksheet) return;

      // Set flag so we don't re-broadcast what we just received
      isRemoteChangeRef.current = true;
      try {
        worksheet.setValueFromCoords(event.x, event.y, event.value, true);
      } finally {
        isRemoteChangeRef.current = false;
      }
    }
  });

  const saveSheet = () => {
    const worksheet = sheetInstanceRef.current?.[0];
    if (!worksheet) return;

    try {
      const data = worksheet.getData();
      const payload = JSON.stringify({
        type: "spreadsheet",
        data,
      });
      updateContent(pageId, payload);
    } catch (err) {
      console.error("Failed to get sheet data:", err);
    }
  };

  useEffect(() => {
    if (!sheetContainerRef.current) return;

    sheetContainerRef.current.innerHTML = "";

    let initialData = DEFAULT_SHEET_DATA;
    if (page?.content) {
      try {
        const parsed = JSON.parse(page.content);
        if (parsed.type === "spreadsheet" && Array.isArray(parsed.data)) {
          initialData = parsed.data;
        }
      } catch {
        // Fallback to default
      }
    }

    const sheets = jspreadsheet(sheetContainerRef.current, {
      worksheets: [
        {
          data: initialData,
          minDimensions: [10, 15],
          tableOverflow: true,
          tableWidth: "100%",
          tableHeight: "450px",
          columns: [
            { type: "text", title: "A", width: 140 },
            { type: "numeric", title: "B", width: 100 },
            { type: "numeric", title: "C", width: 100 },
            { type: "numeric", title: "D", width: 120 },
          ],
        },
      ],
      // When a user makes changes in their sheet:
      onafterchanges: (_instance: any, changes: any[]) => {
        saveSheet();

        // If this change came from another user, do not echo it back
        if (isRemoteChangeRef.current) return;

        // Broadcast every updated cell to all other connected accounts
        if (Array.isArray(changes)) {
          for (const change of changes) {
            broadcast({
              type: "SHEET_CELL_CHANGE",
              x: Number(change.x),
              y: Number(change.y),
              value: change.value,
            });
          }
        }
      },
      ondeleterow: () => saveSheet(),
      oninsertrow: () => saveSheet(),
    });

    sheetInstanceRef.current = sheets;

    return () => {
      flushContent(pageId);
      if (sheetContainerRef.current) {
        sheetContainerRef.current.innerHTML = "";
      }
      sheetInstanceRef.current = null;
    };
  }, [pageId, broadcast]);

  return (
    <div className="w-full my-4">
      {/* Real-time collaborator avatars at the top right of the spreadsheet */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-500 font-medium">Collaborative Spreadsheet</span>
        <PresenceAvatars />
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white p-2 text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
        <div ref={sheetContainerRef} />
      </div>
    </div>
  );
}
