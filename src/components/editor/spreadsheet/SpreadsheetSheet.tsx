import React from "react";
import SpreadsheetFormulaBar from "./SpreadsheetFormulaBar";
import { Table, Plus, Trash2, Edit2 } from "lucide-react";

export interface SheetTab {
  id: string;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[][];
}

export interface SpreadsheetSheetProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  selectedCellName: string;
  formulaValue: string;
  onChangeFormula: (val: string) => void;
  onCommitFormula: () => void;
  sheetsList: SheetTab[];
  activeSheetIndex: number;
  onSwitchTab: (index: number) => void;
  onAddTab: () => void;
  onRenameTab: (index: number) => void;
  onDeleteTab: (index: number) => void;
  rowsToAdd?: number;
  onChangeRowsToAdd?: (count: number) => void;
  onAddRows?: () => void;
  isEmbedded?: boolean;
}

/**
 * Reusable Spreadsheet Sheet Component
 * Comprises the formula bar, the interactive spreadsheet canvas (JSpreadsheet),
 * and the sheet tab navigation bar.
 */
export const SpreadsheetSheet: React.FC<SpreadsheetSheetProps> = ({
  containerRef,
  selectedCellName,
  formulaValue,
  onChangeFormula,
  onCommitFormula,
  sheetsList,
  activeSheetIndex,
  onSwitchTab,
  onAddTab,
  onRenameTab,
  onDeleteTab,
  rowsToAdd = 10,
  onChangeRowsToAdd,
  onAddRows,
  isEmbedded = false,
}) => {
  return (
    <div className="flex flex-col flex-1 w-full overflow-hidden">
      {/* Formula Bar (fx input) */}
      <SpreadsheetFormulaBar
        selectedCellName={selectedCellName}
        formulaValue={formulaValue}
        onChange={onChangeFormula}
        onCommit={onCommitFormula}
        isEmbedded={isEmbedded}
      />

      {/* Spreadsheet Main Grid Canvas */}
      <div className="relative flex-1 overflow-auto bg-zinc-100/50 dark:bg-zinc-950 p-1.5">
        <div ref={containerRef} className="spreadsheet-container w-full" />
      </div>

      {/* Bottom Tab Bar & Controls */}
      <div className="flex flex-wrap items-center justify-between border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-1 text-xs select-none">
        {/* Left: Sheet tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {sheetsList.map((sheet, index) => {
            const isActive = index === activeSheetIndex;
            return (
              <div
                key={sheet.id || index}
                onClick={() => onSwitchTab(index)}
                className={`group flex items-center gap-1.5 rounded-t border px-2.5 py-0.5 cursor-pointer transition-colors ${
                  isActive
                    ? "border-zinc-300 border-b-transparent bg-white text-zinc-900 font-semibold dark:border-zinc-700 dark:border-b-transparent dark:bg-zinc-950 dark:text-zinc-100"
                    : "border-transparent bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <Table
                  size={12}
                  className={
                    isActive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-400"
                  }
                />
                <span>{sheet.title}</span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRenameTab(index);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 ml-0.5"
                  title="Rename sheet"
                >
                  <Edit2 size={11} />
                </button>

                {sheetsList.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTab(index);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-500 ml-0.5"
                    title="Delete sheet"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={onAddTab}
            className="flex items-center justify-center rounded p-0.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 ml-1"
            title="Add sheet"
          >
            <Plus size={15} />
          </button>
        </div>

        {/* Right: Quick row adder (full-page mode only) */}
        {!isEmbedded && onChangeRowsToAdd && onAddRows && (
          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <span>Add</span>
            <input
              type="number"
              min={1}
              max={1000}
              value={rowsToAdd}
              onChange={(e) => onChangeRowsToAdd(Number(e.target.value))}
              className="w-14 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-1.5 py-0.5 text-center text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
            />
            <span>more rows</span>
            <button
              onClick={onAddRows}
              className="rounded bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpreadsheetSheet;
