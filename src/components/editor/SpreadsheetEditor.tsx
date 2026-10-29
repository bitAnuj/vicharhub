import { useEffect, useRef, useState, useCallback } from "react";
import jspreadsheet, { WorksheetInstance } from "jspreadsheet-ce";
import "jspreadsheet-ce/dist/jspreadsheet.css";
import "jsuites/dist/jsuites.css";
import "../../styles/spreadsheet-theme.css";
import { usePageStore } from "../../store/usePageStore";
import { useBroadcastEvent, useEventListener } from "../../lib/liveblocks";
import PresenceAvatars from "./PresenceAvatars";
import SpreadsheetToolbar from "./spreadsheet/SpreadsheetToolbar";
import SpreadsheetSheet from "./spreadsheet/SpreadsheetSheet";
import { HelpCircle, FileSpreadsheet, X } from "lucide-react";

interface SheetTab {
  id: string;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[][];
}

interface SpreadsheetEditorProps {
  pageId: string;
  isEmbedded?: boolean;
  embeddedHeight?: number;
}

const DEFAULT_SHEETS: SheetTab[] = [
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
];

function parseSpreadsheetContent(content?: string): SheetTab[] | null {
  if (!content) return null;
  let raw = content.trim();

  // If content was wrapped in HTML like <p>{"type":"spreadsheet"...}</p> or escaped HTML entities
  if (raw.includes('"type":"spreadsheet"') || raw.includes('"type": "spreadsheet"')) {
    const firstBrace = raw.indexOf('{"type"');
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      raw = raw.slice(firstBrace, lastBrace + 1);
      raw = raw
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
    }
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed.type === "spreadsheet" && Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
      return parsed.sheets;
    }
    if (parsed.type === "spreadsheet" && Array.isArray(parsed.data) && parsed.data.length > 0) {
      return [{ id: "sheet-1", title: "Sheet1", data: parsed.data }];
    }
  } catch (err) {
    console.error("Failed to parse spreadsheet content:", err);
  }
  return null;
}

