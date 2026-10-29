import React from "react";
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Download,
  Sigma,
} from "lucide-react";

export interface SpreadsheetToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onApplyStyle: (property: string, value: string) => void;
  onExportCSV?: () => void;
  onToggleFormulasHelp?: () => void;
  showFormulasHelp?: boolean;
}

/**
 * Reusable Spreadsheet Toolbar
 * Provides formatting (Bold, Italic, Alignments), history (Undo/Redo),
 * CSV export, and supported formula guides.
 */
export const SpreadsheetToolbar: React.FC<SpreadsheetToolbarProps> = ({
  onUndo,
  onRedo,
  onApplyStyle,
  onExportCSV,
  onToggleFormulasHelp,
  showFormulasHelp,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-sm select-none">
      {/* History (Undo / Redo) */}
      <button
        onClick={onUndo}
        className="rounded p-1 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
        title="Undo"
      >
        <Undo2 size={16} />
      </button>
      <button
        onClick={onRedo}
        className="rounded p-1 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
        title="Redo"
      >
        <Redo2 size={16} />
      </button>

      <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

      {/* Font Styling (Bold, Italic) */}
      <button
        onClick={() => onApplyStyle("font-weight", "bold")}
        className="rounded p-1 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 font-bold transition-colors"
        title="Bold"
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => onApplyStyle("font-style", "italic")}
        className="rounded p-1 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 italic transition-colors"
        title="Italic"
      >
        <Italic size={16} />
      </button>

      <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

      {/* Cell Text Alignments */}
      <button
        onClick={() => onApplyStyle("text-align", "left")}
        className="rounded p-1 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
        title="Align Left"
      >
        <AlignLeft size={16} />
      </button>
      <button
        onClick={() => onApplyStyle("text-align", "center")}
        className="rounded p-1 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
        title="Align Center"
      >
        <AlignCenter size={16} />
      </button>
      <button
        onClick={() => onApplyStyle("text-align", "right")}
        className="rounded p-1 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
        title="Align Right"
      >
        <AlignRight size={16} />
      </button>

      {/* CSV Export (if provided) */}
      {onExportCSV && (
        <>
          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />
          <button
            onClick={onExportCSV}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
            title="Download active sheet as CSV"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </>
      )}

      {/* Formulas Guide Toggle (if provided) */}
      {onToggleFormulasHelp && (
        <>
          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />
          <button
            onClick={onToggleFormulasHelp}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
              showFormulasHelp
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold"
                : "text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
            }`}
            title="View Supported Formulas"
          >
            <Sigma size={14} />
            <span>Formulas</span>
          </button>
        </>
      )}
    </div>
  );
};

export default SpreadsheetToolbar;
