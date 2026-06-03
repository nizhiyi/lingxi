import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Trash2, MessageSquare, Clock } from 'lucide-react';
import { cn } from '../../ui/cn';
import { useStore } from '../../state/useStore';

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const oneDay = 86400000;
  if (diffMs < oneDay && d.getDate() === now.getDate()) return 'Today';
  if (diffMs < 2 * oneDay) return 'Yesterday';
  if (diffMs < 7 * oneDay) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function groupByDate(sessions) {
  const groups = { Today: [], Yesterday: [], Earlier: [] };
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  for (const s of sessions) {
    const ts = new Date(s.updated_at || s.created_at).getTime();
    if (ts >= todayStart) groups.Today.push(s);
    else if (ts >= yesterdayStart) groups.Yesterday.push(s);
    else groups.Earlier.push(s);
  }
  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

export function SessionListPanel({ visible, onClose, onNewSession }) {
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const setActiveSession = useStore((s) => s.setActiveSession);
  const deleteSession = useStore((s) => s.deleteSession);
  const [filter, setFilter] = useState('');
  const [hoveredId, setHoveredId] = useState(null);

  const filtered = useMemo(() => {
    if (!filter.trim()) return sessions;
    const q = filter.toLowerCase();
    return sessions.filter((s) =>
      (s.title || '').toLowerCase().includes(q)
    );
  }, [sessions, filter]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const handleSelect = useCallback((id) => {
    setActiveSession(id);
  }, [setActiveSession]);

  const handleDelete = useCallback((e, id) => {
    e.stopPropagation();
    deleteSession(id);
  }, [deleteSession]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          className="h-full flex flex-col border-r border-[var(--cx-border)] bg-[var(--cx-surface)] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-3 border-b border-[var(--cx-border)]">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--cx-text-3)]" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search sessions…"
                className="w-full pl-8 pr-3 py-1.5 text-[12px] rounded-md bg-[var(--cx-surface-2)] border border-[var(--cx-border)] text-[var(--cx-text)] placeholder:text-[var(--cx-text-3)] focus:outline-none focus:border-[var(--cx-border-active)] transition-colors"
              />
            </div>
            <button
              onClick={onNewSession}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-[var(--cx-accent)] text-white hover:opacity-90 transition-opacity"
              title="New session"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto scrollable py-1">
            {groups.length === 0 && (
              <div className="text-center py-8 text-[12px] text-[var(--cx-text-3)]">
                No sessions
              </div>
            )}
            {groups.map(([label, items]) => (
              <div key={label} className="mb-1">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--cx-text-3)]">
                  {label}
                </div>
                {items.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleSelect(session.id)}
                    onMouseEnter={() => setHoveredId(session.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-left transition-all duration-100 group',
                      session.id === activeSessionId
                        ? 'bg-[var(--cx-accent-soft)] border-l-2 border-[var(--cx-accent)]'
                        : 'hover:bg-[var(--cx-surface-2)] border-l-2 border-transparent'
                    )}
                  >
                    <MessageSquare size={13} className="shrink-0 text-[var(--cx-text-3)]" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-[var(--cx-text)] truncate">
                        {session.title || 'New Session'}
                      </div>
                      <div className="text-[10px] text-[var(--cx-text-3)] mt-0.5">
                        {formatDate(session.updated_at || session.created_at)}
                      </div>
                    </div>
                    {hoveredId === session.id && session.id !== activeSessionId && (
                      <button
                        onClick={(e) => handleDelete(e, session.id)}
                        className="shrink-0 p-1 rounded hover:bg-[var(--cx-error)]/20 text-[var(--cx-text-3)] hover:text-[var(--cx-error)] transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
