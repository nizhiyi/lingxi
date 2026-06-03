import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Zap, Clock } from 'lucide-react';
import { cn } from '../../ui/cn';
import { ToolCallCard } from './ToolCallCard';

export function ToolGroupCard({ tools, groupName }) {
  const [expanded, setExpanded] = useState(tools.length <= 3);

  if (!tools || tools.length === 0) return null;

  // Single tool: render directly
  if (tools.length === 1) {
    return <ToolCallCard block={tools[0]} />;
  }

  const allDone = tools.every(t => t.done);
  const totalMs = tools.reduce((sum, t) => sum + (t.ms || 0), 0);

  return (
    <div className="rounded-lg border border-[var(--cx-border)] overflow-hidden">
      {/* Summary header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-[var(--cx-surface-2)] hover:bg-[var(--cx-surface-3)] transition-colors"
      >
        <Zap size={12} className="text-[var(--cx-accent)]" />
        <span className="text-[11px] font-semibold text-[var(--cx-text-2)]">
          {groupName || tools[0]?.name || 'Tools'} ×{tools.length}
        </span>
        <div className="flex-1" />
        {totalMs > 0 && (
          <span className="text-[10px] text-[var(--cx-text-3)] flex items-center gap-0.5">
            <Clock size={9} />
            {(totalMs / 1000).toFixed(1)}s
          </span>
        )}
        {allDone && <span className="w-1.5 h-1.5 rounded-full bg-[var(--cx-success)]" />}
        {expanded ? <ChevronDown size={11} className="text-[var(--cx-text-3)]" /> : <ChevronRight size={11} className="text-[var(--cx-text-3)]" />}
      </button>

      {/* Expanded: show individual tools */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-2 space-y-1.5 border-t border-[var(--cx-border)]">
              {tools.map((tool, i) => (
                <ToolCallCard key={i} block={tool} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
