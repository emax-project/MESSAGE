import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export type BoardEditorRef = { focus: () => void };

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  isDark: boolean;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  minHeight?: number;
  compact?: boolean;
};

const BoardEditor = forwardRef<BoardEditorRef, Props>(function BoardEditor({
  value,
  onChange,
  placeholder = '글 작성 (Shift+Enter)',
  isDark,
  disabled = false,
  onKeyDown,
  minHeight = 42,
  compact = false,
}, ref) {
  const isInternalChange = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'board-editor-prose',
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          onKeyDown?.(event as unknown as React.KeyboardEvent);
          return true;
        }
        if (event.key === 'Escape') {
          onKeyDown?.(event as unknown as React.KeyboardEvent);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      isInternalChange.current = true;
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  // Sync value from parent (e.g. when editing a message)
  useEffect(() => {
    if (!editor) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    const current = editor.getHTML();
    const normalized = value
      ? (/<[a-z][\s\S]*>/i.test(value) ? value : `<p>${value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`)
      : '<p></p>';
    if (current !== normalized) {
      editor.commands.setContent(normalized, { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useImperativeHandle(ref, () => ({
    focus: () => editor?.commands.focus(),
  }), [editor]);

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const border = isDark ? '#475569' : '#e2e8f0';
  const text = isDark ? '#e2e8f0' : '#1e293b';
  const placeholderColor = isDark ? '#64748b' : '#94a3b8';

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        minHeight,
        maxHeight: 200,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: compact ? '8px 12px' : '10px 18px',
        border: `1px solid ${border}`,
        borderRadius: compact ? 18 : 20,
        background: bg,
        color: text,
      }}
      className="board-editor-wrap"
      data-dark={isDark ? 'true' : 'false'}
      data-compact={compact ? 'true' : 'false'}
    >
      <style>{`
        .board-editor-wrap .ProseMirror {
          outline: none;
          min-height: ${minHeight - 20}px;
          font-size: ${compact ? 13 : 14}px;
          line-height: 1.4;
        }
        .board-editor-wrap .ProseMirror p { margin: 0 0 8px 0; }
        .board-editor-wrap .ProseMirror p:last-child { margin-bottom: 0; }
        .board-editor-wrap .ProseMirror h1 { font-size: 1.25em; font-weight: 700; margin: 12px 0 8px 0; }
        .board-editor-wrap .ProseMirror h2 { font-size: 1.1em; font-weight: 600; margin: 10px 0 6px 0; }
        .board-editor-wrap .ProseMirror h3 { font-size: 1em; font-weight: 600; margin: 8px 0 4px 0; }
        .board-editor-wrap .ProseMirror ul, .board-editor-wrap .ProseMirror ol { margin: 8px 0; padding-left: 24px; }
        .board-editor-wrap .ProseMirror li { margin: 2px 0; }
        .board-editor-wrap .ProseMirror code { background: rgba(0,0,0,0.08); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
        .board-editor-wrap[data-dark="true"] .ProseMirror code { background: rgba(255,255,255,0.1); }
        .board-editor-wrap .ProseMirror pre { background: rgba(0,0,0,0.06); padding: 12px; border-radius: 8px; overflow-x: auto; margin: 8px 0; }
        .board-editor-wrap[data-dark="true"] .ProseMirror pre { background: rgba(255,255,255,0.06); }
        .board-editor-wrap .ProseMirror pre code { background: none; padding: 0; }
        .board-editor-wrap .ProseMirror p.is-editor-empty:first-child {
          overflow: hidden;
        }
        .board-editor-wrap .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: ${placeholderColor};
          float: left;
          pointer-events: none;
          height: 0;
          max-width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
      <EditorContent editor={editor} />
    </div>
  );
});

export default BoardEditor;
