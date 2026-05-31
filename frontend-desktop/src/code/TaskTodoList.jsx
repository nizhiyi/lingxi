import { useState, useCallback } from 'react';
import {
  CheckCircle2, Circle, Loader2, ChevronDown, ChevronUp,
  ListTodo, Bot, Clock, X, SkipForward, ChevronRight,
} from 'lucide-react';
import { cn } from '../ui/cn';
import { useStore } from '../state/useStore';

export function TaskTodoList({ tasks, title, collapsed: initialCollapsed, onTaskClick }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed ?? false);
  const codingSendMessage = useStore((s) => s.codingSendMessage);
  const codingProjectPath = useStore((s) => s.codingProjectPath);

  if (!tasks || tasks.length === 0) return null;

  const flatTasks = flattenTasks(tasks);
  const completed = flatTasks.filter(t => t.status === 'completed').length;
  const total = flatTasks.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const allDone = completed === total && total > 0;
  const inProgress = flatTasks.find(t => t.status === 'in_progress');
  const startedAt = useStore.getState().codingStartedAt;
  const elapsed = startedAt ? formatElapsed(Date.now() - startedAt) : null;

  const handleToggle = useCallback((taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    codingSendMessage({
      message: `请将任务 "${taskId}" 标记为 ${newStatus === 'completed' ? '完成' : '待办'}`,
      workingDir: codingProjectPath || '',
    });
  }, [codingSendMessage, codingProjectPath]);

  return (
    <div className={cn(
      'my-4 rounded-xl border overflow-hidden transition-colors',
      allDone ? 'border-green-200 bg-green-50/30' : 'border-[#e8e4e0] bg-white'
    )}>
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[#faf8f6] transition"
      >
        <ListTodo size={16} className={allDone ? 'text-green-500' : 'text-[#c4a882]'} />
        <span className="text-[14px] font-bold text-[#333]">{title || 'Tasks'}</span>

        <div className="flex items-center gap-2 ml-2 flex-1">
          <div className="w-24 h-1.5 bg-[#e8e4e0] rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                allDone ? 'bg-green-400' : 'bg-gradient-to-r from-[#c4a882] to-[#d4b896]'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[12px] text-[#999]">{completed}/{total}</span>
        </div>

        {elapsed && !allDone && (
          <span className="flex items-center gap-1 text-[11px] text-[#bbb]">
            <Clock size={10} />
            {elapsed}
          </span>
        )}

        {collapsed ? <ChevronDown size={14} className="text-[#bbb]" /> : <ChevronUp size={14} className="text-[#bbb]" />}
      </button>

      {!collapsed && (
        <div className="border-t border-[#e8e4e0]">
          {tasks.map((task, i) => (
            <TaskItem
              key={task.id || i}
              task={task}
              index={i}
              depth={0}
              onToggle={handleToggle}
              onClick={onTaskClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskItem({ task, index, depth, onToggle, onClick }) {
  const [subCollapsed, setSubCollapsed] = useState(false);
  const hasChildren = task.children && task.children.length > 0;

  return (
    <>
      <div
        className={cn(
          'flex items-start gap-3 px-5 py-3 border-b border-[#f0ebe6] last:border-0 transition group',
          task.status === 'in_progress' && 'bg-[#fdf8f3]',
          depth > 0 && 'bg-[#faf8f6]/50',
          onClick && 'cursor-pointer hover:bg-[#faf8f6]'
        )}
        style={{ paddingLeft: `${20 + depth * 20}px` }}
        onClick={() => onClick?.(task)}
      >
        {/* Checkbox / status icon */}
        <button
          className="mt-0.5 shrink-0 hover:scale-110 transition"
          onClick={(e) => {
            e.stopPropagation();
            if (task.status !== 'in_progress') {
              onToggle?.(task.id, task.status);
            }
          }}
        >
          {task.status === 'completed' && <CheckCircle2 size={16} className="text-green-500" />}
          {task.status === 'in_progress' && <Loader2 size={16} className="text-[#c4a882] animate-spin" />}
          {task.status === 'pending' && <Circle size={16} className="text-[#ddd] group-hover:text-[#bbb]" />}
          {task.status === 'cancelled' && <X size={16} className="text-[#ddd]" />}
        </button>

        {/* Sub-task toggle */}
        {hasChildren && (
          <button
            className="mt-0.5 shrink-0 text-[#bbb] hover:text-[#888] transition"
            onClick={(e) => { e.stopPropagation(); setSubCollapsed(v => !v); }}
          >
            {subCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#bbb] font-mono">#{index + 1}</span>
            <span className={cn(
              'text-[13px]',
              task.status === 'completed' ? 'text-[#999] line-through' : 'text-[#333]',
              task.status === 'cancelled' && 'line-through text-[#ccc]'
            )}>
              {task.content || task.title || task.description}
            </span>
          </div>
          {task.agent && (
            <div className="flex items-center gap-1 mt-1 text-[11px] text-[#bbb]">
              <Bot size={10} />
              <span>{task.agent}</span>
            </div>
          )}
          {task.elapsed && (
            <div className="text-[11px] text-[#bbb] mt-0.5">
              {task.elapsed}
              {task.tokens && <span className="ml-2">{task.tokens.toLocaleString()} tokens</span>}
            </div>
          )}
        </div>
      </div>

      {/* Sub-tasks */}
      {hasChildren && !subCollapsed && (
        task.children.map((child, ci) => (
          <TaskItem
            key={child.id || ci}
            task={child}
            index={ci}
            depth={depth + 1}
            onToggle={onToggle}
            onClick={onClick}
          />
        ))
      )}
    </>
  );
}

// Flatten tasks including children for counting
function flattenTasks(tasks) {
  const result = [];
  for (const task of tasks) {
    result.push(task);
    if (task.children) {
      result.push(...flattenTasks(task.children));
    }
  }
  return result;
}

function formatElapsed(ms) {
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remaining = secs % 60;
  return `${mins}m ${remaining}s`;
}

// ─── StickyTaskBar 增强 ──────────────────────────────────────────────

export function StickyTaskBar({ tasks, onSkip, onCancel }) {
  const [expanded, setExpanded] = useState(true);
  const startedAt = useStore.getState().codingStartedAt;
  const codingSendMessage = useStore((s) => s.codingSendMessage);
  const codingProjectPath = useStore((s) => s.codingProjectPath);

  if (!tasks || tasks.length === 0) return null;

  const flatTasks = flattenTasks(tasks);
  const completed = flatTasks.filter(t => t.status === 'completed').length;
  const total = flatTasks.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const allDone = completed === total && total > 0;
  const current = flatTasks.find(t => t.status === 'in_progress');
  const elapsed = startedAt ? formatElapsed(Date.now() - startedAt) : null;

  const handleSkip = useCallback(() => {
    if (current) {
      codingSendMessage({
        message: `跳过当前任务 "${current.content || current.id}"，继续下一个`,
        workingDir: codingProjectPath || '',
      });
    }
  }, [current, codingSendMessage, codingProjectPath]);

  const handleCancel = useCallback(() => {
    codingSendMessage({
      message: '取消所有剩余任务',
      workingDir: codingProjectPath || '',
    });
  }, [codingSendMessage, codingProjectPath]);

  return (
    <div className={cn(
      'shrink-0 border-b transition-colors',
      allDone ? 'border-green-200 bg-green-50' : 'border-[#e8e4e0] bg-[#fdf8f3]'
    )}>
      <div className="flex items-center gap-3 px-5 py-2.5">
        <ListTodo size={14} className={allDone ? 'text-green-500' : 'text-[#c4a882]'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-[#333]">
              {allDone ? 'All tasks completed' : (current?.content || 'Running...')}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-32 h-1 bg-[#e0dbd5] rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  allDone ? 'bg-green-400' : 'bg-[#c4a882]'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[11px] text-[#999]">{completed}/{total}</span>
            {elapsed && !allDone && (
              <span className="text-[11px] text-[#bbb] flex items-center gap-1">
                <Clock size={9} />
                {elapsed}
              </span>
            )}
          </div>
        </div>

        {!allDone && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleSkip}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-[#999] hover:text-[#666] hover:bg-[#f0ebe6] transition"
              title="Skip current task"
            >
              <SkipForward size={11} />
              Skip
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-red-400 hover:text-red-500 hover:bg-red-50 transition"
              title="Cancel all tasks"
            >
              <X size={11} />
              Cancel
            </button>
          </div>
        )}

        <button
          onClick={() => setExpanded(v => !v)}
          className="p-1 text-[#bbb] hover:text-[#888] transition"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[#e8e4e0] max-h-48 overflow-auto">
          {tasks.map((task, i) => (
            <div
              key={task.id || i}
              className={cn(
                'flex items-center gap-3 px-5 py-2 text-[12px] border-b border-[#f0ebe6] last:border-0',
                task.status === 'in_progress' && 'bg-[#fff8f0]'
              )}
            >
              {task.status === 'completed' && <CheckCircle2 size={13} className="text-green-500 shrink-0" />}
              {task.status === 'in_progress' && <Loader2 size={13} className="text-[#c4a882] animate-spin shrink-0" />}
              {task.status === 'pending' && <Circle size={13} className="text-[#ddd] shrink-0" />}
              {task.status === 'cancelled' && <X size={13} className="text-[#ddd] shrink-0" />}
              <span className="text-[#bbb] font-mono">#{i + 1}</span>
              <span className={cn(
                task.status === 'completed' ? 'text-[#999]' : 'text-[#555]',
                task.status === 'cancelled' && 'text-[#ccc] line-through'
              )}>
                {task.content || task.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskStartedCard({ taskName, elapsed, tokens }) {
  return (
    <div className="my-2 flex items-center gap-2 text-[12px] text-[#999]">
      <span className="text-[#c4a882]">+</span>
      <span className="font-medium">Task started...</span>
      {elapsed && <span>{elapsed}</span>}
      {tokens && (
        <>
          <span className="text-[#ddd]">·</span>
          <span>{tokens.toLocaleString()} tokens</span>
        </>
      )}
    </div>
  );
}

export function TaskUpdateCard({ taskNumber, status }) {
  return (
    <div className="my-2 rounded-lg border border-[#e8e4e0] bg-[#faf8f6] px-4 py-2 flex items-center gap-2">
      <ListTodo size={14} className="text-[#c4a882]" />
      <span className="text-[13px] font-medium text-[#555]">TaskUpdate</span>
      <span className="flex-1" />
      <span className="text-[12px] text-[#999]">Updated task #{taskNumber} status</span>
    </div>
  );
}

export function AgentDispatchCard({ taskName, agentName }) {
  return (
    <div className="my-2 rounded-lg border border-[#e8e4e0] bg-[#faf8f6] px-4 py-2 flex items-center gap-2">
      <Bot size={14} className="text-[#c4a882]" />
      <span className="text-[13px] font-medium text-[#555]">Agent</span>
      <span className="text-[13px] text-[#888]">{taskName}</span>
    </div>
  );
}
