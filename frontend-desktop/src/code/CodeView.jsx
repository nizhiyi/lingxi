import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Highlight, themes } from 'prism-react-renderer';
import {
  ChevronDown, ChevronRight, Brain, FolderOpen, Loader2,
  Plus, MessageSquare, Bot, X,
} from 'lucide-react';
import { cn } from '../ui/cn';
import { useStore } from '../state/useStore';
import { api } from '../api/client';
import { parseAssistantContent } from '../chat/blockUtils';
import { CodeToolbar } from './CodeToolbar';
import { CodeComposer } from './CodeComposer';
import { CodeToolCard } from './CodeToolCard';
import { FileSidebar } from './FileSidebar';
import { CodePreview } from './CodePreview';

const STORAGE_KEY = 'lingxi-code-project-path';

export function CodeView() {
  const messages = useStore((s) => s.messages);
  const liveBlocks = useStore((s) => s.liveBlocks);
  const isStreaming = useStore((s) => s.isStreaming);
  const agentState = useStore((s) => s.agentState);
  const sendMessage = useStore((s) => s.sendMessage);
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const agents = useStore((s) => s.agents);
  const activeAgentId = useStore((s) => s.activeAgentId);
  const createSession = useStore((s) => s.createSession);
  const setActiveSession = useStore((s) => s.setActiveSession);
  const setActiveAgent = useStore((s) => s.setActiveAgent);

  const [projectPath, setProjectPath] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(!projectPath);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showSessionPanel, setShowSessionPanel] = useState(false);

  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const composerRef = useRef(null);

  useEffect(() => {
    if (stickToBottom && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, liveBlocks, stickToBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setStickToBottom(atBottom);
  }, []);

  const handleSend = useCallback((text) => {
    sendMessage({ message: text });
  }, [sendMessage]);

  const handleSelectProject = useCallback((path) => {
    setProjectPath(path);
    localStorage.setItem(STORAGE_KEY, path);
    setShowProjectPicker(false);
  }, []);

  const handleFileClick = useCallback(async (filePath) => {
    setPreviewFile(filePath);
    setPreviewLoading(true);
    try {
      const res = await api.readFile(filePath);
      setPreviewContent(res.content || '');
    } catch {
      setPreviewContent('// 无法读取文件');
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const handleFileDrop = useCallback((filePath) => {
    if (composerRef.current) {
      composerRef.current.insertText(`@${filePath} `);
    }
  }, []);

  const handleNewSession = useCallback(async () => {
    await createSession('编程会话');
    setShowSessionPanel(false);
  }, [createSession]);

  if (showProjectPicker) {
    return (
      <div className="flex-1 flex flex-col bg-[#111] text-[#e0e0e0]">
        <ProjectPicker onSelect={handleSelectProject} currentPath={projectPath} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#111] text-[#e0e0e0] min-h-0">
      <CodeToolbar
        projectPath={projectPath}
        onChangeProject={() => setShowProjectPicker(true)}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
        onSessionPanel={() => setShowSessionPanel(true)}
      />

      <div className="flex-1 flex min-h-0">
        {sidebarOpen && (
          <FileSidebar
            projectPath={projectPath}
            onFileSelect={handleFileClick}
            onFileDrop={handleFileDrop}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col min-h-0">
          {previewFile ? (
            <div className="flex-1 flex flex-col min-h-0">
              <CodePreview
                filePath={previewFile}
                content={previewContent}
                loading={previewLoading}
                onClose={() => setPreviewFile(null)}
                onInsertToChat={(text) => {
                  if (composerRef.current) composerRef.current.insertText(text);
                }}
              />
              <CodeComposer ref={composerRef} onSend={handleSend} disabled={isStreaming} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto scrollable"
              >
                <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
                  {messages.length === 0 && !isStreaming && <WelcomeHint />}

                  {messages.map((msg) => (
                    <MessageBlock key={msg.id} msg={msg} />
                  ))}

                  {liveBlocks.length > 0 && (
                    <div className="space-y-1">
                      {liveBlocks.map((block, i) => (
                        <LiveBlock key={i} block={block} />
                      ))}
                    </div>
                  )}

                  {isStreaming && agentState === 'THINKING' && liveBlocks.length === 0 && (
                    <ThinkingIndicator />
                  )}

                  <div ref={bottomRef} />
                </div>
              </div>

              <CodeComposer ref={composerRef} onSend={handleSend} disabled={isStreaming} />
            </div>
          )}
        </div>
      </div>

      {showSessionPanel && (
        <SessionPanel
          sessions={sessions}
          activeSessionId={activeSessionId}
          agents={agents}
          activeAgentId={activeAgentId}
          onSelectSession={(id) => { setActiveSession(id); setShowSessionPanel(false); }}
          onSelectAgent={(id) => { setActiveAgent(id); setShowSessionPanel(false); }}
          onNewSession={handleNewSession}
          onClose={() => setShowSessionPanel(false)}
        />
      )}
    </div>
  );
}

function SessionPanel({ sessions, activeSessionId, agents, activeAgentId, onSelectSession, onSelectAgent, onNewSession, onClose }) {
  const [tab, setTab] = useState('sessions');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[420px] max-h-[70vh] bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('sessions')}
              className={cn('px-3 py-1 rounded-md text-xs font-medium transition',
                tab === 'sessions' ? 'bg-emerald-500/20 text-emerald-400' : 'text-[#888] hover:text-white')}
            >
              <MessageSquare size={12} className="inline mr-1" />会话
            </button>
            <button
              onClick={() => setTab('agents')}
              className={cn('px-3 py-1 rounded-md text-xs font-medium transition',
                tab === 'agents' ? 'bg-purple-500/20 text-purple-400' : 'text-[#888] hover:text-white')}
            >
              <Bot size={12} className="inline mr-1" />智能体
            </button>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[#666] hover:text-white transition">
            <X size={14} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[55vh] scrollable">
          {tab === 'sessions' && (
            <div className="p-2">
              <button
                onClick={onNewSession}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-xs text-emerald-400 hover:bg-emerald-500/10 transition mb-1"
              >
                <Plus size={13} /> 新建会话
              </button>
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectSession(s.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-xs transition truncate mb-0.5',
                    s.id === activeSessionId
                      ? 'bg-[#2a2a2a] text-white'
                      : 'text-[#888] hover:text-white hover:bg-[#222]'
                  )}
                >
                  {s.title || '未命名会话'}
                </button>
              ))}
              {sessions.length === 0 && (
                <div className="text-center text-[11px] text-[#555] py-4">暂无会话</div>
              )}
            </div>
          )}
          {tab === 'agents' && (
            <div className="p-2">
              {agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onSelectAgent(a.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-xs transition truncate mb-0.5 flex items-center gap-2',
                    a.id === activeAgentId
                      ? 'bg-[#2a2a2a] text-white'
                      : 'text-[#888] hover:text-white hover:bg-[#222]'
                  )}
                >
                  <Bot size={12} className="shrink-0" />
                  <span className="truncate">{a.name}</span>
                </button>
              ))}
              {agents.length === 0 && (
                <div className="text-center text-[11px] text-[#555] py-4">暂无智能体</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBlock({ msg }) {
  if (msg.role === 'user') return <UserMessage msg={msg} />;
  if (msg.role === 'assistant') return <AssistantMessage msg={msg} />;
  return null;
}

function UserMessage({ msg }) {
  let text = msg.content;
  try {
    const parsed = JSON.parse(msg.content);
    if (parsed.text) text = parsed.text;
  } catch {}
  return (
    <div className="group">
      <div className="flex items-start gap-2 text-sm font-mono">
        <span className="text-emerald-500 font-bold shrink-0 mt-0.5 select-none">&gt;</span>
        <div className="text-[#e0e0e0] whitespace-pre-wrap break-words">{text}</div>
      </div>
    </div>
  );
}

function AssistantMessage({ msg }) {
  const blocks = useMemo(() => parseAssistantContent(msg.content), [msg.content]);
  return (
    <div className="pl-0">
      {blocks.map((block, i) => {
        if (block.type === 'thinking') return <ThinkingBlock key={i} text={block.text} />;
        if (block.type === 'tool') return (
          <CodeToolCard key={i} name={block.name} label={block.label} done input={block.input} status={block.status} ms={block.ms} />
        );
        if (block.type === 'text' && block.text) return <TextBlock key={i} text={block.text} />;
        return null;
      })}
    </div>
  );
}

function TextBlock({ text }) {
  return (
    <div className="flex gap-2 my-1">
      <div className="w-0.5 bg-[#333] rounded-full shrink-0 self-stretch" />
      <div className="prose-code-view text-sm leading-relaxed min-w-0 flex-1">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function ThinkingBlock({ text }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const lines = (text || '').split('\n');
  const preview = lines.slice(-2).join(' ').slice(-120);
  return (
    <div className="my-1.5 ml-4 rounded-md border border-[#2a2a2a] bg-[#161616] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[#1e1e1e] transition"
      >
        <Brain size={12} className="text-[#555] shrink-0" />
        <span className="text-[#666] font-medium">已思考</span>
        {!open && <span className="text-[#444] truncate flex-1 font-mono">{preview}</span>}
        {open ? <ChevronDown size={12} className="text-[#555]" /> : <ChevronRight size={12} className="text-[#555]" />}
      </button>
      {open && (
        <div className="border-t border-[#2a2a2a] px-3 py-2 text-[11px] font-mono text-[#666] whitespace-pre-wrap max-h-60 overflow-y-auto scrollable">
          {text}
        </div>
      )}
    </div>
  );
}

function LiveBlock({ block }) {
  if (block.type === 'thinking') {
    return (
      <div className="my-1.5 ml-4 rounded-md border border-[#333]/50 bg-[#161616] overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 text-xs">
          <Brain size={12} className="text-purple-400 shrink-0" />
          <span className="text-purple-300 font-medium">思考中…</span>
          <span className="flex items-end gap-[2px] h-3">
            {[0, 0.12, 0.24].map((d) => (
              <span key={d} className="w-[3px] bg-purple-400 rounded-full animate-pulse" style={{
                animationDelay: `${d}s`, height: '8px',
              }} />
            ))}
          </span>
        </div>
        {block.text && (
          <div className="border-t border-[#2a2a2a] px-3 py-2 text-[11px] font-mono text-[#555] whitespace-pre-wrap max-h-32 overflow-hidden">
            {block.text.slice(-300)}
          </div>
        )}
      </div>
    );
  }
  if (block.type === 'tool') {
    return <CodeToolCard name={block.name} label={block.label} done={block.done} input={block.input} status={block.status} ms={block.ms} />;
  }
  if (block.type === 'text' && block.text) {
    return <TextBlock text={block.text} />;
  }
  return null;
}

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs text-[#555] ml-4 py-2">
      <Loader2 size={12} className="animate-spin text-purple-400" />
      <span className="text-purple-300">Agent 正在思考…</span>
    </div>
  );
}

function WelcomeHint() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
        <span className="text-2xl text-emerald-400 font-mono font-bold">&gt;_</span>
      </div>
      <h2 className="text-lg font-semibold text-[#ccc] mb-2">Coding Agent</h2>
      <p className="text-sm text-[#666] max-w-md leading-relaxed">
        编程助手已就绪。你可以用自然语言描述任务，AI 会自动读取文件、编辑代码、执行命令来完成。
      </p>
      <div className="mt-6 grid grid-cols-2 gap-2 text-[11px] text-[#555]">
        {[
          '帮我重构 main.go 中的路由注册',
          '找到所有 TODO 注释并汇总',
          '写一个单元测试覆盖 auth 模块',
          '解释这个项目的架构',
        ].map((hint) => (
          <div key={hint} className="px-3 py-2 rounded-md border border-[#2a2a2a] bg-[#161616] hover:border-[#444] transition cursor-default">
            {hint}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectPicker({ onSelect, currentPath }) {
  const [recentPaths] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lingxi-code-recent-paths') || '[]');
    } catch { return []; }
  });

  const saveRecent = useCallback((selected) => {
    const recent = [selected, ...recentPaths.filter((p) => p !== selected)].slice(0, 8);
    localStorage.setItem('lingxi-code-recent-paths', JSON.stringify(recent));
  }, [recentPaths]);

  const handleBrowse = useCallback(async () => {
    if (window.electronAPI?.selectDirectory) {
      const selected = await window.electronAPI.selectDirectory();
      if (selected) {
        saveRecent(selected);
        onSelect(selected);
      }
    } else {
      const fallback = prompt('请输入项目目录路径：', currentPath || '');
      if (fallback?.trim()) {
        saveRecent(fallback.trim());
        onSelect(fallback.trim());
      }
    }
  }, [currentPath, onSelect, saveRecent]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <FolderOpen size={28} className="text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-[#ccc] mb-1">选择项目目录</h2>
          <p className="text-sm text-[#666]">AI 将在此目录中读写文件和执行命令</p>
        </div>

        <button
          onClick={handleBrowse}
          className="w-full py-3 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition flex items-center justify-center gap-2"
        >
          <FolderOpen size={16} />
          选择文件夹
        </button>

        {recentPaths.length > 0 && (
          <div className="mt-6">
            <div className="text-[11px] text-[#555] mb-2 uppercase tracking-wider">最近打开</div>
            <div className="space-y-1">
              {recentPaths.map((p) => (
                <button
                  key={p}
                  onClick={() => { saveRecent(p); onSelect(p); }}
                  className="w-full text-left px-3 py-2 rounded-md text-xs font-mono text-[#888] hover:text-white hover:bg-[#1e1e1e] transition truncate"
                >
                  {p.replace(/^\/Users\/[^/]+/, '~')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const MD_COMPONENTS = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    if (!inline && match) {
      return (
        <Highlight theme={themes.vsDark} code={String(children).replace(/\n$/, '')} language={match[1]}>
          {({ tokens, getLineProps, getTokenProps }) => (
            <pre className="my-2 p-3 rounded-md bg-[#1e1e1e] border border-[#2a2a2a] text-[12px] leading-5 overflow-x-auto font-mono">
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  <span className="inline-block w-8 text-right mr-3 text-[#444] select-none text-[11px]">{i + 1}</span>
                  {line.map((token, key) => <span key={key} {...getTokenProps({ token })} />)}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      );
    }
    return <code className="px-1 py-0.5 rounded bg-[#2a2a2a] text-emerald-300 text-[12px] font-mono" {...props}>{children}</code>;
  },
  p({ children }) { return <p className="my-1 text-[#ccc]">{children}</p>; },
  h1({ children }) { return <h1 className="text-base font-bold text-white mt-4 mb-2">{children}</h1>; },
  h2({ children }) { return <h2 className="text-sm font-bold text-white mt-3 mb-1.5">{children}</h2>; },
  h3({ children }) { return <h3 className="text-sm font-semibold text-[#ddd] mt-2 mb-1">{children}</h3>; },
  ul({ children }) { return <ul className="list-disc list-inside my-1 text-[#bbb] space-y-0.5">{children}</ul>; },
  ol({ children }) { return <ol className="list-decimal list-inside my-1 text-[#bbb] space-y-0.5">{children}</ol>; },
  li({ children }) { return <li className="text-[#bbb]">{children}</li>; },
  a({ href, children }) { return <a href={href} className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">{children}</a>; },
  blockquote({ children }) { return <blockquote className="border-l-2 border-[#444] pl-3 my-2 text-[#888] italic">{children}</blockquote>; },
  table({ children }) { return <table className="my-2 border-collapse w-full text-[12px]">{children}</table>; },
  th({ children }) { return <th className="border border-[#333] px-2 py-1 text-left text-[#aaa] bg-[#1a1a1a] font-medium">{children}</th>; },
  td({ children }) { return <td className="border border-[#333] px-2 py-1 text-[#999]">{children}</td>; },
};
