import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, Square, ChevronRight } from 'lucide-react';
import { cn } from '../ui/cn';
import { useStore } from '../state/useStore';

export const CodeComposer = forwardRef(function CodeComposer({ onSend, disabled }, ref) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const isStreaming = useStore((s) => s.isStreaming);
  const abort = useStore((s) => s.abort);

  useImperativeHandle(ref, () => ({
    insertText: (str) => {
      setText((prev) => prev + str);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          autoResize(textareaRef.current);
        }
      }, 0);
    },
    focus: () => textareaRef.current?.focus(),
  }), []);

  useEffect(() => {
    if (!isStreaming && textareaRef.current) textareaRef.current.focus();
  }, [isStreaming]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [text, onSend, disabled]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const filePath = e.dataTransfer.getData('text/plain');
    if (filePath) {
      setText((prev) => prev + `@${filePath} `);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          autoResize(textareaRef.current);
        }
      }, 0);
    }
  }, []);

  return (
    <div className="border-t border-[#2a2a2a] bg-[#161616]">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div
          className={cn(
            'flex items-end gap-2 rounded-lg border px-3 py-2 transition',
            'border-[#333] bg-[#1e1e1e]',
            'focus-within:border-[#555]',
          )}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <ChevronRight size={14} className="text-emerald-500 shrink-0 mt-1 font-bold" />
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? 'Agent 正在工作...' : '输入指令... (Enter 发送, Shift+Enter 换行, 拖拽文件到此处)'}
            disabled={isStreaming}
            rows={1}
            className={cn(
              'flex-1 bg-transparent text-sm text-[#e0e0e0] placeholder-[#555]',
              'resize-none outline-none font-mono min-h-[20px] max-h-[200px]',
              'leading-relaxed',
            )}
            style={{ height: 'auto', overflow: 'hidden' }}
            onInput={(e) => autoResize(e.target)}
          />
          {isStreaming ? (
            <button
              onClick={abort}
              className="p-1.5 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 transition shrink-0"
              title="中止"
            >
              <Square size={14} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className={cn(
                'p-1.5 rounded-md transition shrink-0',
                text.trim()
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                  : 'text-[#444] cursor-default'
              )}
              title="发送 (Enter)"
            >
              <Send size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

function autoResize(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}
