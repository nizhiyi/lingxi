import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, ChevronDown, ChevronUp, ListTodo, Sparkles } from 'lucide-react';
import { cn } from '../../ui/cn';

function TaskIcon({ status }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={14} className="text-emerald-500" />;
    case 'in_progress':
      return <Loader2 size={14} className="text-[var(--cx-accent)] animate-spin" />;
    default:
      return <Circle size={14} className="text-[var(--cx-text-3)]" />;
  }
}

export function TaskPanel({ tasks }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!tasks || tasks.length === 0) return null;

  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const allDone = completed === total;

  return (
    <div className="shrink-0 z-20 border-b border-[var(--cx-border)] bg-[var(--cx-surface)]">
      {/* Header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--cx-surface-2)] transition-colors"
      >
        <div className="flex items-center gap-2 shrink-0">
          {allDone ? (
            <Sparkles size={14} className="text-emerald-500" />
          ) : (
            <ListTodo size={14} className="text-[var(--cx-accent)]" />
          )}
          <span className="text-[12px] font-medium text-[var(--cx-text)]">
            {allDone ? '全部完成' : '任务进度'}
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 h-1.5 rounded-full bg-[var(--cx-surface-3)] overflow-hidden">
          <motion.div
            className={cn('h-full rounded-full', allDone ? 'bg-emerald-500' : 'bg-[var(--cx-accent)]')}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          />
        </div>

        {/* Count */}
        <span className={cn(
          'text-[12px] font-medium tabular-nums',
          allDone ? 'text-emerald-500' : 'text-[var(--cx-text-2)]'
        )}>
          {completed}/{total}
        </span>

        {collapsed
          ? <ChevronDown size={12} className="text-[var(--cx-text-3)]" />
          : <ChevronUp size={12} className="text-[var(--cx-text-3)]" />
        }
      </button>

      {/* Task list — default expanded */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-0.5">
              {tasks.map((task, idx) => (
                <motion.div
                  key={task.id || idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={cn(
                    'flex items-start gap-2.5 px-2.5 py-2 rounded-lg transition-colors',
                    task.status === 'in_progress' && 'bg-[var(--cx-accent-soft)]',
                    task.status === 'completed' && 'opacity-60'
                  )}
                >
                  <span className="mt-0.5 shrink-0">
                    <TaskIcon status={task.status} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      'text-[12px] leading-relaxed',
                      task.status === 'completed'
                        ? 'text-[var(--cx-text-3)] line-through'
                        : task.status === 'in_progress'
                          ? 'text-[var(--cx-text)] font-medium'
                          : 'text-[var(--cx-text-2)]'
                    )}>
                      {task.content || task.subject || `Task ${idx + 1}`}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--cx-text-3)] tabular-nums shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
