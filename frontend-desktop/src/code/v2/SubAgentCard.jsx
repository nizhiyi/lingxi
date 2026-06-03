import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ChevronDown, ChevronRight, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../../ui/cn';

function AgentStatusPill({ status }) {
  const config = {
    working: { label: 'Working', color: 'var(--cx-accent)', animate: true },
    done: { label: 'Done', color: 'var(--cx-success)', animate: false },
    error: { label: 'Error', color: 'var(--cx-error)', animate: false },
    idle: { label: 'Idle', color: 'var(--cx-text-3)', animate: false },
  };
  const c = config[status] || config.idle;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold" style={{ color: c.color, backgroundColor: `${c.color}15` }}>
      {c.animate && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: c.color }} />}
      {c.label}
    </span>
  );
}

function SingleAgent({ agent, depth = 0, allAgents }) {
  const [expanded, setExpanded] = useState(agent.status === 'working');
  const children = allAgents.filter(a => a.parent_id === agent.id);
  const activities = agent.toolActivities || [];
  const recentActivities = activities.slice(-5);

  return (
    <div className={cn('relative', depth > 0 && 'ml-4')}>
      {/* Connector line */}
      {depth > 0 && (
        <div className="absolute left-[-12px] top-0 bottom-0 w-px border-l border-dashed border-[var(--cx-border)]" />
      )}
      {depth > 0 && (
        <div className="absolute left-[-12px] top-4 w-3 h-px border-t border-dashed border-[var(--cx-border)]" />
      )}

      <div className={cn(
        'rounded-lg border overflow-hidden mb-1.5 transition-colors',
        agent.status === 'working'
          ? 'border-[var(--cx-accent)]/30 bg-[var(--cx-accent-soft)]'
          : 'border-[var(--cx-border)] bg-[var(--cx-surface)]'
      )}>
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left"
        >
          <Bot size={13} className={cn(
            agent.status === 'working' ? 'text-[var(--cx-accent)]' : 'text-[var(--cx-text-3)]'
          )} />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-[var(--cx-text)] truncate">
              {agent.description || 'Sub-agent'}
            </div>
          </div>
          <AgentStatusPill status={agent.status} />
          {(children.length > 0 || recentActivities.length > 0) && (
            expanded ? <ChevronDown size={11} className="text-[var(--cx-text-3)]" /> : <ChevronRight size={11} className="text-[var(--cx-text-3)]" />
          )}
        </button>

        <AnimatePresence>
          {expanded && recentActivities.length > 0 && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-2 space-y-0.5 border-t border-[var(--cx-border)]">
                {recentActivities.map((act, i) => (
                  <div key={i} className="flex items-center gap-2 py-0.5">
                    {act.done ? (
                      <CheckCircle2 size={10} className="text-[var(--cx-success)]" />
                    ) : (
                      <Loader2 size={10} className="text-[var(--cx-accent)] animate-spin" />
                    )}
                    <span className="text-[10px] font-mono text-[var(--cx-text-3)]">{act.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Child agents */}
      {children.map(child => (
        <SingleAgent key={child.id} agent={child} depth={depth + 1} allAgents={allAgents} />
      ))}
    </div>
  );
}

export function SubAgentCard({ agents }) {
  if (!agents || agents.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--cx-border)] bg-[var(--cx-surface)] overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--cx-border)] bg-[var(--cx-surface-2)]">
        <Bot size={13} className="text-[var(--cx-accent)]" />
        <span className="text-[11px] font-semibold text-[var(--cx-text-2)]">
          Agents ({agents.length})
        </span>
        <div className="flex-1" />
        <span className="text-[10px] text-[var(--cx-text-3)]">
          {agents.filter(a => a.status === 'working').length} active
        </span>
      </div>
      <div className="p-2">
        {agents.map(agent => (
          <SingleAgent key={agent.id} agent={agent} depth={0} allAgents={[]} />
        ))}
      </div>
    </motion.div>
  );
}
