import React, { useEffect, useState, useRef, useCallback } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { usePageStore } from "../../store/usePageStore";

type ExcalidrawComponentProps = React.ComponentProps<typeof Excalidraw>;
type OnChangeType = NonNullable<ExcalidrawComponentProps["onChange"]>;
type ExcalidrawElements = Parameters<OnChangeType>[0];
type ExcalidrawAppState = Parameters<OnChangeType>[1];

type Props = {
  pageId: string;
  isEmbedded?: boolean;
  height?: number | string;
};

type BoardData = {
  type: "board";
  elements?: ExcalidrawElements;
  appState?: {
    viewBackgroundColor?: string;
    currentItemFontFamily?: number;
  };
};

export default function BoardEditor({ pageId, isEmbedded = false, height }: Props) {
  const page = usePageStore((s) => s.pages.find((p) => p.id === pageId));
  const updateContent = usePageStore((s) => s.updateContent);

  // Check if dark mode is active
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Parse initial elements from page.content
  const [initialData] = useState<{
    elements?: ExcalidrawElements;
    appState?: Partial<ExcalidrawAppState>;
  }>(() => {
    if (!page?.content) return { elements: [] };
    try {
      const parsed = JSON.parse(page.content) as BoardData;
      if (parsed && parsed.type === "board" && Array.isArray(parsed.elements)) {
        return {
          elements: parsed.elements,
          appState: parsed.appState as Partial<ExcalidrawAppState>,
        };
      }
    } catch {
      // not JSON or not board
    }
    return { elements: [] };
  });

  // Debounced auto-save
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJsonRef = useRef<string>(page?.content || "");

  const handleChange: OnChangeType = useCallback(
    (elements, appState) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        // Filter out volatile fields from appState so we only save relevant view state
        const sanitizedAppState = {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemFontFamily: appState.currentItemFontFamily,
        };

        const boardPayload: BoardData = {
          type: "board",
          elements,
          appState: sanitizedAppState,
        };

        const serialized = JSON.stringify(boardPayload);
        if (serialized !== lastSavedJsonRef.current) {
          lastSavedJsonRef.current = serialized;
          updateContent(pageId, serialized);
        }
      }, 600);
    },
    [pageId, updateContent]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const containerHeight = height ?? (isEmbedded ? 520 : "calc(100vh - 220px)");

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden border border-zinc-200 shadow-sm dark:border-zinc-800 bg-white dark:bg-zinc-950 ${
        isEmbedded ? "my-3" : "mt-2"
      }`}
      style={{
        height: containerHeight,
        minHeight: isEmbedded ? 400 : 550,
      }}
    >
      <Excalidraw
        initialData={{
          elements: initialData.elements,
          appState: {
            ...initialData.appState,
            theme: isDark ? "dark" : "light",
          },
        }}
        theme={isDark ? "dark" : "light"}
        onChange={handleChange}
        UIOptions={{
          canvasActions: {
            loadScene: true,
            saveToActiveFile: false,
            export: { saveFileToDisk: true },
            toggleTheme: true,
          },
        }}
      />
    </div>
  );
}
