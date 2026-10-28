import { describe, it, expect } from "vitest";

describe("Board (Excalidraw) Serialization & State", () => {
  it("initializes clean empty board structure", () => {
    const defaultBoard = {
      type: "board",
      elements: [],
      appState: {},
    };
    const serialized = JSON.stringify(defaultBoard);
    expect(serialized).toContain('"type":"board"');
    expect(serialized).toContain('"elements":[]');
  });

  it("identifies board content reliably", () => {
    const isBoard = (content?: string) =>
      Boolean(
        content &&
          (content.startsWith('{"type":"board"') ||
            content.includes('"type":"board"') ||
            content.includes('"type": "board"'))
      );

    expect(isBoard('{"type":"board","elements":[]}')).toBe(true);
    expect(isBoard('{"type": "board", "elements": []}')).toBe(true);
    expect(isBoard('{"type":"spreadsheet","sheets":[]}')).toBe(false);
    expect(isBoard("<p>Regular document</p>")).toBe(false);
    expect(isBoard(undefined)).toBe(false);
  });

  it("preserves elements and sanitized appState", () => {
    const rawElements = [
      { id: "el-1", type: "rectangle", x: 100, y: 150, width: 200, height: 100 },
      { id: "el-2", type: "arrow", x: 300, y: 200, width: 80, height: 40 },
    ];
    const rawAppState = {
      viewBackgroundColor: "#ffffff",
      currentItemFontFamily: 1,
      selectedElementIds: { "el-1": true },
      zoom: { value: 1 },
    };

    const sanitizedAppState = {
      viewBackgroundColor: rawAppState.viewBackgroundColor,
      currentItemFontFamily: rawAppState.currentItemFontFamily,
    };

    const boardPayload = {
      type: "board",
      elements: rawElements,
      appState: sanitizedAppState,
    };

    const json = JSON.stringify(boardPayload);
    const parsed = JSON.parse(json);

    expect(parsed.elements.length).toBe(2);
    expect(parsed.elements[0].type).toBe("rectangle");
    expect(parsed.appState.viewBackgroundColor).toBe("#ffffff");
    expect(parsed.appState.selectedElementIds).toBeUndefined(); // volatile state excluded
  });
});
