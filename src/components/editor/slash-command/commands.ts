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
    description: "Plain paragraph text",
    icon: Text,
    keywords: ["paragraph", "text", "p"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "Heading 1",
    description: "Big section heading",
    icon: Heading1,
    keywords: ["h1", "heading", "title", "big"],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 1 })
        .run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: Heading2,
    keywords: ["h2", "heading", "subtitle"],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 2 })
        .run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: Heading3,
    keywords: ["h3", "heading"],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 3 })
        .run(),
  },
  {
    title: "Bulleted list",
    description: "Simple bullet list",
    icon: List,
    keywords: ["bullet", "list", "ul"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    description: "List with numbering",
    icon: ListOrdered,
    keywords: ["numbered", "ordered", "list", "ol"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "To-do list",
    description: "Checkbox task item",
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
    description: "Code snippet with syntax highlighting",
    icon: Code,
    keywords: ["code", "snippet", "codeblock"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Divider",
    description: "Horizontal line divider",
    icon: Minus,
    keywords: ["divider", "hr", "line", "separator"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: "Image",
    description: "Upload an image from your computer",
    icon: ImageIcon,
    keywords: ["image", "picture", "photo", "upload"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();

      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const { url } = await response.json();
        editor.chain().focus().setImage({ src: url }).run();
      };
      input.click();
    },
  },
  {
    title: "Callout",
    description: "Highlighted box to draw attention",
    icon: Lightbulb,
    keywords: ["callout", "highlight", "note", "tip", "warning"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setCallout().run(),
  },
  {
    title: "Table",
    description: "Insert a simple table",
    icon: Table2,
    keywords: ["table", "grid", "spreadsheet"],
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
