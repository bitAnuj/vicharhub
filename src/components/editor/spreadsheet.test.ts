import { describe, it, expect } from "vitest";

describe("Spreadsheet Logic & Serialization", () => {
  it("initial dimensions and data", () => {
    const DEFAULT_SHEET_DATA = [
      ["Item", "Quantity", "Price", "=B1*C1"],
      ["Notebook", "5", "12", "=B2*C2"],
      ["Pen", "10", "2", "=B3*C3"],
      ["Desk Mat", "1", "25", "=B4*C4"],
    ];
    expect(DEFAULT_SHEET_DATA.length).toBe(4);
    expect(DEFAULT_SHEET_DATA[0].length).toBe(4);
    expect(DEFAULT_SHEET_DATA[0][3]).toBe("=B1*C1");
  });

  it("coordinate mapping to column letters", () => {
    const getCellName = (x: number, y: number) => {
      const colLetter = String.fromCharCode(65 + x);
      const rowNumber = y + 1;
      return `${colLetter}${rowNumber}`;
    };
    expect(getCellName(0, 0)).toBe("A1");
    expect(getCellName(1, 0)).toBe("B1");
    expect(getCellName(2, 4)).toBe("C5");
    expect(getCellName(3, 9)).toBe("D10");
  });

  it("CSV escaping & serialization", () => {
    const matrix = [
      ["Product", "Description", "Cost"],
      ["Coffee", 'Dark "Roast"', "$5.00"],
      ["Tea", "Green, Herbal", "$3.50"],
    ];
    const serializeToCsv = (data: string[][]) =>
      data
        .map((row) =>
          row
            .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");

    const csv = serializeToCsv(matrix);
    expect(csv).toContain('"Product","Description","Cost"');
    expect(csv).toContain('"Coffee","Dark ""Roast""","$5.00"');
    expect(csv).toContain('"Tea","Green, Herbal","$3.50"');
  });

  it("row expansion", () => {
    const initialRows = [["A", "B"], ["1", "2"]];
    const addRows = (rows: string[][], count: number, colsCount: number) => {
      const copy = [...rows];
      for (let i = 0; i < count; i++) {
        copy.push(new Array(colsCount).fill(""));
      }
      return copy;
    };
    const expanded = addRows(initialRows, 10, 2);
    expect(expanded.length).toBe(12);
    expect(expanded[11].length).toBe(2);
    expect(expanded[11][0]).toBe("");
  });
});
