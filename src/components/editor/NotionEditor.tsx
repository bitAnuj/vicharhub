import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { ReactNodeViewRenderer } from "@tiptap/react";
import CodeBlockView from "./CodeBlockView";
import { createLowlight, common } from "lowlight";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import Callout from "./callout/Callout";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import PresenceAvatars from "./PresenceAvatars";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import ToggleBlock from "./toggle/ToggleBlock";
import EmbedBlock from "./embed/Embed";
import MathBlock from "./math/MathBlock";
import { Column, Columns } from "./columns/Columns";
import DatabaseBlock from "./database/DatabaseBlock";
import FileBlock from "./file/FileBlock";
import SpreadsheetEmbed from "./spreadsheet-embed/SpreadsheetEmbedExtension";
import BoardEmbed from "./board-embed/BoardEmbedExtension";
import SelectionToolbar from "./SelectionToolbar";
import DocumentToolbox from "./DocumentToolbox";
import { Download } from "lucide-react";
import { exportPageAsMarkdown } from "../../lib/exportMarkdown";
import { useEffect, useRef, useState } from "react";
import { usePageStore } from "../../store/usePageStore";
import { useAuthStore } from "../../store/useAuthStore";
import { getOrCreateCollabUser, COLLAB_NAME_CHANGE_EVENT } from "../../lib/collabUser";
import SlashCommand from "./slash-command/SlashCommand";
import BlockDragHandle from "./BlockDragHandle";
import { createPageMention } from "./mention/PageMention";
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import LinkUnfurl from "./LinkUnfurl";
import LinkPreview from "./LinkPreview";
import { getCachedLinkMetadata, fetchLinkMetadata } from "../../lib/linkUnfurl";

const lowlight = createLowlight(common);

