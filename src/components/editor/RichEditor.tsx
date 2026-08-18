import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import { common, createLowlight } from 'lowlight';
import { computePosition, flip, offset, shift } from '@floating-ui/dom';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { ImageCropModal } from '@/components/ui/ImageCropModal';
import { ResizableImageView } from '@/components/editor/ResizableImageView';

const lowlight = createLowlight(common);

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '40%',
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute('width') ||
          (el as HTMLElement).style.width ||
          '40%',
        renderHTML: (attrs) => {
          if (!attrs.width) return {};
          return {
            width: attrs.width,
            style: `width: ${attrs.width}; height: auto; max-width: 100%;`,
          };
        },
      },
      'data-align': {
        default: 'inline',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-align') || 'inline',
        renderHTML: (attrs) => ({ 'data-align': attrs['data-align'] }),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

// ─── Icon ────────────────────────────────────────────────────────────────────
function Icon({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

// ─── ToolbarButton ────────────────────────────────────────────────────────────
function Btn({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded text-xs transition-colors disabled:opacity-40 ${
        active
          ? 'bg-violet-600 text-white'
          : 'text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-neutral-700 mx-0.5 shrink-0" />;
}

// ─── Link Dialog ─────────────────────────────────────────────────────────────
function LinkDialog({
  initial,
  onConfirm,
  onRemove,
  onClose,
}: {
  initial: string;
  onConfirm: (url: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState(initial);
  return (
    <div
      className="absolute z-50 top-full mt-1 left-0 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl p-3 flex flex-col gap-2"
      style={{ minWidth: 280 }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="https://example.com"
        className="px-3 py-1.5 rounded-lg text-xs bg-neutral-900 border border-neutral-700 focus:border-violet-500 focus:outline-none text-neutral-100"
        onKeyDown={(e) => {
          if (e.key === 'Enter') onConfirm(val);
          if (e.key === 'Escape') onClose();
        }}
      />
      <div className="flex gap-2 justify-end">
        {initial && (
          <button
            type="button"
            onClick={onRemove}
            className="px-2.5 py-1 text-xs rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 transition-colors"
          >
            Remove
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 text-xs rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-300 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onConfirm(val)}
          className="px-2.5 py-1 text-xs rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
type RichEditorProps = {
  content: string;
  onChange: (value: string) => void;
  placeholder?: string;
  uploadModule?: 'blog' | 'projects' | 'profile';
};

export function RichEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  uploadModule = 'blog',
}: RichEditorProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const linkBtnRef = useRef<HTMLDivElement>(null);

  // Bubble menu state
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleStyle, setBubbleStyle] = useState<React.CSSProperties>({});
  const bubbleRef = useRef<HTMLDivElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      ResizableImage.configure({
        inline: true,
        HTMLAttributes: { class: 'rounded-lg' },
        allowBase64: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-violet-400 underline' },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'tiptap focus:outline-none' },
    },
  });

  // ── Bubble menu positioning ───────────────────────────────────────────────
  useEffect(() => {
    if (!editor) return;

    const updateBubble = () => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to && !editor.isActive('image');

      if (!hasSelection || !bubbleRef.current || !editorWrapRef.current) {
        setBubbleVisible(false);
        return;
      }

      // Get DOM rect of selection
      const view = editor.view;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);
      const editorRect = editorWrapRef.current.getBoundingClientRect();

      // Virtual element centered on selection
      const virtualEl = {
        getBoundingClientRect() {
          return {
            width: end.left - start.left,
            height: start.bottom - start.top,
            top: start.top,
            left: start.left,
            right: end.left,
            bottom: start.bottom,
            x: start.left,
            y: start.top,
          } as DOMRect;
        },
      };

      computePosition(virtualEl as Element, bubbleRef.current, {
        placement: 'top',
        middleware: [offset(8), flip(), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        // Convert to relative-to-editor coords
        setBubbleStyle({
          left: x - editorRect.left,
          top: y - editorRect.top,
        });
        setBubbleVisible(true);
      });
    };

    editor.on('selectionUpdate', updateBubble);
    editor.on('blur', () => setBubbleVisible(false));

    return () => {
      editor.off('selectionUpdate', updateBubble);
    };
  }, [editor]);

  const handleImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) setCropFile(file);
    };
    input.click();
  }, []);

  const insertCroppedImage = useCallback(
    async (blob: Blob, filename: string) => {
      if (!editor) return;
      setCropFile(null);
      const toastId = toast.loading('Uploading image…');
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('module', uploadModule);
      formData.append('format', 'webp');
      formData.append('width', '1600');
      try {
        const res = await api.post('/api/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const url = `${import.meta.env.VITE_API_URL}${res.data.data.url}`;
        editor
          .chain()
          .focus()
          .setImage({ src: url })
          .updateAttributes('image', { width: '40%', 'data-align': 'inline' })
          .run();
        toast.success('Image inserted', { id: toastId });
      } catch {
        toast.error('Upload failed', { id: toastId });
      }
    },
    [editor, uploadModule]
  );

  const openLinkDialog = useCallback(() => {
    setShowLinkDialog(true);
  }, []);

  const applyLink = useCallback(
    (url: string) => {
      if (!editor) return;
      if (url.trim()) {
        editor.chain().focus().setLink({ href: url.trim() }).run();
      } else {
        editor.chain().focus().unsetLink().run();
      }
      setShowLinkDialog(false);
    },
    [editor],
  );

  const removeLink = useCallback(() => {
    editor?.chain().focus().unsetLink().run();
    setShowLinkDialog(false);
  }, [editor]);

  if (!editor) return null;

  const currentLink = editor.getAttributes('link').href ?? '';

  return (
    <div className="border border-neutral-700 rounded-xl overflow-visible bg-neutral-900">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-neutral-700 bg-neutral-800/50 rounded-t-xl">
        <Btn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <strong className="font-bold text-[13px]">B</strong>
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <em className="text-[13px]">I</em>
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline (Ctrl+U)"
        >
          <span className="text-[13px] underline">U</span>
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <span className="text-[13px] line-through">S</span>
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive('highlight')}
          title="Highlight"
        >
          <Icon d="M9 11l-1 8 4-3 4 3-1-8M12 3l2 5H10l2-5z" />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Inline code"
        >
          <Icon d="M8 9l-3 3 3 3M16 9l3 3-3 3" />
        </Btn>

        <Sep />

        <Btn
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <span className="text-[11px] font-bold">H1</span>
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <span className="text-[11px] font-bold">H2</span>
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <span className="text-[11px] font-bold">H3</span>
        </Btn>

        <Sep />

        <Btn
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
          title="Align left"
        >
          <Icon d="M3 6h18M3 12h12M3 18h15" />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
          title="Align center"
        >
          <Icon d="M3 6h18M6 12h12M4.5 18h15" />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
          title="Align right"
        >
          <Icon d="M3 6h18M9 12h12M6 18h15" />
        </Btn>

        <Sep />

        <Btn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        >
          <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Ordered list"
        >
          <Icon d="M10 6h11M10 12h11M10 18h11M4 6h.01M4 12h.01M4 18h.01" />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Icon d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code block"
        >
          <Icon d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
        </Btn>

        <Sep />

        {/* Link */}
        <div className="relative" ref={linkBtnRef}>
          <Btn
            onClick={openLinkDialog}
            active={editor.isActive('link')}
            title="Insert/edit link"
          >
            <Icon d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </Btn>
          {showLinkDialog && (
            <LinkDialog
              initial={currentLink}
              onConfirm={applyLink}
              onRemove={removeLink}
              onClose={() => setShowLinkDialog(false)}
            />
          )}
        </div>

        <Btn onClick={handleImageUpload} title="Upload image">
          <Icon d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </Btn>

        <Sep />

        <Btn
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <Icon d="M9 14L4 9l5-5M4 9h11a4 4 0 010 8H11" />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Icon d="M15 14l5-5-5-5M19 9H8a4 4 0 000 8h3" />
        </Btn>
      </div>

      {/* Image size / align toolbar — shown when an image is selected */}
      {editor.isActive('image') && (
        <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-neutral-700 bg-neutral-800/70">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mr-2">
            Drag corner to resize
          </span>
          {(['33%', '50%', '75%', '100%'] as const).map((w) => (
            <button
              key={w}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().updateAttributes('image', { width: w }).run();
              }}
              className={`px-2 py-1 rounded text-[11px] font-medium ${
                editor.getAttributes('image').width === w
                  ? 'bg-violet-600 text-white'
                  : 'text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
              }`}
            >
              {w}
            </button>
          ))}
          <div className="w-px h-4 bg-neutral-700 mx-1" />
          {([
            ['inline', 'Inline'],
            ['left', 'Float L'],
            ['center', 'Center'],
            ['right', 'Float R'],
          ] as const).map(([align, label]) => (
            <button
              key={align}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().updateAttributes('image', { 'data-align': align }).run();
              }}
              className={`px-2 py-1 rounded text-[11px] font-medium ${
                editor.getAttributes('image')['data-align'] === align
                  ? 'bg-violet-600 text-white'
                  : 'text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="w-px h-4 bg-neutral-700 mx-1" />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().deleteSelection().run();
            }}
            className="px-2 py-1 rounded text-[11px] font-medium text-red-400 hover:bg-red-500/15"
          >
            Delete
          </button>
        </div>
      )}

      {/* ── Editor + Bubble Menu wrapper ─────────────────────────────────── */}
      <div ref={editorWrapRef} className="relative">
        {/* Bubble Menu */}
        <div
          ref={bubbleRef}
          style={{
            ...bubbleStyle,
            position: 'absolute',
            pointerEvents: bubbleVisible ? 'auto' : 'none',
            opacity: bubbleVisible ? 1 : 0,
            transition: 'opacity 0.1s',
            zIndex: 50,
          }}
        >
          <div className="flex items-center gap-0.5 px-2 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700 shadow-2xl shadow-black/50">
            <Btn
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
              title="Bold"
            >
              <strong className="text-[12px]">B</strong>
            </Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
              title="Italic"
            >
              <em className="text-[12px]">I</em>
            </Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive('underline')}
              title="Underline"
            >
              <span className="text-[12px] underline">U</span>
            </Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive('strike')}
              title="Strike"
            >
              <span className="text-[12px] line-through">S</span>
            </Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              active={editor.isActive('highlight')}
              title="Highlight"
            >
              <Icon d="M9 11l-1 8 4-3 4 3-1-8M12 3l2 5H10l2-5z" size={12} />
            </Btn>
            <Sep />
            <Btn
              onClick={openLinkDialog}
              active={editor.isActive('link')}
              title="Link"
            >
              <Icon
                d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
                size={12}
              />
            </Btn>
          </div>
        </div>

        <EditorContent editor={editor} className="min-h-96" />
      </div>

      {cropFile && (
        <ImageCropModal
          file={cropFile}
          title="Crop image"
          onConfirm={insertCroppedImage}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  );
}
