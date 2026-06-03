import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Brain, Eye, Terminal as TermIcon, Clock } from 'lucide-react';
import { cn } from '../../ui/cn';

const STATE_META = {
  THINKING: { icon: Brain, label: 'Thinking', color: 'var(--cx-purple)' },
  READING: { icon: Eye, label: 'Reading', color: 'var(--cx-accent)' },
  EXECUTING: { icon: TermIcon, label: 'Executing', color: 'var(--cx-success)' },
  AWAITING_PERMISSION: { icon: Clock, label: 'Awaiting approval', color: 'var(--cx-warning)' },
};

export function ThinkingIndicator({ state, startedAt }) {
  const [elapsed, setElapsed] = useState(0);
  const meta = STATE_META[state] || STATE_META.THINKING;
  const Icon = meta.icon;

  useEffect(() => {
    const start = startedAt || Date.now();
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [startedAt]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 py-3"
    >
      {/* Avatar with pulse */}
      <div className="relative w-7 h-7 rounded-lg bg-[var(--cx-surface-2)] border border-[var(--cx-border)] flex items-center justify-center shrink-0">
        <Bot size={14} className="text-[var(--cx-accent)]" />
        <span
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-pulse"
          style={{ backgroundColor: meta.color }}
        />
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <Icon size={13} style={{ color: meta.color }} />
        <span className="text-[12px] font-medium" style={{ color: meta.color }}>
          {meta.label}
        </span>

        {/* Dots animation */}
        <div className="flex gap-0.5">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: meta.color }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
            />
          ))}
        </div>

        {/* Timer */}
        {elapsed > 0 && (
          <span className="text-[10px] text-[var(--cx-text-3)] tabular-nums">
            {elapsed}s
          </span>
        )}
      </div>
    </motion.div>
  );
}
