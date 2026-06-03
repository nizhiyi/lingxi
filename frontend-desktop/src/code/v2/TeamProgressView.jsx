import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Bot, CheckCircle2, Loader2, Square, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../ui/cn';

function AgentStream({ agent }) {
  const [expanded, setExpanded] = useState(true);
  const isWorking = agent.status === 'working' || agent.status === 'running';
  const isDone = agent.status === 'done' || agent.status === 'completed';

  return (
    <div className={cn(
      'rounded-lg border overflow-hidden',
      isWorking ? 'border-[var(--cx-accent)]/30' : isDone ? 'border-[var(--cx-success)]/30' : 'border-[var(--cx-border)]'
    )}>
      {/* Agent header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-[var(--cx-surface-2)] hover:bg-[var(--cx-surface-3)] transition-colors"
      >
        <Bot size={13} className={cn(
          isWorking ? 'text-[var(--cx-accent)]' : isDone ? 'text-[var(--cx-success)]' : 'text-[var(--cx-text-3)]'
        )} />
        <span className="text-[11px] font-semibold text-[var(--cx-text)] flex-1 text-left truncate">
          {agent.name || agent.role || 'Agent'}
        </span>
        {isWorking && <Loader2 size={11} className="text-[var(--cx-accent)] animate-spin" />}
        {isDone && <CheckCircle2 size={11} className="text-[var(--cx-success)]" />}
        {expanded ? <ChevronDown size={11} className="text-[var(--cx-text-3)]" /> : <ChevronRight size={11} className="text-[var(--cx-text-3)]" />}
      </button>

      {/* Agent output */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-2 bg-[var(--cx-bg)] max-h-[200px] overflow-y-auto scrollable">
              {agent.output ? (
                <pre className="text-[11px] font-mono text-[var(--cx-text-2)] whitespace-pre-wrap">
                  {agent.output}
                </pre>
              ) : isWorking ? (
                <div className="flex items-center gap-2 py-2">
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map(i => (
                      <motion.span
                        key={i}
                        className="w-1 h-1 rounded-full bg-[var(--cx-accent)]"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-[var(--cx-text-3)]">Working…</span>
                </div>
              ) : (
                <span className="text-[10px] text-[var(--cx-text-3)]">Waiting to start</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TeamProgressView({ team, onStop }) {
  if (!team) return null;

  const agents = team.agents || [];
  const completed = agents.filter(a => a.status === 'done' || a.status === 'completed').length;
  const total = agents.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const allDone = completed === total;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--cx-border)] bg-[var(--cx-surface)]">
        <Users size={16} className="text-[var(--cx-purple)]" />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-[var(--cx-text)]">
            Agent Teams — {allDone ? 'Complete' : 'In Progress'}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 rounded-full bg-[var(--cx-surface-3)] overflow-hidden max-w-[200px]">
              <motion.div
                className="h-full rounded-full bg-[var(--cx-purple)]"
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 30 }}
              />
            </div>
            <span className="text-[10px] text-[var(--cx-text-3)] tabular-nums">{completed}/{total}</span>
          </div>
        </div>
        {!allDone && (
          <button
            onClick={onStop}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--cx-error)]/15 text-[var(--cx-error)] text-[11px] font-medium hover:bg-[var(--cx-error)]/25 transition-colors"
          >
            <Square size={11} />
            Stop
          </button>
        )}
      </div>

      {/* Agent streams */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollable">
        {agents.map((agent, i) => (
          <AgentStream key={agent.id || i} agent={agent} />
        ))}
      </div>

      {/* Summary when done */}
      {allDone && team.summary && (
        <div className="px-4 py-3 border-t border-[var(--cx-border)] bg-[var(--cx-surface-2)]">
          <div className="text-[11px] font-semibold text-[var(--cx-success)] mb-1">Team Summary</div>
          <div className="text-[12px] text-[var(--cx-text-2)]">{team.summary}</div>
        </div>
      )}
    </div>
  );
}
