import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, RotateCcw, FileText, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { cn } from '../../ui/cn';
import { useStore } from '../../state/useStore';
import { api } from '../../api/client';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function CheckpointTimeline() {
  const checkpoints = useStore((s) => s.codingCheckpoints) || [];
  const activeSessionId = useStore((s) => s.activeSessionId);
  const [rolling, setRolling] = useState(null);
  const [expanded, setExpanded] = useState(false);

  if (checkpoints.length === 0) return null;

  const handleRollback = async (cp) => {
    if (!activeSessionId || !cp.id) return;
    setRolling(cp.id);
    try {
      await api.rewindCheckpoint?.(activeSessionId, cp.id);
    } catch { /* ignore */ }
    setRolling(null);
  };

  return (
    <div className="border-b border-[var(--cx-border)] bg-[var(--cx-surface)]">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[var(--cx-surface-2)] transition-colors"
      >
        <History size={13} className="text-[var(--cx-accent)]" />
        <span className="text-[11px] font-semibold text-[var(--cx-text-2)]">
          Checkpoints ({checkpoints.length})
        </span>
        <div className="flex-1" />
        {expanded ? <ChevronDown size={11} className="text-[var(--cx-text-3)]" /> : <ChevronRight size={11} className="text-[var(--cx-text-3)]" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1">
              {[...checkpoints].reverse().map((cp, i) => (
                <div
                  key={cp.id || i}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--cx-surface-2)] transition-colors group"
                >
                  {/* Timeline dot */}
                  <div className="relative flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-[var(--cx-accent)]" />
                    {i < checkpoints.length - 1 && (
                      <div className="w-px h-4 bg-[var(--cx-border)] mt-0.5" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} className="text-[var(--cx-text-3)]" />
                      <span className="text-[10px] font-mono text-[var(--cx-text-2)]">
                        {formatTime(cp.created_at)}
                      </span>
                      {cp.files_count > 0 && (
                        <span className="text-[9px] text-[var(--cx-text-3)] flex items-center gap-0.5">
                          <FileText size={8} />
                          {cp.files_count} files
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rollback button */}
                  <button
                    onClick={() => handleRollback(cp)}
                    disabled={rolling === cp.id}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--cx-warning)]/15 text-[var(--cx-warning)] text-[10px] font-medium hover:bg-[var(--cx-warning)]/25 transition-all"
                  >
                    <RotateCcw size={10} className={cn(rolling === cp.id && 'animate-spin')} />
                    Rollback
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
