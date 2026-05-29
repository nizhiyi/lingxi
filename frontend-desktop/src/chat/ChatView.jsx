import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BookOpen, Brain, Cpu, Plug, Search, Download, Zap, Dna, Undo2, X, Shield } from 'lucide-react';
import { parseAssistantContent } from './blockUtils';
import { useStore } from '../state/useStore';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { SearchModal } from './SearchModal';
import { ScreenAgentPanel } from './ScreenAgentPanel';
import { Badge } from '../ui/primitives';
import { api } from '../api/client';
import { cn } from '../ui/cn';
import AgentAvatar from '../ui/AgentAvatar';

export function ChatView() {
  const [useKB, setUseKB] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const suggestedReplies = useStore((s) => s.suggestedReplies);
  const sendMessage = useStore((s) => s.sendMessage);
  const isStreaming = useStore((s) => s.isStreaming);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(v => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ChatContextBar useKB={useKB} onSearchOpen={() => setSearchOpen(true)} />
      <MessageList />
      <EvolutionInlineNotify />
      {suggestedReplies.length > 0 && !isStreaming && (
        <div className="px-4">
          <div className="max-w-4xl mx-auto flex items-center gap-2 flex-wrap pb-2">
            <Zap size={12} className="text-[color:var(--accent)] shrink-0" />
            {suggestedReplies.map((reply, i) => (
              <button
                key={i}
                onClick={() => sendMessage({ message: reply, useKB })}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-[color:var(--line)] bg-[color:var(--bg-soft)]
                  text-[color:var(--text-soft)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]
                  hover:bg-[color:var(--accent-soft)] transition-all"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="relative">
        <AnimatePresence>
          <ScreenAgentPanel />
        </AnimatePresence>
        <Composer useKB={useKB} setUseKB={setUseKB} />
      </div>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function ChatContextBar({ useKB, onSearchOpen }) {
  const agents = useStore((s) => s.agents);
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const activeAgentId = useStore((s) => s.activeAgentId);
  const activeProfile = useStore((s) => s.activeProfile);
  const messages = useStore((s) => s.messages);

  const session = sessions.find((s) => s.id === activeSessionId);
  const agent = useMemo(() => {
    const sessionAgentId = session?.agent_id || activeAgentId || 0;
    return agents.find((a) => a.id === sessionAgentId)
      || agents.find((a) => a.builtin)
      || agents[0]
      || null;
  }, [activeAgentId, agents, session?.agent_id]);

  const capability = useMemo(() => summarizeCapability(agent), [agent]);
  const title = session?.title || (activeSessionId ? '当前会话' : '新对话');

  return (
    <div className="px-4 pt-3">
      <div className="max-w-4xl mx-auto flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[color:var(--bg-soft)]/40">
        <AgentAvatar avatar={agent?.avatar} name={agent?.name} size={32} className="shrink-0" />
        <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
          <span className="text-sm font-semibold truncate text-[color:var(--text)]">{agent?.name || '默认智能体'}</span>
          <span className="text-[color:var(--line)]">|</span>
          <span className="text-xs text-[color:var(--text-faint)] truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ContextPill icon={<Cpu size={10} />} label={activeProfile?.model || '未配置'} />
          <ContextPill icon={<Brain size={10} />} label={capability.skills} />
          {useKB && <ContextPill icon={<BookOpen size={10} />} label="KB" active />}
          {session?.permission_mode === 'managed' && (
            <ContextPill icon={<Shield size={10} />} label="管控" active />
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <button
            onClick={onSearchOpen}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[color:var(--text-faint)] hover:text-[color:var(--text-soft)] hover:bg-[color:var(--bg-soft)] transition"
            title="搜索消息 ⌘K"
          >
            <Search size={13} />
          </button>
          {messages.length > 0 && (
            <button
              onClick={() => exportToMarkdown(messages, title)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[color:var(--text-faint)] hover:text-[color:var(--text-soft)] hover:bg-[color:var(--bg-soft)] transition"
              title="导出为 Markdown"
            >
              <Download size={13} />
            </button>
          )}
          {messages.length > 0 && (
            <span className="text-[10px] text-[color:var(--text-faint)] tabular-nums">{messages.length}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ContextPill({ icon, label, active = false }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px]',
      active
        ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]'
        : 'bg-[color:var(--bg-elev)] text-[color:var(--text-faint)]'
    )}>
      {icon}
      <span className="max-w-[120px] truncate">{label}</span>
    </span>
  );
}

function summarizeCapability(agent) {
  if (!agent) return { skills: '默认', mcp: '默认', knowledge: '按需' };
  if (agent.allow_all) return { skills: '全部', mcp: '全部', knowledge: '全部可选' };
  return {
    skills: String(parseList(agent.skill_ids).length),
    mcp: String(parseList(agent.mcp_server_ids).length),
    knowledge: `${parseList(agent.knowledge_ids).length} 个可选`,
  };
}

function parseList(s) {
  try { return JSON.parse(s || '[]'); } catch { return []; }
}

function EvolutionInlineNotify() {
  const evolutionResults = useStore((s) => s.evolutionResults);
  const messages = useStore((s) => s.messages);
  const isStreaming = useStore((s) => s.isStreaming);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const sessions = useStore((s) => s.sessions);
  const [dismissed, setDismissed] = useState(new Set());
  const [reverting, setReverting] = useState(null);
  const [extractDismissed, setExtractDismissed] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const visible = (evolutionResults || []).filter(
    (r) => !dismissed.has(r.ts) && (Date.now() - r.ts) < 60000
  );

  const session = sessions?.find((s) => s.id === activeSessionId);
  const agentId = session?.agent_id;
  const showExtractHint = !isStreaming && !extractDismissed && messages.length >= 8 && agentId && visible.length === 0;

  if (visible.length === 0 && !showExtractHint) return null;

  if (showExtractHint && visible.length === 0) {
    return (
    <div className="px-4 pb-2">
      <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[color:var(--bg-soft)]/60">
            <Dna size={14} className="text-purple-500 shrink-0" />
            <span className="text-[11px] text-[color:var(--text-soft)] flex-1">
              这段对话可能包含有价值的知识，要提取吗？
            </span>
            <button
              disabled={extracting}
              onClick={async () => {
                setExtracting(true);
                try {
                  await api.extractSessionKnowledge(activeSessionId);
                } catch {}
                setExtracting(false);
                setExtractDismissed(true);
              }}
              className="text-[11px] px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 font-medium transition"
            >
              {extracting ? '提取中...' : '一键提取'}
            </button>
            <button
              onClick={() => setExtractDismissed(true)}
              className="text-[color:var(--text-faint)] hover:text-[color:var(--text)] transition p-1"
            >
              <X size={10} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleRevert = async (result) => {
    if (!result.log_id) return;
    setReverting(result.ts);
    try {
      await api.revertEvolutionLog(result.log_id);
      setDismissed((prev) => new Set([...prev, result.ts]));
    } catch {}
    setReverting(null);
  };

  return (
    <div className="px-4 pb-2">
      <div className="max-w-4xl mx-auto space-y-2">
        {visible.slice(0, 3).map((result) => (
          <div
            key={result.ts}
            className="flex items-start gap-3 px-4 py-3 rounded-xl border border-purple-500/20 bg-purple-500/5"
          >
            <Dna size={14} className="text-purple-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-purple-600 dark:text-purple-400">
                已学习
              </div>
              <p className="text-[11px] text-[color:var(--text-soft)] mt-0.5 line-clamp-2">
                {result.summary || result.action || '新知识已记录'}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {result.log_id && (
                <button
                  onClick={() => handleRevert(result)}
                  disabled={reverting === result.ts}
                  className="text-[10px] px-2 py-1 rounded-md border border-[color:var(--line)] text-[color:var(--text-faint)] hover:text-red-500 hover:border-red-500/30 transition"
                  title="撤销此进化"
                >
                  <Undo2 size={10} />
                </button>
              )}
              <button
                onClick={() => setDismissed((prev) => new Set([...prev, result.ts]))}
                className="text-[color:var(--text-faint)] hover:text-[color:var(--text)] transition p-1"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function exportToMarkdown(messages, title) {
  const lines = [`# ${title || '对话记录'}`, '', `> 导出时间：${new Date().toLocaleString('zh-CN')}`, ''];
  for (const m of messages) {
    const role = m.role === 'user' ? '👤 用户' : '🤖 助理';
    lines.push(`## ${role}`, '');
    if (m.role === 'user') {
      let text = m.content;
      try { const obj = JSON.parse(m.content); if (obj?.text != null) text = obj.text; } catch {}
      lines.push(text, '');
    } else {
      const blocks = parseAssistantContent(m.content);
      for (const b of blocks) {
        if (b.type === 'text') lines.push(b.text, '');
        if (b.type === 'thinking') lines.push(`<details><summary>思考过程</summary>\n\n${b.text}\n\n</details>`, '');
        if (b.type === 'tool') lines.push(`> 🔧 工具调用: ${b.label || b.name}`, '');
      }
    }
    lines.push('---', '');
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(title || '对话记录').replace(/[/\\?%*:|"<>]/g, '-')}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