function NotionEditor({ pageId }: { pageId: string }) {
  const { pages, updateContent, flushContent, selectPage } = usePageStore();

  const page = pages.find((p) => p.id === pageId);

  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredLink, setHoveredLink] = useState<{
    metadata: { title: string; description: string; image?: string; favicon?: string; url: string };
    position: { x: number; y: number };
  } | null>(null);

  const liveblocks = useLiveblocksExtension();

  const editor = useEditor({
    extensions: [
      liveblocks,
      StarterKit.configure({
        codeBlock: false,
        undoRedo: false,
      }),
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockView);
        },
      }).configure({
        lowlight,
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") return "Heading";
          return "Type '/' for commands...";
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg",
        },
      }),
      Callout,
      Highlight,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      ToggleBlock,
      EmbedBlock,
      MathBlock,
      Column,
      Columns,
      DatabaseBlock,
      FileBlock,
      SpreadsheetEmbed,
      BoardEmbed,
      SlashCommand,
      createPageMention(),
      LinkUnfurl,
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-zinc dark:prose-invert max-w-none focus:outline-none min-h-[500px]",
      },
      handlePaste(view, event) {
        const text = event.clipboardData?.getData("text/plain");
        if (!text) return false;

        const isUrl = /^https?:\/\/[^\s]+$/.test(text.trim());
        if (!isUrl) return false;

        // If user has text selected, default TipTap behavior is to turn it into a link
        const { from, to } = view.state.selection;
        if (from !== to) return false;

        // If the URL looks like an embeddable service, insert an embed block
        const url = text.trim();
        const isEmbeddable =
          /youtube\.com|youtu\.be|codepen\.io|twitter\.com|x\.com|figma\.com/.test(
            url
          );
        if (isEmbeddable) {
          editor?.chain().focus().setEmbed(url).run();
          return true;
        }

        // Otherwise insert an unfurl card with metadata
        editor
          ?.chain()
          .focus()
          .insertContent({
            type: "linkUnfurl",
            attrs: { url },
          })
          .run();
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      updateContent(pageId, html);
    },
  });

  // Listen for custom collab name change events (from Settings panel)
  useEffect(() => {
    function handleNameChange(e: Event) {
      const detail = (e as CustomEvent<{ name?: string }>).detail;
      if (detail?.name) {
        const color = getOrCreateCollabUser().color || "#4f46e5";
        try {
          if (typeof (editor?.commands as any)?.updateUser === "function") { // eslint-disable-line @typescript-eslint/no-explicit-any
            (editor?.commands as any).updateUser({ name: detail.name, color }); // eslint-disable-line @typescript-eslint/no-explicit-any
          }
        } catch {
          // ignore
        }
      }
    }
    window.addEventListener(COLLAB_NAME_CHANGE_EVENT, handleNameChange);
    return () => window.removeEventListener(COLLAB_NAME_CHANGE_EVENT, handleNameChange);
  }, [editor]);

  // Handle Cmd+K for slash command
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        editor?.commands.insertContent("/");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editor]);

  // Flush pending content saves when component unmounts (e.g. navigating away)
  useEffect(() => {
    return () => {
      flushContent(pageId);
    };
  }, [pageId, flushContent]);

  // Click handler for page mentions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest(
              '[data-type="pageMention"]'
            );
      if (!target) return;

      const id = target.getAttribute("data-id");
      if (id) {
        // Check if page exists and isn't trashed
        const page = pages.find((p) => p.id === id);
        if (page && !page.trashed) {
          selectPage(id);
        }
      }
    }

    container.addEventListener("click", onClick);
    return () => container.removeEventListener("click", onClick);
  }, [selectPage, pages]);

  // Link hover preview
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let currentHref: string | null = null;

    function onMouseOver(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      currentHref = href;
      const rect = target.getBoundingClientRect();
      const position = { x: rect.left, y: rect.bottom + 6 };

      const cached = getCachedLinkMetadata(href);
      if (cached) {
        setHoveredLink({ metadata: cached, position });
        return;
      }

      fetchLinkMetadata(href).then((metadata) => {
        if (metadata && currentHref === href) {
          setHoveredLink({ metadata, position });
        }
      });
    }

    function onMouseOut(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      currentHref = null;
      setHoveredLink(null);
    }

    container.addEventListener("mouseover", onMouseOver);
    container.addEventListener("mouseout", onMouseOut);
    return () => {
      container.removeEventListener("mouseover", onMouseOver);
      container.removeEventListener("mouseout", onMouseOut);
    };
  }, []);

  // Synchronize collaborator caret name in Tiptap whenever display name updates
  const authName = useAuthStore((s) => s.user?.name);
  useEffect(() => {
    if (!editor) return;
    const name = authName?.trim() || getOrCreateCollabUser().name || "Guest";
    const color = getOrCreateCollabUser().color || "#4f46e5";
    (editor.commands as Record<string, any>).updateUser?.({ name, color }); // eslint-disable-line @typescript-eslint/no-explicit-any

    function handleNameChange(e: Event) {
      const detail = (e as CustomEvent<{ name?: string }>).detail;
      if (detail?.name && editor) {
        (editor.commands as Record<string, any>).updateUser?.({ name: detail.name, color }); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    }
    window.addEventListener(COLLAB_NAME_CHANGE_EVENT, handleNameChange);
    return () => window.removeEventListener(COLLAB_NAME_CHANGE_EVENT, handleNameChange);
  }, [editor, authName]);

  if (!editor) return null;

  const text = editor.getText();
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() =>
            exportPageAsMarkdown(page?.title ?? "Untitled", editor.getHTML())
          }
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Download size={14} />
          Export as Markdown
        </button>

        <PresenceAvatars />
      </div>

      <DocumentToolbox editor={editor} />
      <SelectionToolbar editor={editor} />
      <BlockDragHandle editor={editor} containerRef={containerRef} />
      <EditorContent editor={editor} />
      <LinkPreview metadata={hoveredLink?.metadata ?? null} position={hoveredLink?.position ?? null} />
      <p className="mt-6 text-xs text-zinc-600">
        {wordCount} words · {charCount} characters
      </p>
    </div>
  );
}

export default NotionEditor;
