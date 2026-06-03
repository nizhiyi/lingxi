import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Terminal, Search, Pencil, Eye, Globe,
  ChevronDown, ChevronRight, Clock, Check, Loader2, X as XIcon,
  Copy, FolderTree,
} from 'lucide-react';
import { cn } from '../../ui/cn';

const TOOL_CATEGORIES = {
  Read: { icon: Eye, color: 'blue', label: 'Read' },
  Write: { icon: FileText, color: 'purple', label: 'Write' },
  Edit: { icon: Pencil, color: 'purple', label: 'Edit' },
  MultiEdit: { icon: Pencil, color: 'purple', label: 'MultiEdit' },
  Shell: { icon: Terminal, color: 'emerald', label: 'Shell' },
  Bash: { icon: Terminal, color: 'emerald', label: 'Bash' },
  Grep: { icon: Search, color: 'amber', label: 'Grep' },
  Glob: { icon: FolderTree, color: 'amber', label: 'Glob' },
  WebFetch: { icon: Globe, color: 'sky', label: 'WebFetch' },
  WebSearch: { icon: Globe, color: 'sky', label: 'WebSearch' },
  Task: { icon: FolderTree, color: 'indigo', label: 'Task' },
};

const COLOR_MAP = {
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', glow: 'shadow-blue-500/10' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', glow: 'shadow-purple-500/10' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', glow: 'shadow-amber-500/10' },
  sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-400', glow: 'shadow-sky-500/10' },
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', glow: 'shadow-indigo-500/10' },
};

function getToolMeta(name) {
  const normalized = (name || '').replace(/^(coding_)?/, '');
  for (const [key, val] of Object.entries(TOOL_CATEGORIES)) {
    if (normalized.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return { icon: Terminal, color: 'blue', label: name || 'Tool' };
}

export function ToolCallCard({ block }) {
  const [expanded, setExpanded] = useState(false);
  const name = block.name || block.toolName || '';
  const meta = getToolMeta(name);
  const Icon = meta.icon;
  const colors = COLOR_MAP[meta.color] || COLOR_MAP.blue;
  const isRunning = !block.done && !block.error;
  const duration = block.duration ? `${(block.duration / 1000).toFixed(1)}s` : null;

  const input = block.fullInput || block.input || '';
  const result = block.result || '';

  // Extract useful info for display
  let summary = '';
  try {
    const inp = typeof input === 'string' ? JSON.parse(input) : input;
    if (inp.command) summary = inp.command;
    else if (inp.file_path || inp.path) summary = inp.file_path || inp.path;
    else if (inp.pattern) summary = `/${inp.pattern}/`;
    else if (inp.description) summary = inp.description;
  } catch {
    if (typeof input === 'string' && input.length < 100) summary = input;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'rounded-lg border overflow-hidden transition-all duration-200',
        colors.border,
        isRunning && 'shadow-md ' + colors.glow,
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
          colors.bg, 'hover:opacity-90'
        )}
      >
        {/* Status icon */}
        {isRunning ? (
          <Loader2 size={13} className={cn('animate-spin', colors.text)} />
        ) : block.error ? (
          <XIcon size={13} className="text-[var(--cx-error)]" />
        ) : (
          <Check size={13} className="text-[var(--cx-success)]" />
        )}

        {/* Tool icon & name */}
        <Icon size={13} className={colors.text} />
        <span className={cn('text-[11px] font-semibold', colors.text)}>{meta.label}</span>

        {/* Summary */}
        {summary && (
          <span className="flex-1 text-[11px] text-[var(--cx-text-3)] truncate font-mono ml-1">
            {summary}
          </span>
        )}

        {/* Duration */}
        {duration && (
          <span className="text-[10px] text-[var(--cx-text-3)] flex items-center gap-0.5">
            <Clock size={9} />
            {duration}
          </span>
        )}

        {/* Expand indicator */}
        {expanded ? <ChevronDown size={12} className="text-[var(--cx-text-3)]" /> : <ChevronRight size={12} className="text-[var(--cx-text-3)]" />}
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-2 space-y-2 border-t border-[var(--cx-border)] bg-[var(--cx-bg)]">
              {/* Input */}
              {input && (
                <div>
                  <div className="text-[10px] font-semibold text-[var(--cx-text-3)] uppercase mb-1">Input</div>
                  <pre className="text-[11px] font-mono text-[var(--cx-text-2)] bg-[var(--cx-surface-2)] rounded-md p-2 overflow-x-auto max-h-[150px] overflow-y-auto whitespace-pre-wrap">
                    {typeof input === 'string' ? input : JSON.stringify(input, null, 2)}
                  </pre>
                </div>
              )}
              {/* Result */}
              {result && (
                <div>
                  <div className="text-[10px] font-semibold text-[var(--cx-text-3)] uppercase mb-1">Output</div>
                  <pre className="text-[11px] font-mono text-[var(--cx-text-2)] bg-[var(--cx-surface-2)] rounded-md p-2 overflow-x-auto max-h-[150px] overflow-y-auto whitespace-pre-wrap">
                    {typeof result === 'string' ? result.slice(0, 2000) : JSON.stringify(result, null, 2).slice(0, 2000)}
                  </pre>
                </div>
              )}
              {/* File diff */}
              {block.fileDiff && (
                <div>
                  <div className="text-[10px] font-semibold text-[var(--cx-text-3)] uppercase mb-1">Diff: {block.fileDiff.file}</div>
                  <pre className="text-[10px] font-mono bg-[var(--cx-surface-2)] rounded-md p-2 overflow-x-auto max-h-[200px] overflow-y-auto">
                    {(block.fileDiff.diff || '').split('\n').map((line, i) => (
                      <div key={i} className={cn(
                        line.startsWith('+') && !line.startsWith('+++') ? 'text-[var(--cx-success)]' :
                        line.startsWith('-') && !line.startsWith('---') ? 'text-[var(--cx-error)]' :
                        'text-[var(--cx-text-3)]'
                      )}>
                        {line}
                      </div>
                    ))}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
