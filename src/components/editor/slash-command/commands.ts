import type { Editor, Range } from "@tiptap/react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Minus,
  Text,
  ImageIcon,
  Lightbulb,
  Table2,
  ChevronRightSquare,
  FileText,
  Link2,
  ListTree,
  Film,
  Sigma,
  Columns3,
  Database,
  Paperclip,
  FileSpreadsheet,
  PenTool,
  type LucideIcon,
} from "lucide-react";
import { usePageStore } from "../../../store/usePageStore";

export type SlashCommandItem = {
  title: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
  command: (props: { editor: Editor; range: Range }) => void;
};

export const slashCommandItems: SlashCommandItem[] = [
  {
    title: "Text",
    description: "Just start typing with plain text",
    icon: Text,
    keywords: ["p", "paragraph", "text", "plain"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "Heading 1",
    description: "Big section heading",
    icon: Heading1,
    keywords: ["h1", "title", "heading 1", "big"],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHeading({ level: 1 })
        .run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: Heading2,
    keywords: ["h2", "subtitle", "heading 2", "medium"],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHeading({ level: 2 })
        .run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: Heading3,
    keywords: ["h3", "subheading", "heading 3", "small"],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHeading({ level: 3 })
        .run(),
  },
  {
    title: "Bullet list",
    description: "Create a simple bulleted list",
    icon: List,
    keywords: ["bullet", "unordered", "list", "bullets"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    description: "Create a list with numbering",
    icon: ListOrdered,
    keywords: ["numbered", "ordered", "list", "numbers"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "To-do list",
    description: "Track tasks with a to-do list",
    icon: ListTodo,
    keywords: ["todo", "task", "checkbox", "check"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Quote",
    description: "Capture a quote",
    icon: Quote,
    keywords: ["quote", "blockquote", "citation"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Code block",
    description: "Display code with syntax highlighting",
    icon: Code,
    keywords: ["code", "codeblock", "snippet", "pre"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Callout",
    description: "Make writing stand out with an alert box",
    icon: Lightbulb,
    keywords: ["callout", "alert", "box", "note", "tip", "warning"],
    command: ({ editor, range }) =>
      (editor.chain().focus().deleteRange(range) as any).setCallout().run(), // eslint-disable-line @typescript-eslint/no-explicit-any
  },
  {
    title: "Divider",
    description: "Visually divide blocks with a horizontal line",
    icon: Minus,
    keywords: ["divider", "horizontal rule", "hr", "separator", "line"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: "Image",
    description: "Embed with a link or upload with file picker",
    icon: ImageIcon,
    keywords: ["image", "photo", "picture", "upload", "img"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();

      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          const src = reader.result as string;
          editor.chain().focus().setImage({ src }).run();
        };
        reader.readAsDataURL(file);
      };
      input.click();
    },
  },
  {
    title: "Spreadsheet",
    description: "Embed an interactive Google-like spreadsheet",
    icon: FileSpreadsheet,
    keywords: ["spreadsheet", "excel", "sheets", "sheet", "calc", "formula", "grid", "embed spreadsheet"],
    command: ({ editor, range }) => {
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
        .deleteRange(range)
        .insertContent({
          type: "spreadsheetEmbed",
          attrs: { pageId: newSheetId, height: 380 },
        })
        .run();
    },
  },
  {
    title: "Whiteboard (Board)",
    description: "Embed an infinite Excalidraw drawing canvas",
    icon: PenTool,
    keywords: ["board", "whiteboard", "draw", "sketch", "excalidraw", "diagram", "canvas", "flowchart"],
    command: ({ editor, range }) => {
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
        .deleteRange(range)
        .insertContent({
          type: "boardEmbed",
          attrs: { pageId: newBoardId, height: 520 },
        })
        .run();
    },
  },
  {
    title: "Table",
    description: "Insert a simple table",
    icon: Table2,
    keywords: ["table", "grid", "simple table"],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: "Toggle list",
    description: "Collapsible section you can hide/show",
    icon: ChevronRightSquare,
    keywords: ["toggle", "collapse", "expand", "dropdown"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertToggle().run(),
  },
  {
    title: "Embed",
    description: "Embed a YouTube video or website link",
    icon: Film,
    keywords: ["embed", "youtube", "video", "iframe", "website"],
    command: ({ editor, range }) => {
      const url = window.prompt("Paste a YouTube or website link");
      if (!url) return;
      editor.chain().focus().deleteRange(range).setEmbed(url).run();
    },
  },
  {
    title: "Sub-page",
    description: "Create a new nested page here",
    icon: FileText,
    keywords: ["subpage", "page", "nested", "child"],
    command: ({ editor, range }) => {
      const { selectedPageId, addChildPage, pages } = usePageStore.getState();
      const beforeIds = new Set(pages.map((p) => p.id));

      addChildPage(selectedPageId);

      const newPage = usePageStore
        .getState()
        .pages.find((p) => !beforeIds.has(p.id));

      if (!newPage) return;

      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "mention",
          attrs: { id: newPage.id, label: newPage.title || "Untitled" },
        })
        .run();
    },
  },
  {
    title: "Link to page",
    description: "Link to an existing page",
    icon: Link2,
    keywords: ["link", "page", "mention", "reference"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertContent("@").run(),
  },
  {
    title: "Table of contents",
    description: "List of this page's headings",
    icon: ListTree,
    keywords: ["toc", "contents", "outline", "headings"],
    command: ({ editor, range }) => {
      const headings: string[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "heading") {
          headings.push(node.textContent);
        }
      });

      if (headings.length === 0) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent("<p>No headings yet on this page.</p>")
          .run();
        return;
      }

      const listItems = headings
        .map((h) => `<li><p>${h}</p></li>`)
        .join("");

      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(`<ul>${listItems}</ul>`)
        .run();
    },
  },
  {
      title: "Math equation",
      description: "Insert a LaTeX math formula",
      icon: Sigma,
      keywords: ["math", "equation", "formula", "latex"],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).insertMath().run(),
  },
  {
      title: "2 columns",
      description: "Side-by-side layout",
      icon: Columns3,
      keywords: ["columns", "layout", "side by side"],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).insertColumns().run(),
  },
  {
      title: "Database",
      description: "Table, Kanban, or Gallery of items",
      icon: Database,
      keywords: ["database", "kanban", "gallery", "table", "board"],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).insertDatabase().run(),
  },
  {
      title: "File attachment",
      description: "Upload any file from your computer",
      icon: Paperclip,
      keywords: ["file", "attachment", "upload", "document", "pdf"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();

        const input = document.createElement("input");
        input.type = "file";
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = () => {
            editor
              .chain()
              .focus()
              .setFile({
                name: file.name,
                size: file.size,
                dataUrl: reader.result as string,
              })
              .run();
          };
          reader.readAsDataURL(file);
        };
        input.click();
      },
    },
];

export function filterSlashCommands(query: string): SlashCommandItem[] {
  if (!query) return slashCommandItems;
  const q = query.toLowerCase();
  return slashCommandItems.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.includes(q))
  );
}
