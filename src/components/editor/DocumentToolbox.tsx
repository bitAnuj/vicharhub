import type { Editor } from "@tiptap/react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Table as TableIcon,
  MessageSquare,
  Minus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  PenTool,
} from "lucide-react";
import { useState } from "react";
import { usePageStore } from "../../store/usePageStore";

type Props = {
  editor: Editor;
};

export default function DocumentToolbox({ editor }: Props) {
  const [expanded, setExpanded] = useState(true);

  if (!editor) return null;

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const insertSpreadsheet = () => {
    const { addPage, selectedPageId, selectPage } = usePageStore.getState();
    const currentDocId = selectedPageId;
    const cleanContent = JSON.stringify({
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
      content: cleanContent,
      icon: "📊",
    });

    if (currentDocId) {
      selectPage(currentDocId);
    }

    editor
      .chain()
      .focus()
      .insertContent({
        type: "spreadsheetEmbed",
        attrs: { pageId: newSheetId, height: 380 },
      })
      .run();
  };

  const insertBoard = () => {
    const { addPage, selectedPageId, selectPage } = usePageStore.getState();
    const currentDocId = selectedPageId;
    const cleanContent = JSON.stringify({
      type: "board",
      elements: [],
    });

    const newBoardId = addPage({
      title: "Whiteboard",
      content: cleanContent,
      icon: "🎨",
    });

    if (currentDocId) {
      selectPage(currentDocId);
    }

    editor
      .chain()
      .focus()
      .insertContent({
        type: "boardEmbed",
        attrs: { pageId: newBoardId, height: 520 },
      })
      .run();
  };

  const tools = [
    {
      label: "H1",
      title: "Big Heading",
      icon: Heading1,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive("heading", { level: 1 }),
    },
    {
      label: "H2",
      title: "Medium Heading",
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive("heading", { level: 2 }),
    },
    {
      label: "H3",
      title: "Small Heading",
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive("heading", { level: 3 }),
    },
    {
      label: "Bullet",
      title: "Bulleted List",
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive("bulletList"),
    },
    {
      label: "Numbered",
      title: "Numbered List",
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive("orderedList"),
    },
    {
      label: "To-do",
      title: "Checklist / Task Item",
      icon: CheckSquare,
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: editor.isActive("taskList"),
    },
    {
      label: "Code",
      title: "Code Block",
      icon: Code,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: editor.isActive("codeBlock"),
    },
    {
      label: "Table",
      title: "Insert 3x3 Table",
      icon: TableIcon,
      action: insertTable,
      isActive: editor.isActive("table"),
    },
    {
      label: "Sheet",
      title: "Embed Clean Spreadsheet",
      icon: FileSpreadsheet,
      action: insertSpreadsheet,
      isActive: editor.isActive("spreadsheetEmbed"),
    },
    {
      label: "Board",
      title: "Embed Excalidraw Whiteboard",
      icon: PenTool,
      action: insertBoard,
      isActive: editor.isActive("boardEmbed"),
    },
    {
      label: "Callout",
      title: "Callout Box",
      icon: MessageSquare,
      action: () => (editor.chain().focus() as unknown as { setCallout: () => { run: () => void } }).setCallout().run(),
      isActive: editor.isActive("callout"),
    },
    {
      label: "Divider",
      title: "Horizontal Rule",
      icon: Minus,
      action: () => editor.chain().focus().setHorizontalRule().run(),
      isActive: false,
    },
  ];

  return (
    <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-1.5 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex items-center justify-between px-1.5 pb-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          <Sparkles size={13} className="text-indigo-400" />
          <span>Beginner Toolbox</span>
          <span className="text-[10px] text-zinc-400 font-normal">
            (Quick click to insert blocks or type &ldquo;/&rdquo;)
          </span>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          title={expanded ? "Collapse toolbox" : "Expand toolbox"}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.label}
                onClick={t.action}
                title={t.title}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition ${
                  t.isActive
                    ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                    : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <Icon size={13} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
