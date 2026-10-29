import React from "react";

export interface SpreadsheetFormulaBarProps {
  selectedCellName: string;
  formulaValue: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  placeholder?: string;
  isEmbedded?: boolean;
}

/**
 * Reusable Spreadsheet Formula Bar (Google Sheets style fx input)
 */
export const SpreadsheetFormulaBar: React.FC<SpreadsheetFormulaBarProps> = ({
  selectedCellName,
  formulaValue,
  onChange,
  onCommit,
  placeholder = "Enter text, numbers, or formulas (e.g. =SUM(A1:A5))",
  isEmbedded = false,
}) => {
  return (
    <div
      className={`flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1 text-xs ${
        isEmbedded ? "bg-zinc-50/50 dark:bg-zinc-900/30" : ""
      }`}
    >
      {/* Selected cell coordinate */}
      <div className="flex h-6 w-12 items-center justify-center rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 font-mono text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 select-none">
        {selectedCellName || "A1"}
      </div>

      {/* fx symbol */}
      <span className="font-serif italic font-bold text-zinc-400 dark:text-zinc-500 select-none text-xs">
        fx
      </span>

      {/* Input box */}
      <input
        type="text"
        value={formulaValue}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onCommit();
          }
        }}
        onBlur={onCommit}
        placeholder={placeholder}
        className="flex-1 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2 py-0.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:focus:border-emerald-500 dark:focus:bg-zinc-900"
      />
    </div>
  );
};

export default SpreadsheetFormulaBar;