export default function SpreadsheetEditor({
  pageId,
  isEmbedded,
  embeddedHeight,
}: SpreadsheetEditorProps) {
  // Use granular selectors to avoid re-rendering SpreadsheetEditor on unrelated page store changes
  const currentPageContent = usePageStore((s) => s.pages.find((p) => p.id === pageId)?.content);
  const currentPageTitle = usePageStore((s) => s.pages.find((p) => p.id === pageId)?.title);
  const updateContent = usePageStore((s) => s.updateContent);
  const flushContent = usePageStore((s) => s.flushContent);

  // Initialize sheets from page content JSON if exists
  const initialParsed = parseSpreadsheetContent(currentPageContent);
  const [sheetsList, setSheetsList] = useState<SheetTab[]>(() => initialParsed || DEFAULT_SHEETS);
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);

  const sheetContainerRef = useRef<HTMLDivElement>(null);
  const sheetInstanceRef = useRef<WorksheetInstance[] | null>(null);

  // Ref to prevent echo loops when remote events update the sheet
  const isRemoteChangeRef = useRef<boolean>(false);
  const lastSavedPayloadRef = useRef<string | null>(currentPageContent ?? null);

  // Keep stable refs to avoid recreating useEffect listeners & causing re-renders
  const activeSheetIndexRef = useRef(activeSheetIndex);
  activeSheetIndexRef.current = activeSheetIndex;

  const sheetsListRef = useRef(sheetsList);
  sheetsListRef.current = sheetsList;

  const pageIdRef = useRef(pageId);
  pageIdRef.current = pageId;

  // Google Sheets formula bar state
  const [selectedCellName, setSelectedCellName] = useState<string>("A1");
  const [formulaValue, setFormulaValue] = useState<string>("");
  const [activeCoords, setActiveCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  useEffect(() => {
    activeCoordsRef.current = activeCoords;
  }, [activeCoords]);
  const [rowsToAdd, setRowsToAdd] = useState<number>(10);
  const [showFormulasHelp, setShowFormulasHelp] = useState<boolean>(false);

  // Liveblocks hooks
  const broadcast = useBroadcastEvent();
  const broadcastRef = useRef(broadcast);
  useEffect(() => {
    broadcastRef.current = broadcast;
  }, [broadcast]);

  // Reliable helper to retrieve the active jspreadsheet worksheet instance
  const getActiveWorksheet = useCallback((): any => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (sheetInstanceRef.current && sheetInstanceRef.current.length > 0 && sheetInstanceRef.current[0]) {
      return sheetInstanceRef.current[0];
    }
    const container = sheetContainerRef.current;
    if (!container) return null;
    const parentSpreadsheet = (container as any).spreadsheet; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (parentSpreadsheet && parentSpreadsheet.worksheets && parentSpreadsheet.worksheets.length > 0) {
      return parentSpreadsheet.worksheets[0];
    }
    const jssEl = container.querySelector(".jss") as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (jssEl && jssEl.jspreadsheet) {
      return jssEl.jspreadsheet;
    }
    return null;
  }, []);

  const saveCurrentSheetData = useCallback(() => {
    const worksheet = getActiveWorksheet();
    if (!worksheet) return;

    try {
      // 1. Force blur on active input inside grid container
      const container = sheetContainerRef.current;
      if (container) {
        const activeInput = container.querySelector(
          ".editor input, .editor textarea, td.editor input"
        ) as HTMLInputElement | null;
        if (activeInput) {
          activeInput.blur();
        }
      }

      // 2. Properly close active editor in jspreadsheet-ce v5
      if (worksheet.edition && worksheet.edition[0]) {
        try {
          worksheet.closeEditor(worksheet.edition[0], true);
        } catch {
          // ignore
        }
      }

      const currentData = worksheet.getData();
      if (!Array.isArray(currentData)) return;

      sheetsListRef.current = sheetsListRef.current.map((sheet, idx) => {
        if (idx === activeSheetIndexRef.current) {
          return { ...sheet, data: currentData };
        }
        return sheet;
      });

      const payload = JSON.stringify({
        type: "spreadsheet",
        sheets: sheetsListRef.current,
        data: sheetsListRef.current[0]?.data ?? [],
      });
      lastSavedPayloadRef.current = payload;
      updateContent(pageIdRef.current, payload);
    } catch (err) {
      console.error("Failed to get sheet data:", err);
    }
  }, [getActiveWorksheet, updateContent]);

  const saveCurrentSheetDataRef = useRef(saveCurrentSheetData);
  saveCurrentSheetDataRef.current = saveCurrentSheetData;

  // Liveblocks real-time cell change listener
  useEventListener(({ event }) => {
    if (event.type === "SHEET_CELL_CHANGE") {
      const targetSheetIndex = typeof event.sheetIndex === "number" ? event.sheetIndex : 0;
      const targetX = Number(event.x);
      const targetY = Number(event.y);
      const targetVal = event.value;

      // 1. Update in-memory sheetsList data regardless of active tab
      const updatedSheets = sheetsListRef.current.map((sheet, idx) => {
        if (idx === targetSheetIndex) {
          const newData = (sheet.data || []).map((row) => [...row]);
          while (newData.length <= targetY) {
            newData.push([]);
          }
          while (newData[targetY].length <= targetX) {
            newData[targetY].push("");
          }
          newData[targetY][targetX] = targetVal;
          return { ...sheet, data: newData };
        }
        return sheet;
      });
      sheetsListRef.current = updatedSheets;

      // Persist to page store
      const payload = JSON.stringify({
        type: "spreadsheet",
        sheets: updatedSheets,
        data: updatedSheets[0]?.data ?? [],
      });
      lastSavedPayloadRef.current = payload;
      updateContent(pageIdRef.current, payload);

      // 2. If the active tab matches, update the active jspreadsheet instance
      if (targetSheetIndex === activeSheetIndexRef.current) {
        const worksheet = getActiveWorksheet();
        if (worksheet && typeof worksheet.setValueFromCoords === "function") {
          isRemoteChangeRef.current = true;
          try {
            worksheet.setValueFromCoords(targetX, targetY, targetVal, true);
          } catch (e) {
            console.error("Failed to apply remote sheet change to grid:", e);
          } finally {
            isRemoteChangeRef.current = false;
          }
        }

        // Direct DOM fallback to guarantee immediate visual reflection
        const container = sheetContainerRef.current;
        if (container) {
          const cellEl = container.querySelector(
            `td[data-x="${targetX}"][data-y="${targetY}"]`
          ) as HTMLElement | null;
          if (cellEl) {
            cellEl.innerText = targetVal !== null && targetVal !== undefined ? String(targetVal) : "";
          }
        }

        // If currently focused on this cell, refresh formula bar
        if (activeCoordsRef.current.x === targetX && activeCoordsRef.current.y === targetY) {
          setFormulaValue(targetVal !== null && targetVal !== undefined ? String(targetVal) : "");
        }
      }
    }
  });

  const updateFormulaBar = useCallback((x: number, y: number) => {
    const worksheet = getActiveWorksheet();
    if (!worksheet) return;

    const colLetter = String.fromCharCode(65 + x);
    const rowNumber = y + 1;
    setSelectedCellName(`${colLetter}${rowNumber}`);
    setActiveCoords({ x, y });

    const rawValue = worksheet.getValueFromCoords(x, y) ?? "";
    setFormulaValue(String(rawValue));
  }, [getActiveWorksheet]);

  const updateFormulaBarRef = useRef(updateFormulaBar);
  updateFormulaBarRef.current = updateFormulaBar;

  // Initialize or reload current active worksheet ONLY when activeSheetIndex, pageId, or embeddedHeight changes
  useEffect(() => {
    const containerEl = sheetContainerRef.current;
    if (!containerEl) return;

    if (sheetInstanceRef.current) {
      saveCurrentSheetDataRef.current();
    }

    containerEl.innerHTML = "";

    const activeSheet = sheetsListRef.current[activeSheetIndex] || DEFAULT_SHEETS[0];
    const initialData = activeSheet.data && activeSheet.data.length > 0
      ? activeSheet.data
      : [["", "", "", "", "", ""]];

    const computedTableHeight = embeddedHeight
      ? `${Math.max(180, embeddedHeight - 80)}px`
      : "500px";

    const worksheetConfig: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
      data: initialData,
      minDimensions: [8, 25],
      tableOverflow: true,
      tableWidth: "100%",
      tableHeight: computedTableHeight,
      parseFormulas: true,
      columns: [
        { type: "text", title: "A", width: 130 },
        { type: "text", title: "B", width: 120 },
        { type: "text", title: "C", width: 120 },
        { type: "text", title: "D", width: 120 },
        { type: "text", title: "E", width: 120 },
        { type: "text", title: "F", width: 120 },
        { type: "text", title: "G", width: 120 },
        { type: "text", title: "H", width: 120 },
      ],
      onafterchanges: (_instance: any, changes: any[]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (isRemoteChangeRef.current) return;
        saveCurrentSheetDataRef.current();
        if (Array.isArray(changes)) {
          for (const change of changes) {
            broadcastRef.current({
              type: "SHEET_CELL_CHANGE",
              sheetIndex: activeSheetIndexRef.current,
              x: Number(change.x),
              y: Number(change.y),
              value: change.value,
            });
          }
        }
      },
      onchange: (_instance: any, _cell: any, x: any, y: any, value: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (isRemoteChangeRef.current) return;
        saveCurrentSheetDataRef.current();
        broadcastRef.current({
          type: "SHEET_CELL_CHANGE",
          sheetIndex: activeSheetIndexRef.current,
          x: Number(x),
          y: Number(y),
          value,
        });
      },
      onselection: (_instance: any, x1: number, y1: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        updateFormulaBarRef.current(x1, y1);
      },
      ondeleterow: () => saveCurrentSheetDataRef.current(),
      oninsertrow: () => saveCurrentSheetDataRef.current(),
      ondeletecolumn: () => saveCurrentSheetDataRef.current(),
      oninsertcolumn: () => saveCurrentSheetDataRef.current(),
    };

    const sheets = jspreadsheet(containerEl, {
      worksheets: [worksheetConfig],
      onload: (instance: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (instance && instance.worksheets) {
          sheetInstanceRef.current = instance.worksheets;
        }
      },
      onafterchanges: (_instance: any, changes: any[]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (isRemoteChangeRef.current) return;
        saveCurrentSheetDataRef.current();
        if (Array.isArray(changes)) {
          for (const change of changes) {
            broadcastRef.current({
              type: "SHEET_CELL_CHANGE",
              sheetIndex: activeSheetIndexRef.current,
              x: Number(change.x),
              y: Number(change.y),
              value: change.value,
            });
          }
        }
      },
      onchange: (_instance: any, _cell: any, x: any, y: any, value: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (isRemoteChangeRef.current) return;
        saveCurrentSheetDataRef.current();
        broadcastRef.current({
          type: "SHEET_CELL_CHANGE",
          sheetIndex: activeSheetIndexRef.current,
          x: Number(x),
          y: Number(y),
          value,
        });
      },
      onselection: (_instance: any, x1: number, y1: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        updateFormulaBarRef.current(x1, y1);
      },
      ondeleterow: () => saveCurrentSheetDataRef.current(),
      oninsertrow: () => saveCurrentSheetDataRef.current(),
      ondeletecolumn: () => saveCurrentSheetDataRef.current(),
      oninsertcolumn: () => saveCurrentSheetDataRef.current(),
    });

    if (sheets && Array.isArray(sheets) && sheets.length > 0) {
      sheetInstanceRef.current = sheets;
    }

    return () => {
      saveCurrentSheetDataRef.current();
      flushContent(pageIdRef.current);
      if (containerEl) {
        containerEl.innerHTML = "";
      }
      sheetInstanceRef.current = null;
    };
  }, [activeSheetIndex, pageId, flushContent, embeddedHeight]);

  // Synchronize when page content updates from server or external source
  useEffect(() => {
    if (!currentPageContent) return;
    if (currentPageContent === lastSavedPayloadRef.current) return;

    const parsed = parseSpreadsheetContent(currentPageContent);
    if (parsed && parsed.length > 0) {
      lastSavedPayloadRef.current = currentPageContent;
      sheetsListRef.current = parsed;
      setSheetsList(parsed);

      const targetSheet = parsed[activeSheetIndexRef.current] || parsed[0];
      const worksheet = getActiveWorksheet();
      if (worksheet && typeof worksheet.setData === "function" && targetSheet?.data) {
        isRemoteChangeRef.current = true;
        try {
          worksheet.setData(targetSheet.data);
        } catch (err) {
          console.error("Failed to setData on worksheet:", err);
        } finally {
          isRemoteChangeRef.current = false;
        }
      }
    }
  }, [currentPageContent, getActiveWorksheet]);

  // Commit and flush on page refresh / unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const container = sheetContainerRef.current;
      if (container) {
        const activeInput = container.querySelector(
          ".editor input, .editor textarea, td.editor input"
        ) as HTMLInputElement | null;
        if (activeInput) {
          activeInput.blur();
        }
      }

      const worksheet = getActiveWorksheet();
      if (worksheet && worksheet.edition && worksheet.edition[0]) {
        try {
          worksheet.closeEditor(worksheet.edition[0], true);
        } catch {
          // ignore
        }
      }
      saveCurrentSheetDataRef.current();
      flushContent(pageIdRef.current);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [getActiveWorksheet, flushContent]);

  // Tab operations
  const handleSwitchTab = (newIndex: number) => {
    if (newIndex === activeSheetIndex) return;
    saveCurrentSheetData();
    setActiveSheetIndex(newIndex);
  };

  const handleAddTab = () => {
    saveCurrentSheetData();
    const newNumber = sheetsListRef.current.length + 1;
    const newSheet: SheetTab = {
      id: `sheet-${Date.now()}`,
      title: `Sheet${newNumber}`,
      data: [
        ["", "", "", "", "", ""],
        ["", "", "", "", "", ""],
        ["", "", "", "", "", ""],
        ["", "", "", "", "", ""],
        ["", "", "", "", "", ""],
      ],
    };
    const updated = [...sheetsListRef.current, newSheet];
    sheetsListRef.current = updated;
    setSheetsList(updated);
    setActiveSheetIndex(updated.length - 1);

    const payload = JSON.stringify({
      type: "spreadsheet",
      sheets: updated,
      data: updated[0]?.data ?? [],
    });
    lastSavedPayloadRef.current = payload;
    updateContent(pageId, payload);
  };

  const handleRenameTab = (index: number) => {
    const currentTitle = sheetsListRef.current[index]?.title || "Sheet";
    const nextTitle = prompt("Enter sheet name:", currentTitle);
    if (!nextTitle || !nextTitle.trim() || nextTitle.trim() === currentTitle) return;

    const updated = sheetsListRef.current.map((s, idx) =>
      idx === index ? { ...s, title: nextTitle.trim() } : s
    );
    sheetsListRef.current = updated;
    setSheetsList(updated);

    const payload = JSON.stringify({
      type: "spreadsheet",
      sheets: updated,
      data: updated[0]?.data ?? [],
    });
    lastSavedPayloadRef.current = payload;
    updateContent(pageId, payload);
  };

  const handleDeleteTab = (index: number) => {
    if (sheetsListRef.current.length <= 1) {
      alert("Cannot delete the only sheet.");
      return;
    }
    if (!confirm(`Delete "${sheetsListRef.current[index]?.title}"?`)) return;

    const updated = sheetsListRef.current.filter((_, idx) => idx !== index);
    sheetsListRef.current = updated;
    setSheetsList(updated);

    let nextActive = activeSheetIndex;
    if (nextActive >= updated.length) {
      nextActive = updated.length - 1;
    }
    setActiveSheetIndex(nextActive);

    const payload = JSON.stringify({
      type: "spreadsheet",
      sheets: updated,
      data: updated[0]?.data ?? [],
    });
    lastSavedPayloadRef.current = payload;
    updateContent(pageId, payload);
  };

  // Formula bar commit
  const handleFormulaCommit = () => {
    const worksheet = getActiveWorksheet();
    if (!worksheet) return;
    worksheet.setValueFromCoords(activeCoords.x, activeCoords.y, formulaValue, true);
    saveCurrentSheetData();
  };

  // Add extra rows
  const handleAddRows = () => {
    const worksheet = getActiveWorksheet();
    if (!worksheet) return;
    const count = Number(rowsToAdd) || 10;
    worksheet.insertRow(count);
    saveCurrentSheetData();
  };

  // CSV Export
  const handleExportCSV = () => {
    const worksheet = getActiveWorksheet();
    if (!worksheet) return;

    try {
      const data = worksheet.getData();
      const csvContent =
        "data:text/csv;charset=utf-8," +
        data.map((row: any[]) => row.map((val) => `"${val ?? ""}"`).join(",")).join("\n"); // eslint-disable-line @typescript-eslint/no-explicit-any
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `${currentPageTitle || "Spreadsheet"}-${sheetsListRef.current[activeSheetIndex]?.title || "Sheet"}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Export CSV failed", e);
    }
  };

  // Undo / Redo
  const handleUndo = () => {
    const worksheet = getActiveWorksheet();
    if (worksheet && typeof worksheet.undo === "function") {
      worksheet.undo();
      saveCurrentSheetData();
    }
  };

  const handleRedo = () => {
    const worksheet = getActiveWorksheet();
    if (worksheet && typeof worksheet.redo === "function") {
      worksheet.redo();
      saveCurrentSheetData();
    }
  };

  // Formatting actions
  const applyStyle = (property: string, value: string) => {
    const worksheet = getActiveWorksheet();
    if (!worksheet) return;

    const selected = worksheet.getSelected?.();
    if (!selected || selected.length < 4) return;

    const [x1, y1, x2, y2] = selected;
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const colLetter = String.fromCharCode(65 + x);
        const cellName = `${colLetter}${y + 1}`;
        worksheet.setStyle?.(cellName, property, value);
      }
    }
    saveCurrentSheetData();
  };

  return (
    <div
      className={`flex flex-col w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 ${
        isEmbedded ? "rounded-b-xl" : "h-full"
      }`}
      style={isEmbedded && embeddedHeight ? { height: `${embeddedHeight}px` } : undefined}
    >
      {/* Collaboration presence banner & title (only in full-page mode) */}
      {!isEmbedded && (
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 bg-zinc-50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-500" size={18} />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Collaborative Spreadsheet
            </span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              Live
            </span>
          </div>
          <div className="flex items-center gap-3">
            <PresenceAvatars />
          </div>
        </div>
      )}

      {/* Main Google Sheets Toolbar (Separated Component - only in full-page mode) */}
      {!isEmbedded && (
        <SpreadsheetToolbar
          onUndo={handleUndo}
          onRedo={handleRedo}
          onApplyStyle={applyStyle}
          onExportCSV={handleExportCSV}
          onToggleFormulasHelp={() => setShowFormulasHelp(!showFormulasHelp)}
          showFormulasHelp={showFormulasHelp}
        />
      )}

      {/* Formulas Help Panel (full-page mode only) */}
      {!isEmbedded && showFormulasHelp && (
        <div className="relative border-b border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 text-xs">
          <button
            onClick={() => setShowFormulasHelp(false)}
            className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X size={14} />
          </button>
          <div className="font-semibold text-indigo-900 dark:text-indigo-300 mb-1 flex items-center gap-1.5">
            <HelpCircle size={14} /> Supported Formulas & Syntax
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-zinc-600 dark:text-zinc-400">
            <div><span className="font-mono text-zinc-900 dark:text-zinc-200 font-semibold">=SUM(A1:A5)</span> - Total sum</div>
            <div><span className="font-mono text-zinc-900 dark:text-zinc-200 font-semibold">=AVERAGE(B1:B10)</span> - Mean</div>
            <div><span className="font-mono text-zinc-900 dark:text-zinc-200 font-semibold">=COUNT(C1:C10)</span> - Count items</div>
            <div><span className="font-mono text-zinc-900 dark:text-zinc-200 font-semibold">=MAX(A1:A10)</span> - Highest value</div>
            <div><span className="font-mono text-zinc-900 dark:text-zinc-200 font-semibold">=MIN(A1:A10)</span> - Lowest value</div>
            <div><span className="font-mono text-zinc-900 dark:text-zinc-200 font-semibold">=B1*C1</span> - Math operators (*, /, +, -)</div>
            <div><span className="font-mono text-zinc-900 dark:text-zinc-200 font-semibold">=IF(A1&gt;10, &quot;Yes&quot;, &quot;No&quot;)</span> - Conditional</div>
            <div><span className="font-mono text-zinc-900 dark:text-zinc-200 font-semibold">=ROUND(A1, 2)</span> - Round to decimals</div>
          </div>
        </div>
      )}

      {/* Reusable Spreadsheet Sheet (Grid canvas, formula bar & tabs) */}
      <SpreadsheetSheet
        containerRef={sheetContainerRef}
        selectedCellName={selectedCellName}
        formulaValue={formulaValue}
        onChangeFormula={setFormulaValue}
        onCommitFormula={handleFormulaCommit}
        sheetsList={sheetsList}
        activeSheetIndex={activeSheetIndex}
        onSwitchTab={handleSwitchTab}
        onAddTab={handleAddTab}
        onRenameTab={handleRenameTab}
        onDeleteTab={handleDeleteTab}
        rowsToAdd={rowsToAdd}
        onChangeRowsToAdd={setRowsToAdd}
        onAddRows={handleAddRows}
        isEmbedded={isEmbedded}
      />
    </div>
  );
}
