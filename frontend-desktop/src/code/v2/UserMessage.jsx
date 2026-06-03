import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Copy, Check, Pencil, FileText, Folder, MessageCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../ui/cn';

function parseFileRefs(text) {
  const refs = [];
  const atRe = /@([^\s]+)/g;
  const dirRe = /\[目录:\s*([^\]]+)\]/g;
  let m;
  while ((m = atRe.exec(text)) !== null) refs.push({ type: 'file', path: m[1] });
  while ((m = dirRe.exec(text)) !== null) refs.push({ type: 'dir', path: m[1] });
  return refs;
}

function cleanText(text) {
  return text
    .replace(/@[^\s]+/g, '')
    .replace(/\[目录:\s*[^\]]+\]/g, '')
    .trim();
}

function tryParseContent(content) {
  if (typeof content !== 'string') return null;
  try {
    if (content.startsWith('{')) {
      return JSON.parse(content);
    }
  } catch { /* ignore */ }
  return null;
}

function AskQuestionReplyView({ data }) {
  const items = data.items || [];
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--cx-accent)] font-medium">
        <CheckCircle2 size={13} />
        <span>已回答 {items.length} 个问题</span>
      </div>
      {items.map((item, i) => {
        const selectedOpt = item.options?.find(opt => opt.label === item.answer);
        return (
          <div key={i} className="rounded-lg border border-[var(--cx-border)] bg-[var(--cx-surface-2)] overflow-hidden">
            <div className="px-3 py-2 border-b border-[var(--cx-border)] bg-[var(--cx-surface-3)]">
              <span className="text-[11px] text-[var(--cx-text-2)] font-medium">{item.question}</span>
            </div>
            <div className="px-3 py-2">
              {item.answer ? (
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--cx-accent-soft)] border border-[var(--cx-accent)]/30 text-[11px] text-[var(--cx-accent)] font-medium">
                    <CheckCircle2 size={10} />
                    {item.answer}
                  </span>
                  {selectedOpt?.description && (
                    <p className="text-[10px] text-[var(--cx-text-3)] pl-1 mt-1">{selectedOpt.description}</p>
                  )}
                </div>
              ) : (
                <span className="text-[11px] text-[var(--cx-text-3)]">（未回答）</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function UserMessage({ message }) {
  const [copied, setCopied] = useState(false);
  const text = typeof message.content === 'string' ? message.content : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parsed = tryParseContent(text);

  // Handle ask_question_reply type
  if (parsed?.type === 'ask_question_reply') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="group flex gap-3 py-2"
      >
        <div className="w-7 h-7 rounded-lg bg-[var(--cx-accent)] flex items-center justify-center shrink-0 mt-0.5">
          <User size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <AskQuestionReplyView data={parsed} />
          <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-1">
            <button onClick={handleCopy} className="p-1 rounded hover:bg-[var(--cx-surface-2)] text-[var(--cx-text-3)]">
              {copied ? <Check size={12} className="text-[var(--cx-success)]" /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Handle permission reply type
  if (parsed?.type === 'permission_reply') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="group flex gap-3 py-2"
      >
        <div className="w-7 h-7 rounded-lg bg-[var(--cx-accent)] flex items-center justify-center shrink-0 mt-0.5">
          <User size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-[12px] text-green-400 font-medium">
            <CheckCircle2 size={13} />
            已授权操作
          </div>
        </div>
      </motion.div>
    );
  }

  // Normal text message
  const refs = parseFileRefs(text);
  const cleanedText = cleanText(text);

  let parsedImages = [];
  if (parsed?.images) parsedImages = parsed.images;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex gap-3 py-2"
    >
      {/* Avatar */}
      <div className="w-7 h-7 rounded-lg bg-[var(--cx-accent)] flex items-center justify-center shrink-0 mt-0.5">
        <User size={14} className="text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* File refs */}
        {refs.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {refs.map((r, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--cx-surface-2)] border border-[var(--cx-border)] text-[10px] text-[var(--cx-text-2)]">
                {r.type === 'dir' ? <Folder size={10} /> : <FileText size={10} />}
                <span className="truncate max-w-[120px] font-mono">{r.path.split('/').pop()}</span>
              </span>
            ))}
          </div>
        )}

        {/* Text content */}
        {cleanedText && (
          <div className="text-[13px] leading-relaxed text-[var(--cx-text)] whitespace-pre-wrap break-words">
            {cleanedText}
          </div>
        )}

        {/* Images */}
        {parsedImages.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {parsedImages.map((img, i) => (
              <img
                key={i}
                src={`data:${img.mediaType || 'image/png'};base64,${img.data}`}
                className="w-20 h-20 object-cover rounded-lg border border-[var(--cx-border)]"
              />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-1">
          <button onClick={handleCopy} className="p-1 rounded hover:bg-[var(--cx-surface-2)] text-[var(--cx-text-3)]">
            {copied ? <Check size={12} className="text-[var(--cx-success)]" /> : <Copy size={12} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
