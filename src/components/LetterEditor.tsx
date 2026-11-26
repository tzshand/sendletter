"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent, Node as TiptapNode } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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
  // The editor is created ONCE and its options never change. Rebuilding them on
  // every render (new extension objects, a new onUpdate) made Tiptap re-apply
  // its options each time the parent re-rendered, and with enough content that
  // fed back through onUpdate into an endless update loop. Everything that does
  // change (the language, the callback, the font) is read through a ref or set
  // imperatively instead.
  const placeholder = settings.language === "fr" ? "Rédigez votre lettre ici..." : "Start writing your letter...";
  const placeholderRef = useRef(placeholder);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    placeholderRef.current = placeholder;
    onChangeRef.current = onChange;
  });
  // Read once: the editor owns its content from here on.
  const [initialContent] = useState(content || "");

  // The whole options object is memoised, not just the extensions: Tiptap
  // compares options on every render and, if any differ (even a freshly built
  // editorProps or onUpdate), re-applies them to the view. That re-read the DOM
  // each time and, with a page break in the document, fed back through onUpdate.
  const options = useMemo(
    () => ({
      // This component is part of a server-rendered page; Tiptap needs to be told
      // not to render during SSR, or it logs a hydration warning and (in dev) fails.
      immediatelyRender: false,
      extensions: [
        StarterKit, // includes Underline
        PageBreak,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        // Called by Tiptap while the editor renders, never during React's render; the
        // ref is how the current language reaches it without rebuilding the options.
        // eslint-disable-next-line react-hooks/refs
        Placeholder.configure({ placeholder: () => placeholderRef.current }),
      ],
      content: initialContent,
      onUpdate: ({ editor }: { editor: { getHTML: () => string } }) => {
        onChangeRef.current(editor.getHTML());
      },
      editorProps: { attributes: { class: "tiptap" } },
    }),
    [initialContent],
  );
  const editor = useEditor(options, []);

  useEffect(() => {
    editor?.setOptions({
      editorProps: {
        attributes: {
          class: "tiptap",
          style: `font-family: "${settings.fontFamily}", serif; font-size: ${settings.fontSize}pt;`,
        },
      },
    });
  }, [editor, settings.fontFamily, settings.fontSize]);

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
          onClick={() => editor.chain().focus().insertContent([{ type: "pageBreak" }, { type: "paragraph" }]).run()}
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
