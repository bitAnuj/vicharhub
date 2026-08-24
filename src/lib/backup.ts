import type { Page } from "../types/page";

export function exportAllPages(pages: Page[]) {
  const json = JSON.stringify(pages, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "vicharhub-backup.json";
  link.click();

  URL.revokeObjectURL(url);
}

export function importAllPages(
  file: File,
  onSuccess: (pages: Page[]) => void,
  onError: (message: string) => void
) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result as string);

      if (!Array.isArray(parsed)) {
        onError("This file doesn't look like a valid backup.");
        return;
      }

      onSuccess(parsed as Page[]);
    } catch {
      onError("Couldn't read that file. Make sure it's a backup .json file.");
    }
  };

  reader.readAsText(file);
}
