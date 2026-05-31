import { FolderOpen, Cpu, ChevronDown, PanelLeft, TerminalSquare, Plus, MessageSquare, Bot } from 'lucide-react';
import { cn } from '../ui/cn';
import { useStore } from '../state/useStore';

export function CodeToolbar({ projectPath, onChangeProject, onToggleSidebar, sidebarOpen, onSessionPanel }) {
  const agents = useStore((s) => s.agents);
  const activeAgentId = useStore((s) => s.activeAgentId);
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const createSession = useStore((s) => s.createSession);
  const agent = agents.find((a) => a.id === activeAgentId);
  const session = sessions.find((s) => s.id === activeSessionId);

  const shortPath = projectPath
    ? projectPath.replace(/^\/Users\/[^/]+/, '~')
    : '未选择项目';

  return (
    <div className="h-10 flex items-center gap-2 px-3 border-b border-[#2a2a2a] bg-[#1a1a1a] shrink-0 select-none">
      <button
        onClick={onToggleSidebar}
        className={cn(
          'p-1.5 rounded-md transition',
          sidebarOpen ? 'text-[#8b8b8b] hover:text-white' : 'text-[#555] hover:text-[#8b8b8b]'
        )}
        title="文件树"
      >
        <PanelLeft size={15} />
      </button>

      <div className="w-px h-4 bg-[#333]" />

      <button
        onClick={onChangeProject}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[#8b8b8b] hover:text-white hover:bg-[#2a2a2a] transition font-mono"
        title="切换项目目录"
      >
        <FolderOpen size={13} className="text-blue-400 shrink-0" />
        <span className="truncate max-w-[200px]">{shortPath}</span>
        <ChevronDown size={11} className="shrink-0 opacity-50" />
      </button>

      <div className="w-px h-4 bg-[#333]" />

      <button
        onClick={() => createSession('编程会话')}
        className="p-1.5 rounded-md text-[#555] hover:text-emerald-400 hover:bg-emerald-500/10 transition"
        title="新建会话"
      >
        <Plus size={14} />
      </button>

      <button
        onClick={onSessionPanel}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[#8b8b8b] hover:text-white hover:bg-[#2a2a2a] transition"
        title="切换会话 / 智能体"
      >
        <MessageSquare size={12} className="shrink-0" />
        <span className="truncate max-w-[140px]">{session?.title || '新对话'}</span>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5 text-[11px] text-[#555] font-mono">
        <TerminalSquare size={12} />
        <span>Coding Agent</span>
      </div>

      {agent && (
        <button
          onClick={onSessionPanel}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#2a2a2a] text-[11px] text-[#8b8b8b] hover:text-white transition"
          title="切换智能体"
        >
          <Bot size={11} />
          <span className="truncate max-w-[100px]">{agent.name}</span>
        </button>
      )}
    </div>
  );
}
