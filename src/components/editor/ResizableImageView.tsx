import { useCallback, useRef } from 'react';
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';

export function ResizableImageView({
  node,
  updateAttributes,
  selected,
}: ReactNodeViewProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);

  const onResize = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const wrap = wrapRef.current;
      if (!wrap) return;

      const editorEl = wrap.closest('.tiptap') as HTMLElement | null;
      const editorW = editorEl?.clientWidth || wrap.parentElement?.clientWidth || 1;
      const startX = event.clientX;
      const startW = wrap.getBoundingClientRect().width;

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const pct = Math.round(Math.min(100, Math.max(12, ((startW + dx) / editorW) * 100)));
        updateAttributes({ width: `${pct}%` });
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [updateAttributes]
  );

  const width = node.attrs.width || '40%';
  const align = node.attrs['data-align'] || 'inline';

  return (
    <NodeViewWrapper
      as="span"
      className={`tiptap-image${selected ? ' is-selected' : ''}`}
      data-align={align}
      data-drag-handle
      style={{ width }}
    >
      <span ref={wrapRef} className="tiptap-image-inner">
        <img src={node.attrs.src} alt={node.attrs.alt || ''} draggable={false} />
        {selected && (
          <span
            className="tiptap-image-handle"
            onMouseDown={onResize}
            title="Drag to resize"
          />
        )}
      </span>
    </NodeViewWrapper>
  );
}
