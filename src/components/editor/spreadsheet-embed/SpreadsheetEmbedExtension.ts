import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import SpreadsheetEmbedView from "./SpreadsheetEmbedView";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    spreadsheetEmbed: {
      insertSpreadsheetEmbed: (attrs?: { pageId?: string; height?: number }) => ReturnType;
    };
  }
}

export const SpreadsheetEmbed = Node.create({
  name: "spreadsheetEmbed",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      pageId: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-page-id") || "",
        renderHTML: (attributes) => ({ "data-page-id": attributes.pageId || "" }),
      },
      height: {
        default: 380,
        parseHTML: (element) => {
          const val = element.getAttribute("data-height");
          return val ? parseInt(val, 10) : 380;
        },
        renderHTML: (attributes) => ({ "data-height": String(attributes.height || 380) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="spreadsheet-embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "spreadsheet-embed" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SpreadsheetEmbedView, {
      stopEvent: () => true,
    });
  },

  addCommands() {
    return {
      insertSpreadsheetEmbed:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: attrs || { pageId: "", height: 380 },
          }),
    };
  },
});

export default SpreadsheetEmbed;
