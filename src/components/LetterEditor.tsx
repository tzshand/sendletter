"use client";

import { useEditor, EditorContent, Node as TiptapNode } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  SeparatorHorizontal,
} from "lucide-react";
import type { Settings } from "./LetterSettings";
import { FontSizeBar } from "./LetterSettings";

/**
 * A hard page break: the next block starts on a new page. It is a bare marker
 * (`<div data-page-break>`); the layout engine in lib/generatePdf.ts sizes it so
 * the preview, the page count and the printed PDF all break in the same place.
 */
const PageBreak = TiptapNode.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML() {
    return [{ tag: "div[data-page-break]" }];
  },
  renderHTML() {
    return ["div", { "data-page-break": "", class: "page-break" }];
  },
});

export function LetterEditor({
  content,
  onChange,
  settings,
  onSettingsChange,
  pageInfo,
}: {
  content: string;
  onChange: (html: string) => void;
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
  /** Live size of the letter, shown under the editor. */
  pageInfo?: { pages: number; sheets: number };
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      PageBreak,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder:
          settings.language === "fr"
            ? "Rédigez votre lettre ici..."
            : "Start writing your letter...",
      }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tiptap",
        style: `font-family: "${settings.fontFamily}", serif; font-size: ${settings.fontSize}pt;`,
      },
    },
  });

  if (!editor) return null;

  const Btn = ({
    active,
    onClick,
    children,
    title,
  }: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    title?: string;
  }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`p-1.5 rounded-md transition-all ${
        active
          ? "bg-gray-900 text-white shadow-sm"
          : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div>
      <div className="mb-3">
        <FontSizeBar settings={settings} onChange={onSettingsChange} />
      </div>
      <div className="flex items-center gap-0.5 mb-3">
        <Btn
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="w-3.5 h-3.5" />
        </Btn>
        <Btn
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="w-3.5 h-3.5" />
        </Btn>
        <Btn
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </Btn>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <Btn
          title="Align left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </Btn>
        <Btn
          title="Align center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </Btn>
        <Btn
          title="Align right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="w-3.5 h-3.5" />
        </Btn>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <Btn
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="w-3.5 h-3.5" />
        </Btn>
        <Btn
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </Btn>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <Btn
          title={settings.language === "fr" ? "Saut de page" : "Page break"}
          onClick={() => editor.chain().focus().insertContent({ type: "pageBreak" }).run()}
        >
          <SeparatorHorizontal className="w-3.5 h-3.5" />
        </Btn>
      </div>
      <div className="border border-gray-200 rounded-xl p-5 bg-white min-h-[300px] focus-within:border-gray-400 focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all">
        <EditorContent editor={editor} />
      </div>
      {pageInfo && (
        <p className="text-[11px] text-gray-400 mt-2">
          {settings.language === "fr"
            ? `${pageInfo.pages} page${pageInfo.pages > 1 ? "s" : ""} · ${pageInfo.sheets} feuille${pageInfo.sheets > 1 ? "s" : ""}`
            : `${pageInfo.pages} page${pageInfo.pages > 1 ? "s" : ""} · ${pageInfo.sheets} sheet${pageInfo.sheets > 1 ? "s" : ""}`}
        </p>
      )}
    </div>
  );
}
