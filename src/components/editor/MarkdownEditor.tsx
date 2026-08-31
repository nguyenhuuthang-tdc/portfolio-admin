import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type ClipboardEvent, type DragEvent, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import toast from 'react-hot-toast';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  SquareCode,
  Strikethrough,
  Table as TableIcon,
} from 'lucide-react';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { api } from '@/lib/api';
import { mediaUrl } from '@/lib/media';
import { ImageCropModal } from '@/components/ui/ImageCropModal';
import { showApiError } from '@/lib/api-error-toast';

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  enableImages?: boolean;
  uploadModule?: 'blog' | 'projects';
};

type Tab = 'write' | 'split' | 'preview';
type Align = 'center' | 'left' | 'right' | 'inline';

const WIDTH_PRESETS = [25, 40, 60, 80, 100];

const previewSanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'div', 'span'],
  attributes: {
    ...defaultSchema.attributes,
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      'width',
      'height',
      'className',
      'class',
      'dataAlign',
      ['data-align'],
    ],
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      'className',
      'class',
      'dataAlign',
      ['data-align'],
    ],
  },
};

function imageHtml(url: string, alt: string, widthPct: number, align: Align) {
  const safeAlt = alt.replace(/"/g, '');
  return `<img src="${url}" alt="${safeAlt}" width="${widthPct}%" data-align="${align}" />`;
}

function insertAtCursor(source: string, start: number, end: number, insert: string, selectInside?: { from: number; to: number }) {
  return {
    next: source.slice(0, start) + insert + source.slice(end),
    caretStart: start + (selectInside?.from ?? insert.length),
    caretEnd: start + (selectInside?.to ?? insert.length),
  };
}

function wrapSelection(source: string, start: number, end: number, before: string, after = before) {
  const selected = source.slice(start, end) || 'text';
  const insert = `${before}${selected}${after}`;
  return {
    next: source.slice(0, start) + insert + source.slice(end),
    caretStart: start + before.length,
    caretEnd: start + before.length + selected.length,
  };
}

function lineRange(source: string, pos: number) {
  const from = source.lastIndexOf('\n', pos - 1) + 1;
  const to = source.indexOf('\n', pos);
  return { from, to: to === -1 ? source.length : to };
}

function indentLines(source: string, start: number, end: number, outdent: boolean) {
  const from = source.lastIndexOf('\n', start - 1) + 1;
  const endLine = source.indexOf('\n', Math.max(end - 1, start));
  const to = endLine === -1 ? source.length : endLine;
  const block = source.slice(from, to);
  const nextBlock = block
    .split('\n')
    .map((line) => {
      if (outdent) return line.replace(/^  /, '').replace(/^\t/, '');
      return line.length ? `  ${line}` : line;
    })
    .join('\n');
  return {
    next: source.slice(0, from) + nextBlock + source.slice(to),
    caretStart: from,
    caretEnd: from + nextBlock.length,
  };
}

const previewComponents = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="mt-6 mb-3 text-2xl font-bold first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="mt-6 mb-3 text-xl font-bold first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="mt-5 mb-2 text-lg font-semibold">{children}</h3>
  ),
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mb-4 leading-7 text-neutral-300">{children}</p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="mb-4 list-disc pl-5 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="mb-4 list-decimal pl-5 space-y-1">{children}</ol>
  ),
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a href={href} className="text-violet-400 underline" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  img: ({
    src,
    alt,
    width,
    height,
    ...props
  }: {
    src?: string;
    alt?: string;
    width?: string | number;
    height?: string | number;
    'data-align'?: string;
    dataAlign?: string;
  }) => {
    if (!src) return null;
    const resolved = mediaUrl(src) ?? src;
    const align = props['data-align'] ?? props.dataAlign ?? 'center';
    const alignCls =
      align === 'left'
        ? 'mr-auto ml-0 block'
        : align === 'right'
          ? 'ml-auto mr-0 block'
          : align === 'inline'
            ? 'inline-block align-middle mx-1'
            : 'mx-auto block';
    return (
      <img
        src={resolved}
        alt={alt ?? ''}
        width={width}
        height={height}
        style={{ width: width ?? '100%', height: height ?? 'auto', maxWidth: '100%' }}
        className={`my-4 rounded-lg border border-neutral-700 object-contain ${alignCls}`}
      />
    );
  },
  div: ({
    children,
    ...props
  }: {
    children?: ReactNode;
    'data-align'?: string;
    dataAlign?: string;
  }) => {
    const align = props['data-align'] ?? props.dataAlign;
    const cls =
      align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : '';
    return <div className={cls}>{children}</div>;
  },
  code: ({ children, className }: { children?: ReactNode; className?: string }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="rounded bg-violet-950/50 px-1 py-0.5 font-mono text-violet-300">{children}</code>
    ),
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="my-4 overflow-x-auto rounded-lg bg-neutral-950 p-4 text-neutral-200">{children}</pre>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="my-4 border-l-4 border-violet-500 pl-4 italic text-neutral-400">{children}</blockquote>
  ),
  hr: () => <hr className="my-6 border-neutral-700" />,
  del: ({ children }: { children?: ReactNode }) => (
    <del className="text-neutral-500">{children}</del>
  ),
  table: ({ children }: { children?: ReactNode }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="border border-neutral-700 bg-neutral-800 px-3 py-2 font-semibold">{children}</th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="border border-neutral-700 px-3 py-2 text-neutral-300">{children}</td>
  ),
};

function ToolBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="p-1.5 rounded text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-4 w-px bg-neutral-700" />;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write in Markdown…',
  enableImages = false,
  uploadModule = 'blog',
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<Tab>('write');
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [pendingImage, setPendingImage] = useState<{ url: string; alt: string } | null>(null);
  const [imageWidth, setImageWidth] = useState(60);
  const [imageAlign, setImageAlign] = useState<Align>('center');

  const stats = useMemo(() => {
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;
    return { words, chars: value.length };
  }, [value]);

  const apply = useCallback(
    (next: string, caretStart: number, caretEnd = caretStart) => {
      onChange(next);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(caretStart, caretEnd);
      });
    },
    [onChange]
  );

  const withSelection = useCallback(
    (
      mutator: (
        source: string,
        start: number,
        end: number
      ) => { next: string; caretStart: number; caretEnd?: number }
    ) => {
      const el = textareaRef.current;
      const start = el?.selectionStart ?? value.length;
      const end = el?.selectionEnd ?? value.length;
      const result = mutator(value, start, end);
      apply(result.next, result.caretStart, result.caretEnd ?? result.caretStart);
    },
    [apply, value]
  );

  const insertImageFile = useCallback(
    async (blob: Blob, filename: string) => {
      setCropFile(null);
      const toastId = toast.loading('Uploading image…');
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('module', uploadModule);
      const isSvg =
        filename.toLowerCase().endsWith('.svg') || blob.type === 'image/svg+xml';
      if (isSvg) formData.append('format', 'svg');
      else {
        formData.append('format', 'webp');
        formData.append('width', '1600');
      }
      try {
        const res = await api.post('/api/v1/admin/uploads/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const url = res.data.data.url as string;
        const alt = filename.replace(/\.[^.]+$/, '');
        setPendingImage({ url, alt });
        setImageWidth(60);
        setImageAlign('center');
        toast.success('Choose size and alignment', { id: toastId });
      } catch (error) {
        showApiError(error, 'Upload failed', { id: toastId });
      }
    },
    [uploadModule]
  );

  const acceptImageFile = useCallback(
    (file: File) => {
      const isSvg =
        file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
      if (isSvg) void insertImageFile(file, file.name);
      else setCropFile(file);
    },
    [insertImageFile]
  );

  const pickImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.svg,image/svg+xml';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) acceptImageFile(file);
    };
    input.click();
  };

  const insertLink = () => {
    const href = window.prompt('Link URL', 'https://');
    if (!href) return;
    withSelection((s, a, b) => {
      const selected = s.slice(a, b) || 'link text';
      const insert = `[${selected}](${href})`;
      return {
        next: s.slice(0, a) + insert + s.slice(b),
        caretStart: a + 1,
        caretEnd: a + 1 + selected.length,
      };
    });
  };

  const wrapAlign = (align: Align) => {
    withSelection((s, a, b) => {
      const selected = s.slice(a, b) || 'text';
      const insert = `\n<div data-align="${align}">\n\n${selected}\n\n</div>\n`;
      return {
        next: s.slice(0, a) + insert + s.slice(b),
        caretStart: a + insert.indexOf(selected),
        caretEnd: a + insert.indexOf(selected) + selected.length,
      };
    });
  };

  const confirmPendingImage = () => {
    if (!pendingImage) return;
    const tag = imageHtml(pendingImage.url, pendingImage.alt, imageWidth, imageAlign);
    withSelection((s, a, b) => insertAtCursor(s, a, b, `\n${tag}\n`));
    setPendingImage(null);
  };

  const insertHeading = (level: 2 | 3) => {
    const marks = '#'.repeat(level);
    withSelection((s, a) => {
      const { from, to } = lineRange(s, a);
      const line = s.slice(from, to).replace(/^#{1,6}\s*/, '');
      const nextLine = `${marks} ${line || 'Heading'}`;
      return {
        next: s.slice(0, from) + nextLine + s.slice(to),
        caretStart: from + marks.length + 1,
        caretEnd: from + nextLine.length,
      };
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      withSelection((s, a, b) => wrapSelection(s, a, b, '**'));
      return;
    }
    if (mod && e.key.toLowerCase() === 'i' && !e.shiftKey) {
      e.preventDefault();
      withSelection((s, a, b) => wrapSelection(s, a, b, '_'));
      return;
    }
    if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      insertLink();
      return;
    }
    if (mod && e.key === 'e') {
      e.preventDefault();
      withSelection((s, a, b) => wrapSelection(s, a, b, '`'));
      return;
    }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'i' && enableImages) {
      e.preventDefault();
      pickImage();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      withSelection((s, a, b) => indentLines(s, a, b, e.shiftKey));
      return;
    }
    if (e.key === 'Enter') {
      const el = e.currentTarget;
      const pos = el.selectionStart;
      if (pos !== el.selectionEnd) return;
      const { from, to } = lineRange(value, pos);
      const line = value.slice(from, to);
      const task = line.match(/^(\s*)[-*] \[([ xX])\] (.*)$/);
      const ul = line.match(/^(\s*)([-*]) (.*)$/);
      const ol = line.match(/^(\s*)(\d+)\. (.*)$/);
      const match = task || ul || ol;
      if (!match) return;
      const prefix = task
        ? `${task[1]}- [ ] `
        : ul
          ? `${ul[1]}${ul[2]} `
          : `${ol![1]}${Number(ol![2]) + 1}. `;
      const content = task ? task[3] : ul ? ul[3] : ol![3];
      e.preventDefault();
      if (!content.trim()) {
        apply(value.slice(0, from) + value.slice(to), from);
        return;
      }
      const insert = `\n${prefix}`;
      apply(value.slice(0, pos) + insert + value.slice(pos), pos + insert.length);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!enableImages) return;
    const file = [...e.clipboardData.files].find((item) => item.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    acceptImageFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLTextAreaElement>) => {
    if (!enableImages) return;
    const file = [...e.dataTransfer.files].find((item) => item.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    acceptImageFile(file);
  };

  const showEditor = tab === 'write' || tab === 'split';
  const showPreview = tab === 'preview' || tab === 'split';

  return (
    <div className="rounded-xl border border-neutral-700 overflow-hidden bg-neutral-900">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-neutral-800 bg-neutral-800/60">
        <ToolBtn title="Heading 2" onClick={() => insertHeading(2)}>
          <Heading2 size={15} />
        </ToolBtn>
        <ToolBtn title="Heading 3" onClick={() => insertHeading(3)}>
          <Heading3 size={15} />
        </ToolBtn>
        <Divider />
        <ToolBtn title="Bold (Ctrl+B)" onClick={() => withSelection((s, a, b) => wrapSelection(s, a, b, '**'))}>
          <Bold size={15} />
        </ToolBtn>
        <ToolBtn title="Italic (Ctrl+I)" onClick={() => withSelection((s, a, b) => wrapSelection(s, a, b, '_'))}>
          <Italic size={15} />
        </ToolBtn>
        <ToolBtn title="Strikethrough" onClick={() => withSelection((s, a, b) => wrapSelection(s, a, b, '~~'))}>
          <Strikethrough size={15} />
        </ToolBtn>
        <ToolBtn title="Inline code (Ctrl+E)" onClick={() => withSelection((s, a, b) => wrapSelection(s, a, b, '`'))}>
          <Code size={15} />
        </ToolBtn>
        <Divider />
        <ToolBtn
          title="Bullet list"
          onClick={() => withSelection((s, a, b) => insertAtCursor(s, a, b, `\n- ${s.slice(a, b) || 'item'}`))}
        >
          <List size={15} />
        </ToolBtn>
        <ToolBtn
          title="Numbered list"
          onClick={() => withSelection((s, a, b) => insertAtCursor(s, a, b, `\n1. ${s.slice(a, b) || 'item'}`))}
        >
          <ListOrdered size={15} />
        </ToolBtn>
        <ToolBtn
          title="Task list"
          onClick={() => withSelection((s, a, b) => insertAtCursor(s, a, b, `\n- [ ] ${s.slice(a, b) || 'task'}`))}
        >
          <ListTodo size={15} />
        </ToolBtn>
        <ToolBtn
          title="Quote"
          onClick={() => withSelection((s, a, b) => insertAtCursor(s, a, b, `\n> ${s.slice(a, b) || 'quote'}`))}
        >
          <Quote size={15} />
        </ToolBtn>
        <ToolBtn
          title="Code block"
          onClick={() =>
            withSelection((s, a, b) => {
              const selected = s.slice(a, b) || 'code';
              const insert = `\n\`\`\`ts\n${selected}\n\`\`\`\n`;
              return insertAtCursor(s, a, b, insert, { from: insert.indexOf('ts\n') + 3, to: insert.indexOf('ts\n') + 3 + selected.length });
            })
          }
        >
          <SquareCode size={15} />
        </ToolBtn>
        <Divider />
        <ToolBtn title="Link (Ctrl+K)" onClick={insertLink}>
          <LinkIcon size={15} />
        </ToolBtn>
        {enableImages && (
          <ToolBtn title="Image (Ctrl+Shift+I) — paste / drop, then size %" onClick={pickImage}>
            <ImageIcon size={15} />
          </ToolBtn>
        )}
        <ToolBtn title="Align selection left" onClick={() => wrapAlign('left')}>
          <AlignLeft size={15} />
        </ToolBtn>
        <ToolBtn title="Align selection center" onClick={() => wrapAlign('center')}>
          <AlignCenter size={15} />
        </ToolBtn>
        <ToolBtn title="Align selection right" onClick={() => wrapAlign('right')}>
          <AlignRight size={15} />
        </ToolBtn>
        <ToolBtn title="Divider" onClick={() => withSelection((s, a, b) => insertAtCursor(s, a, b, '\n\n---\n\n'))}>
          <Minus size={15} />
        </ToolBtn>
        <ToolBtn
          title="Table"
          onClick={() =>
            withSelection((s, a, b) =>
              insertAtCursor(
                s,
                a,
                b,
                '\n\n| Column | Column |\n| --- | --- |\n| Cell | Cell |\n\n'
              )
            )
          }
        >
          <TableIcon size={15} />
        </ToolBtn>

        <div className="ml-auto flex rounded-lg overflow-hidden border border-neutral-700">
          {(['write', 'split', 'preview'] as Tab[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`px-2.5 py-1 text-[11px] capitalize ${
                tab === item ? 'bg-violet-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className={tab === 'split' ? 'grid md:grid-cols-2' : ''}>
        {showEditor && (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e) => enableImages && e.preventDefault()}
            rows={18}
            placeholder={placeholder}
            className={`w-full px-4 py-3 bg-neutral-900 text-sm text-neutral-100 font-mono leading-6 resize-y min-h-70 focus:outline-none ${
              tab === 'split' ? 'border-r border-neutral-800 min-h-96' : ''
            }`}
          />
        )}
        {showPreview && (
          <div className={`px-4 py-3 min-h-70 text-sm text-neutral-200 overflow-auto ${tab === 'split' ? 'min-h-96' : ''}`}>
            <Markdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, [rehypeSanitize, previewSanitizeSchema]]}
              components={previewComponents}
            >
              {value || '*Nothing to preview*'}
            </Markdown>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 border-t border-neutral-800 text-[11px] text-neutral-500 font-mono">
        <span>
          {stats.words} words · {stats.chars} chars
        </span>
        <span>
          {enableImages ? 'Images: width % + align (HTML, kept on sync) · ' : ''}
          Ctrl+B / I / K / E
        </span>
      </div>

      {pendingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-700 bg-neutral-900 p-4 shadow-xl">
            <p className="mb-3 text-sm font-medium text-neutral-100">Image layout</p>
            <img
              src={mediaUrl(pendingImage.url) ?? pendingImage.url}
              alt={pendingImage.alt}
              className="mb-4 max-h-40 w-full rounded-lg border border-neutral-800 object-contain"
            />
            <label className="mb-1 block text-xs text-neutral-400">Width</label>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {WIDTH_PRESETS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setImageWidth(pct)}
                  className={`rounded-lg px-2.5 py-1 text-xs ${
                    imageWidth === pct ? 'bg-violet-600 text-white' : 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <label className="mb-1 block text-xs text-neutral-400">Align</label>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {(['inline', 'left', 'center', 'right'] as Align[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setImageAlign(item)}
                  className={`rounded-lg px-2.5 py-1 text-xs capitalize ${
                    imageAlign === item ? 'bg-violet-600 text-white' : 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <p className="mb-4 text-[11px] text-neutral-500">
              Height stays auto so the image is not stretched. Stored as HTML so Git sync keeps size and align.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                onClick={() => setPendingImage(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white"
                onClick={confirmPendingImage}
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {cropFile && (
        <ImageCropModal
          file={cropFile}
          aspect={16 / 9}
          lockAspect={false}
          title="Crop image"
          onConfirm={insertImageFile}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  );
}
