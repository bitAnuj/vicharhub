import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import BoardEmbedView from "./BoardEmbedView";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    boardEmbed: {
      insertBoardEmbed: (attrs?: { pageId?: string; height?: number }) => ReturnType;
    };
  }
}

export const BoardEmbed = Node.create({
  name: "boardEmbed",
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
        default: 520,
        parseHTML: (element) => {
          const val = element.getAttribute("data-height");
          return val ? parseInt(val, 10) : 520;
        },
        renderHTML: (attributes) => ({ "data-height": String(attributes.height || 520) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type=\"board-embed\"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "board-embed" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BoardEmbedView, {
      stopEvent: () => true,
    });
  },

  addCommands() {
    return {
      insertBoardEmbed:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: attrs || { pageId: "", height: 520 },
          }),
    };
  },
});

export default BoardEmbed;
