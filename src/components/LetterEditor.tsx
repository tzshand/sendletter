"use client";

import { useEditor, EditorContent } from "@tiptap/react";
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
} from "lucide-react";
import type { Settings } from "./LetterSettings";

export function LetterEditor({
  content,
  onChange,
  settings,
}: {
  content: string;
  onChange: (html: string) => void;
  settings: Settings;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
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
      </div>
      <div className="border border-gray-200 rounded-xl p-5 bg-white min-h-[300px] focus-within:border-gray-400 focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
