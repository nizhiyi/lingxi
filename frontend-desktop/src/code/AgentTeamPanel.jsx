import { useState, useCallback, useMemo } from 'react';
import { Users, Bot, Plus, X, Crown, CheckCircle2, Loader2, Circle, ChevronDown, ChevronUp, Play, Pause, Settings } from 'lucide-react';
import { cn } from '../ui/cn';
import { useStore } from '../state/useStore';

export function AgentTeamPanel({ team, onAddMember, onRemoveMember, onStartTeam, onStopTeam }) {
  const [collapsed, setCollapsed] = useState(false);
  const agents = useStore((s) => s.agents);

  if (!team) return null;

  const members = team.members || [];
  const leader = members.find(m => m.role === 'leader');
  const workers = members.filter(m => m.role !== 'leader');
  const isRunning = team.status === 'running';

  return (
    <div className="my-4 rounded-xl border border-[#e8e4e0] bg-white overflow-hidden">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[#faf8f6] transition"
      >
        <Users size={16} className="text-[#c4a882] shrink-0" />
        <span className="text-[14px] font-bold text-[#333]">Agent Team</span>
        <span className="text-[12px] text-[#999]">{members.length} members</span>
        {isRunning && (
          <span className="flex items-center gap-1 text-[11px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Running
          </span>
        )}
        <span className="flex-1" />
        {collapsed ? <ChevronDown size={14} className="text-[#bbb]" /> : <ChevronUp size={14} className="text-[#bbb]" />}
      </button>

      {!collapsed && (
        <div className="border-t border-[#e8e4e0]">
          {leader && (
            <div className="px-5 py-3 bg-[#fdf8f3] border-b border-[#f0ebe6]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#c4a882] flex items-center justify-center text-white">
                  <Crown size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#333]">{leader.name || 'Orchestrator'}</div>
                  <div className="text-[11px] text-[#999]">总指挥 · 负责任务拆解与分配</div>
                </div>
                <StatusBadge status={leader.status} />
              </div>
            </div>
          )}

          {workers.map((member, i) => (
            <div key={member.id || i} className="px-5 py-3 border-b border-[#f0ebe6] last:border-0 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#ede5dc] flex items-center justify-center text-[#8b6e4e]">
                <Bot size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#333]">{member.name}</div>
                {member.task && (
                  <div className="text-[11px] text-[#999] truncate">{member.task}</div>
                )}
              </div>
              <StatusBadge status={member.status} />
              {onRemoveMember && !isRunning && (
                <button
                  onClick={() => onRemoveMember(member.id)}
                  className="p-1 rounded text-[#ddd] hover:text-red-400 transition"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}

          <div className="px-5 py-3 flex items-center gap-2">
            {onAddMember && !isRunning && (
              <button
                onClick={onAddMember}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#d4cec6] text-[12px] text-[#999] hover:text-[#666] hover:border-[#c4a882] transition"
              >
                <Plus size={12} />
                Add Agent
              </button>
            )}
            <div className="flex-1" />
            {isRunning ? (
              <button
                onClick={onStopTeam}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-50 text-red-500 text-[12px] font-medium hover:bg-red-100 transition"
              >
                <Pause size={12} />
                Stop Team
              </button>
            ) : (
              <button
                onClick={onStartTeam}
                disabled={members.length < 2}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium transition',
                  members.length >= 2
                    ? 'bg-[#c4a882] text-white hover:bg-[#b09670]'
                    : 'bg-[#f0ebe6] text-[#ccc] cursor-default'
                )}
              >
                <Play size={12} />
                Start Team
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'working') {
    return (
      <span className="flex items-center gap-1 text-[11px] text-[#c4a882]">
        <Loader2 size={11} className="animate-spin" />
        Working
      </span>
    );
  }
  if (status === 'done') {
    return (
      <span className="flex items-center gap-1 text-[11px] text-green-500">
        <CheckCircle2 size={11} />
        Done
      </span>
    );
  }
  if (status === 'idle') {
    return (
      <span className="flex items-center gap-1 text-[11px] text-[#bbb]">
        <Circle size={11} />
        Idle
      </span>
    );
  }
  return null;
}

export function TeamProgressCard({ team }) {
  if (!team) return null;
  const members = team.members || [];
  const working = members.filter(m => m.status === 'working').length;
  const done = members.filter(m => m.status === 'done').length;

  return (
    <div className="my-2 rounded-lg border border-[#e8e4e0] bg-[#faf8f6] px-4 py-2.5">
      <div className="flex items-center gap-3 text-[12px]">
        <Users size={13} className="text-[#c4a882]" />
        <span className="font-medium text-[#555]">Team Progress</span>
        <span className="text-[#999]">{done}/{members.length} agents completed</span>
        {working > 0 && (
          <span className="flex items-center gap-1 text-[#c4a882]">
            <Loader2 size={11} className="animate-spin" />
            {working} working
          </span>
        )}
      </div>
    </div>
  );
}
