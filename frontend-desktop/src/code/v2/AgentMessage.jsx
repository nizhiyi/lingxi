import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Highlight, themes } from 'prism-react-renderer';
import {
  Bot, ChevronDown, ChevronRight, Copy, Check, Brain,
} from 'lucide-react';
import { cn } from '../../ui/cn';
import { ToolCallCard } from './ToolCallCard';

function ThinkingBlock({ text, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!text) return null;
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-[11px] text-[var(--cx-purple)] hover:text-[var(--cx-purple)]/80 transition-colors"
      >
        <Brain size={12} />
        <span className="font-medium">Thinking</span>
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 pl-3 border-l-2 border-[var(--cx-purple)]/30 text-[12px] text-[var(--cx-text-3)] leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
              {text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CodeBlock({ children, className: lang }) {
  const [copied, setCopied] = useState(false);
  const language = (lang || '').replace('language-', '');
  const code = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/code my-2 rounded-lg overflow-hidden border border-[var(--cx-border)]" style={{ background: '#011627' }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10" style={{ background: '#01223a' }}>
        <span className="text-[10px] font-mono" style={{ color: '#7fdbca' }}>{language || 'text'}</span>
        <button onClick={handleCopy} className="p-1 rounded hover:bg-white/10" style={{ color: '#80a4c2' }}>
          {copied ? <Check size={11} style={{ color: '#addb67' }} /> : <Copy size={11} />}
        </button>
      </div>
      <Highlight theme={themes.nightOwl} code={code} language={language || 'text'}>
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre className="overflow-x-auto p-3 text-[12px] leading-5" style={{ ...style, background: '#011627' }}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                <span className="inline-block w-8 text-right mr-3 select-none text-[10px]" style={{ color: '#4a6a8a' }}>{i + 1}</span>
                {line.map((token, j) => <span key={j} {...getTokenProps({ token })} />)}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

const mdComponents = {
  code({ inline, className, children, ...props }) {
    if (inline) {
      return <code className="px-1.5 py-0.5 rounded bg-[var(--cx-surface-2)] text-[var(--cx-accent)] text-[12px] font-mono" {...props}>{children}</code>;
    }
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
  p({ children }) { return <p className="mb-2 last:mb-0">{children}</p>; },
  ul({ children }) { return <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>; },
  ol({ children }) { return <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>; },
  h1({ children }) { return <h1 className="text-[16px] font-bold mb-2 mt-3">{children}</h1>; },
  h2({ children }) { return <h2 className="text-[15px] font-bold mb-2 mt-3">{children}</h2>; },
  h3({ children }) { return <h3 className="text-[14px] font-semibold mb-1.5 mt-2">{children}</h3>; },
  table({ children }) { return <div className="overflow-x-auto my-2"><table className="text-[12px] border-collapse w-full">{children}</table></div>; },
  th({ children }) { return <th className="border border-[var(--cx-border)] px-2 py-1 bg-[var(--cx-surface-2)] text-left font-semibold">{children}</th>; },
  td({ children }) { return <td className="border border-[var(--cx-border)] px-2 py-1">{children}</td>; },
  blockquote({ children }) { return <blockquote className="border-l-3 border-[var(--cx-accent)] pl-3 my-2 text-[var(--cx-text-2)] italic">{children}</blockquote>; },
};

export function AgentMessage({ message, live, blocks: liveBlocksProp }) {
  const [copied, setCopied] = useState(false);

  const content = useMemo(() => {
    if (live && liveBlocksProp) return liveBlocksProp;
    if (!message) return [];
    const raw = message.content || '';
    if (message.blocks) return message.blocks;
    if (typeof raw === 'string') {
      // Try parse as JSON array of blocks
      if (raw.startsWith('[')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        } catch { /* fallback to text */ }
      }
      return [{ type: 'text', text: raw }];
    }
    return Array.isArray(raw) ? raw : [{ type: 'text', text: String(raw) }];
  }, [message, live, liveBlocksProp]);

  const fullText = content.filter(b => b.type === 'text').map(b => b.text || '').join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex gap-3 py-2"
    >
      {/* Avatar */}
      <div className="w-7 h-7 rounded-lg bg-[var(--cx-surface-2)] border border-[var(--cx-border)] flex items-center justify-center shrink-0 mt-0.5">
        <Bot size={14} className="text-[var(--cx-accent)]" />
      </div>

      {/* Content — rendered in original order */}
      <div className="flex-1 min-w-0 space-y-2">
        {content.map((block, i) => {
          switch (block.type) {
            case 'thinking':
              return <ThinkingBlock key={`think-${i}`} text={block.text} defaultOpen={live} />;
            case 'tool':
              return <ToolCallCard key={`tool-${i}`} block={block} />;
            case 'text':
              return block.text ? (
                <div key={`text-${i}`} className="text-[13px] leading-relaxed text-[var(--cx-text)] prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {block.text}
                  </ReactMarkdown>
                </div>
              ) : null;
            default:
              return null;
          }
        })}

        {/* Actions */}
        {!live && fullText && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <button onClick={handleCopy} className="p-1 rounded hover:bg-[var(--cx-surface-2)] text-[var(--cx-text-3)]">
              {copied ? <Check size={12} className="text-[var(--cx-success)]" /> : <Copy size={12} />}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
