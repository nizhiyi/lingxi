import { useState, useMemo } from 'react';
import {
  Bot, Crown, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle,
  Circle, Clock, Wrench, GitBranch, Eye, BarChart3,
} from 'lucide-react';
import { cn } from '../ui/cn';
import { useStore } from '../state/useStore';

export function AgentsWindow() {
  const subAgents = useStore((s) => s.subAgents);
  const agentState = useStore((s) => s.codingAgentState);
  const isStreaming = useStore((s) => s.codingIsStreaming);
  const codingTasks = useStore((s) => s.codingTasks);
  const [collapsed, setCollapsed] = useState(false);

  const hasContent = subAgents.length > 0 || isStreaming;
  if (!hasContent) return null;

  const workingCount = subAgents.filter(a => a.status === 'working').length;
  const doneCount = subAgents.filter(a => a.status === 'done').length;
  const errorCount = subAgents.filter(a => a.status === 'error').length;

  return (
    <div className="my-4 rounded-xl border border-[#e8e4e0] bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[#faf8f6] transition"
      >
        <GitBranch size={15} className="text-[#c4a882]" />
        <span className="text-[14px] font-bold text-[#333]">Agents</span>
        {subAgents.length > 0 && (
          <span className="text-[12px] text-[#999]">
            {subAgents.length} agent{subAgents.length > 1 ? 's' : ''}
          </span>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {workingCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-[#c4a882]">
              <Loader2 size={11} className="animate-spin" /> {workingCount}
            </span>
          )}
          {doneCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-green-500">
              <CheckCircle2 size={11} /> {doneCount}
            </span>
          )}
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-red-400">
              <AlertCircle size={11} /> {errorCount}
            </span>
          )}
          {collapsed
            ? <ChevronDown size={14} className="text-[#bbb]" />
            : <ChevronUp size={14} className="text-[#bbb]" />
          }
        </div>
      </button>

      {!collapsed && (
        <div className="border-t border-[#e8e4e0]">
          {/* Main Agent (orchestrator) */}
          <MainAgentCard agentState={agentState} isStreaming={isStreaming} tasks={codingTasks} />

          {/* Sub-agents list */}
          {subAgents.map((agent, i) => (
            <SubAgentCard key={agent.id || i} agent={agent} />
          ))}

          {/* Stats bar */}
          {subAgents.length > 0 && (
            <div className="px-5 py-2 bg-[#fdf8f3] border-t border-[#f0ebe6] flex items-center gap-4 text-[11px] text-[#999]">
              <BarChart3 size={11} />
              <span>{doneCount}/{subAgents.length} completed</span>
              {workingCount > 0 && <span>· {workingCount} in progress</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MainAgentCard({ agentState, isStreaming, tasks }) {
  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;

  return (
    <div className="px-5 py-3 bg-[#fdf8f3] border-b border-[#f0ebe6]">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c4a882] to-[#d4b896] flex items-center justify-center text-white shadow-sm">
          <Crown size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-[#333]">Main Agent</div>
          <div className="text-[11px] text-[#999]">
            {total > 0 ? `${completed}/${total} tasks completed` : 'Orchestrating tasks'}
          </div>
        </div>
        <AgentStatusBadge status={isStreaming ? agentState : 'IDLE'} />
      </div>
      {total > 0 && (
        <div className="mt-2 h-1.5 bg-[#ede5dc] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#c4a882] to-green-400 transition-all duration-500 rounded-full"
            style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
          />
        </div>
      )}
    </div>
  );
}

function SubAgentCard({ agent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-[#f0ebe6] last:border-0">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-[#faf8f6] transition"
      >
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
          agent.status === 'working' ? 'bg-[#fff3e0] text-[#c4a882]' :
          agent.status === 'done' ? 'bg-green-50 text-green-500' :
          agent.status === 'error' ? 'bg-red-50 text-red-400' :
          'bg-[#ede5dc] text-[#8b6e4e]'
        )}>
          <Bot size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-[#333] truncate">
            {agent.description || `Sub-agent ${agent.id}`}
          </div>
          {agent.tools && agent.tools.length > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <Wrench size={10} className="text-[#bbb]" />
              <span className="text-[11px] text-[#bbb]">{agent.tools.join(', ')}</span>
            </div>
          )}
        </div>
        <AgentStatusBadge status={agent.status} />
        {agent.output && (
          expanded
            ? <ChevronUp size={12} className="text-[#ccc]" />
            : <ChevronDown size={12} className="text-[#ccc]" />
        )}
      </button>

      {expanded && agent.output && (
        <div className="px-5 pb-3">
          <div className="bg-[#faf8f6] rounded-lg p-3 text-[12px] text-[#666] font-mono leading-relaxed max-h-40 overflow-auto">
            {agent.output}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentStatusBadge({ status }) {
  const configs = {
    working: { icon: Loader2, label: 'Working', className: 'text-[#c4a882]', spin: true },
    THINKING: { icon: Loader2, label: 'Thinking', className: 'text-[#c4a882]', spin: true },
    CHECKING: { icon: Eye, label: 'Reading', className: 'text-blue-500', spin: false },
    EXECUTING: { icon: Wrench, label: 'Executing', className: 'text-orange-500', spin: false },
    WAITING_FOR_USER: { icon: Clock, label: 'Waiting', className: 'text-yellow-600', spin: false },
    WAITING_FOR_BATCH_ANSWER: { icon: Clock, label: 'Awaiting answers', className: 'text-yellow-600', spin: false },
    done: { icon: CheckCircle2, label: 'Done', className: 'text-green-500', spin: false },
    error: { icon: AlertCircle, label: 'Error', className: 'text-red-400', spin: false },
    IDLE: { icon: Circle, label: 'Idle', className: 'text-[#ccc]', spin: false },
  };
  const config = configs[status] || configs.IDLE;
  const Icon = config.icon;

  return (
    <span className={cn('flex items-center gap-1 text-[11px] font-medium shrink-0', config.className)}>
      <Icon size={12} className={config.spin ? 'animate-spin' : ''} />
      {config.label}
    </span>
  );
}
