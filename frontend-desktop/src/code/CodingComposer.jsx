import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Send, Square, Plus, ChevronDown, ChevronUp, FileText, X, Folder, ArrowRight, Bot, Clock, MessageSquare, Search, Trash2 } from 'lucide-react';
import { cn } from '../ui/cn';
import { useStore } from '../state/useStore';
import { api } from '../api/client';

export const CodingComposer = forwardRef(function CodingComposer({ onSend, disabled, projectPath }, ref) {
  const [text, setText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [fileBrowserPath, setFileBrowserPath] = useState('');
  const [fileBrowserEntries, setFileBrowserEntries] = useState([]);
  const [fileBrowserLoading, setFileBrowserLoading] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const textareaRef = useRef(null);
  const composingRef = useRef(false);
  const composingEndTsRef = useRef(0);
  const isStreaming = useStore((s) => s.codingIsStreaming);
  const abort = useStore((s) => s.codingAbort);
  const profiles = useStore((s) => s.profiles);
  const activeProfile = useStore((s) => s.activeProfile);
  const activateProfile = useStore((s) => s.activateProfile);
  const agents = useStore((s) => s.agents);
  const activeAgentId = useStore((s) => s.activeAgentId);
  const setActiveAgent = useStore((s) => s.setActiveAgent);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const setActiveSession = useStore((s) => s.setActiveSession);
  const deleteSession = useStore((s) => s.deleteSession);
  const createSession = useStore((s) => s.createSession);
  const activeSession = useMemo(() => sessions.find(s => s.id === activeSessionId), [sessions, activeSessionId]);

  useImperativeHandle(ref, () => ({
    insertText: (str) => {
      setText((prev) => prev + str);
      setTimeout(() => { textareaRef.current?.focus(); autoResize(textareaRef.current); }, 0);
    },
    focus: () => textareaRef.current?.focus(),
  }), []);

  useEffect(() => {
    if (!isStreaming && textareaRef.current) textareaRef.current.focus();
  }, [isStreaming]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, attachedFiles);
    setText('');
    setAttachedFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [text, onSend, disabled, attachedFiles]);

  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    if (
      e.isComposing ||
      e.nativeEvent?.isComposing ||
      e.keyCode === 229 ||
      composingRef.current ||
      Date.now() - composingEndTsRef.current < 50
    ) return;
    e.preventDefault();
    handleSend();
  }, [handleSend]);

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setText(val);
    if (val === '/') setShowSlashMenu(true);
    else if (!val.startsWith('/')) setShowSlashMenu(false);
  }, []);

  const removeFile = useCallback((idx) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const filePath = e.dataTransfer.getData('text/plain');
    const isDir = e.dataTransfer.getData('application/x-is-dir') === 'true';
    if (filePath) {
      const name = filePath.split('/').pop();
      setAttachedFiles(prev => [...prev, { path: filePath, name, isDir }]);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, []);

  const openFileBrowser = useCallback(async () => {
    const dir = projectPath || '';
    setFileBrowserPath(dir);
    setShowFileBrowser(true);
    setFileBrowserLoading(true);
    try {
      const res = await api.listDirectory(dir);
      setFileBrowserEntries(res.entries || []);
    } catch { setFileBrowserEntries([]); }
    setFileBrowserLoading(false);
  }, [projectPath]);

  const navigateFileBrowser = useCallback(async (dirPath) => {
    setFileBrowserPath(dirPath);
    setFileBrowserLoading(true);
    try {
      const res = await api.listDirectory(dirPath);
      setFileBrowserEntries(res.entries || []);
    } catch { setFileBrowserEntries([]); }
    setFileBrowserLoading(false);
  }, []);

  const selectFile = useCallback((entry, attachDir) => {
    if (entry.is_dir && !attachDir) {
      navigateFileBrowser(entry.path);
    } else {
      setAttachedFiles(prev => [...prev, { path: entry.path, name: entry.name, isDir: entry.is_dir }]);
      setShowFileBrowser(false);
    }
  }, [navigateFileBrowser]);

  const SLASH_COMMANDS = [
    { cmd: '/compact', desc: 'Compact conversation context' },
    { cmd: '/clear', desc: 'Clear conversation history' },
    { cmd: '/help', desc: 'Show available commands' },
    { cmd: '/review', desc: 'Review code changes' },
    { cmd: '/commit', desc: 'Create a git commit' },
    { cmd: '/pr', desc: 'Create a pull request' },
    { cmd: '/init', desc: 'Initialize project' },
  ];

  const modelName = activeProfile?.name || activeProfile?.model || 'Select model';

  return (
    <div className="border-t border-[#e8e4e0] bg-white relative">
      {/* 会话历史下拉菜单 */}
      {showSessionMenu && (
        <SessionHistoryDropdown
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={(id) => { setActiveSession(id); setShowSessionMenu(false); }}
          onDelete={deleteSession}
          onCreate={() => { createSession('编程会话'); setShowSessionMenu(false); }}
          onClose={() => setShowSessionMenu(false)}
        />
      )}

      {/* 附件文件 chips */}
      {attachedFiles.length > 0 && (
        <div className="max-w-3xl mx-auto px-6 pt-3 flex flex-wrap gap-2">
          {attachedFiles.map((f, i) => (
            <FileChip key={i} name={f.name} path={f.path} isDir={f.isDir} onRemove={() => removeFile(i)} />
          ))}
        </div>
      )}

      {/* 斜杠命令菜单 */}
      {showSlashMenu && (
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-2 rounded-xl border border-[#e8e4e0] bg-white shadow-lg overflow-hidden">
            {SLASH_COMMANDS.filter(c => c.cmd.startsWith(text)).map((c) => (
              <button
                key={c.cmd}
                onClick={() => { setText(c.cmd + ' '); setShowSlashMenu(false); textareaRef.current?.focus(); }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] hover:bg-[#faf8f6] transition text-left"
              >
                <span className="font-mono font-medium text-[#333]">{c.cmd}</span>
                <span className="text-[#999] text-[12px]">{c.desc}</span>
              </button>
            ))}
            <div className="px-4 py-1.5 text-[10px] text-[#bbb] bg-[#faf8f6] border-t border-[#e8e4e0] flex items-center gap-3">
              <span><kbd className="px-1 py-0.5 rounded bg-white border border-[#e0dbd5] text-[9px]">Up/Down</kbd> navigate</span>
              <span><kbd className="px-1 py-0.5 rounded bg-white border border-[#e0dbd5] text-[9px]">Enter</kbd> select</span>
              <span><kbd className="px-1 py-0.5 rounded bg-white border border-[#e0dbd5] text-[9px]">Esc</kbd> dismiss</span>
            </div>
          </div>
        </div>
      )}

      {/* 文件浏览器弹窗 */}
      {showFileBrowser && (
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-2 rounded-xl border border-[#e8e4e0] bg-white shadow-lg overflow-hidden max-h-[300px] flex flex-col">
            <div className="px-4 py-2 border-b border-[#e8e4e0] flex items-center gap-2 text-[12px] text-[#888] bg-[#faf8f6]">
              <Folder size={13} className="text-[#c4a882]" />
              <span className="font-mono truncate">{fileBrowserPath ? fileBrowserPath.replace(/^\/Users\/[^/]+/, '~') : '~'}</span>
              <button onClick={() => setShowFileBrowser(false)} className="ml-auto p-0.5 rounded hover:bg-[#ede5dc] text-[#bbb] hover:text-[#666]">
                <X size={12} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {fileBrowserLoading && <div className="p-4 text-center text-[12px] text-[#bbb]">加载中...</div>}
              {!fileBrowserLoading && fileBrowserEntries.map((entry) => (
                <div key={entry.path} className="flex items-center hover:bg-[#faf8f6] transition">
                  <button
                    onClick={() => selectFile(entry)}
                    className="flex-1 flex items-center gap-2 px-4 py-2 text-[13px] text-left min-w-0"
                  >
                    {entry.is_dir ? (
                      <Folder size={14} className="text-[#c4a882] shrink-0" />
                    ) : (
                      <FileText size={14} className="text-[#999] shrink-0" />
                    )}
                    <span className="truncate text-[#333]">{entry.name}</span>
                  </button>
                  {entry.is_dir && (
                    <button
                      onClick={() => selectFile(entry, true)}
                      className="px-2 py-1 mr-2 rounded text-[10px] text-[#999] hover:text-[#c4a882] hover:bg-[#f0ebe6] transition shrink-0"
                      title="附加此目录"
                    >
                      <Plus size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="px-4 py-1.5 text-[10px] text-[#bbb] bg-[#faf8f6] border-t border-[#e8e4e0] flex items-center gap-3">
              <span>navigate</span>
              <span><kbd className="px-1 py-0.5 rounded bg-white border border-[#e0dbd5] text-[9px]">Enter</kbd> attach</span>
              <span><kbd className="px-1 py-0.5 rounded bg-white border border-[#e0dbd5] text-[9px]">Esc</kbd> close</span>
            </div>
          </div>
        </div>
      )}

      {/* 主输入区 */}
      <div className="max-w-3xl mx-auto px-6 py-3">
        <div
          className={cn(
            'rounded-2xl border bg-white transition-all',
            'border-[#e0dbd5] focus-within:border-[#c4a882] focus-within:shadow-[0_0_0_3px_rgba(196,168,130,0.1)]',
          )}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={() => { composingRef.current = false; composingEndTsRef.current = Date.now(); }}
            placeholder={isStreaming ? 'Agent is working...' : 'Ask Claude to edit, debug or explain...'}
            disabled={isStreaming}
            rows={1}
            className={cn(
              'w-full px-4 pt-3 pb-2 bg-transparent text-[14px] text-[#333] placeholder-[#bbb]',
              'resize-none outline-none min-h-[40px] max-h-[200px] leading-relaxed',
            )}
            style={{ height: 'auto', overflow: 'hidden' }}
            onInput={(e) => autoResize(e.target)}
          />

          {/* 工具栏 */}
          <div className="flex items-center gap-2 px-3 pb-2.5">
            <button
              onClick={openFileBrowser}
              className="p-1.5 rounded-lg text-[#bbb] hover:text-[#666] hover:bg-[#f5f0eb] transition"
              title="附加文件"
            >
              <Plus size={16} />
            </button>

            {/* 会话选择器 */}
            <button
              onClick={() => setShowSessionMenu(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] transition',
                showSessionMenu
                  ? 'bg-[#ede5dc] text-[#7a5c3a]'
                  : 'text-[#bbb] hover:text-[#666] hover:bg-[#f5f0eb]'
              )}
              title="会话历史"
            >
              <MessageSquare size={13} />
              <span className="truncate max-w-[100px] font-medium">
                {activeSession?.title ? activeSession.title.slice(0, 15) : 'Sessions'}
              </span>
              {showSessionMenu ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
            </button>

            <div className="flex-1" />

            {/* 智能体选择器 */}
            <AgentPicker
              agents={agents}
              activeAgentId={activeAgentId}
              onSelect={(id) => { setActiveAgent(id); setShowAgentMenu(false); }}
              open={showAgentMenu}
              onToggle={() => setShowAgentMenu(v => !v)}
            />

            {/* 模型选择器 */}
            <div className="relative">
              <button
                onClick={() => setShowModelMenu(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] text-[#888] hover:text-[#555] hover:bg-[#f5f0eb] transition"
              >
                <span className="font-medium truncate max-w-[160px]">{modelName}</span>
                <ChevronDown size={11} />
              </button>
              {showModelMenu && (
                <div className="absolute bottom-full right-0 mb-1 w-72 rounded-xl border border-[#e8e4e0] bg-white shadow-xl z-50 max-h-[300px] overflow-y-auto">
                  {profiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { activateProfile(p.id); setShowModelMenu(false); }}
                      className={cn(
                        'w-full text-left px-4 py-2.5 text-[13px] hover:bg-[#faf8f6] transition flex items-center gap-2',
                        p.is_active && 'bg-[#faf8f6]'
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full shrink-0', p.is_active ? 'bg-green-500' : 'bg-[#ddd]')} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[#333] truncate">{p.name}</div>
                        <div className="text-[11px] text-[#999] truncate">{p.model}</div>
                      </div>
                      {p.is_active && <span className="text-[10px] text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded">ACTIVE</span>}
                    </button>
                  ))}
                  {profiles.length === 0 && <div className="px-4 py-3 text-[12px] text-[#bbb]">暂无接入点</div>}
                </div>
              )}
            </div>

            {/* 发送/停止按钮 */}
            {isStreaming ? (
              <button
                onClick={abort}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 text-[13px] font-medium transition"
              >
                <Square size={13} />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!text.trim() && attachedFiles.length === 0}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-medium transition',
                  text.trim() || attachedFiles.length > 0
                    ? 'bg-[#c4a882] text-white hover:bg-[#b09670] shadow-sm'
                    : 'bg-[#f0ebe6] text-[#ccc] cursor-default'
                )}
              >
                <ArrowRight size={13} />
                <span>Run</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

function FileChip({ name, path, isDir, onRemove }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[12px] hover:border-[#c4a882] transition cursor-default',
        isDir ? 'bg-[#f5f0eb] border-[#d4cec6] text-[#8b5e3c]' : 'bg-[#f5f0eb] border-[#e0dbd5] text-[#666]'
      )}
      title={path}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {isDir ? (
        <Folder size={12} className="text-[#c4a882] shrink-0" />
      ) : (
        <FileText size={12} className="text-[#c4a882] shrink-0" />
      )}
      <span className="truncate max-w-[150px]">{name}{isDir ? '/' : ''}</span>
      <button
        onClick={onRemove}
        className={cn(
          'p-0.5 rounded transition',
          hover ? 'text-[#999] hover:text-red-400' : 'text-transparent'
        )}
      >
        <X size={10} />
      </button>
    </div>
  );
}

function AgentPicker({ agents, activeAgentId, onSelect, open, onToggle }) {
  const active = agents.find(a => a.id === activeAgentId);
  const agentName = active?.name || 'Agent';

  const AgentAvatar = ({ agent, size = 20 }) => {
    if (agent?.avatar?.startsWith('/api/')) {
      return <img src={agent.avatar} className="rounded-md object-cover shrink-0" style={{ width: size, height: size }} alt="" />;
    }
    return <Bot size={size - 4} className="text-[#c4a882]" />;
  };

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] text-[#888] hover:text-[#555] hover:bg-[#f5f0eb] transition"
      >
        <AgentAvatar agent={active} size={18} />
        <span className="font-medium truncate max-w-[100px]">{agentName}</span>
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-1 w-64 rounded-xl border border-[#e8e4e0] bg-white shadow-xl z-50 max-h-[300px] overflow-y-auto">
          <div className="px-3 py-2 text-[11px] text-[#bbb] border-b border-[#f0ebe6]">Choose Agent</div>
          {agents.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelect(a.id)}
              className={cn(
                'w-full text-left px-3 py-2.5 text-[13px] hover:bg-[#faf8f6] transition flex items-center gap-2.5',
                a.id === activeAgentId && 'bg-[#faf8f6]'
              )}
            >
              <span className="w-7 h-7 rounded-lg bg-[#f5f0eb] flex items-center justify-center shrink-0">
                <AgentAvatar agent={a} size={20} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#333] truncate">{a.name}</div>
                {a.description && (
                  <div className="text-[11px] text-[#999] truncate">{a.description}</div>
                )}
              </div>
              {a.id === activeAgentId && (
                <span className="text-[10px] text-[#c4a882] font-medium bg-[#fdf8f3] px-1.5 py-0.5 rounded shrink-0">Active</span>
              )}
            </button>
          ))}
          {agents.length === 0 && <div className="px-3 py-3 text-[12px] text-[#bbb] text-center">暂无智能体</div>}
        </div>
      )}
    </div>
  );
}

function SessionHistoryDropdown({ sessions, activeSessionId, onSelect, onDelete, onCreate, onClose }) {
  const [search, setSearch] = useState('');
  const [hoverId, setHoverId] = useState(null);
  const inputRef = useCallback((el) => el?.focus(), []);

  const filtered = useMemo(() => {
    if (!search.trim()) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(s => (s.title || '').toLowerCase().includes(q));
  }, [sessions, search]);

  const grouped = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const result = { today: [], yesterday: [], older: [] };
    for (const s of filtered) {
      const t = new Date(s.updated_at || s.created_at).getTime();
      if (t >= today) result.today.push(s);
      else if (t >= yesterday) result.yesterday.push(s);
      else result.older.push(s);
    }
    return result;
  }, [filtered]);

  const renderGroup = (label, items) => {
    if (items.length === 0) return null;
    return (
      <div key={label}>
        <div className="px-3 py-1.5 text-[10px] font-medium text-[#aaa] uppercase tracking-wider">{label}</div>
        {items.map(s => (
          <div
            key={s.id}
            className="relative"
            onMouseEnter={() => setHoverId(s.id)}
            onMouseLeave={() => setHoverId(null)}
          >
            <button
              onClick={() => onSelect(s.id)}
              className={cn(
                'w-full text-left px-3 py-2 text-[13px] transition-all flex items-center gap-2',
                s.id === activeSessionId
                  ? 'bg-[#ede5dc] text-[#3a2f24] font-medium'
                  : 'text-[#555] hover:bg-[#faf8f6]'
              )}
            >
              <span className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                s.id === activeSessionId ? 'bg-[#c4a882]' : 'bg-transparent'
              )} />
              <span className="truncate flex-1">{s.title || '未命名会话'}</span>
              {hoverId === s.id && s.id !== activeSessionId && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                  className="p-1 rounded text-[#ddd] hover:text-red-400 transition shrink-0"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="absolute bottom-full left-0 right-0 z-50 max-w-3xl mx-auto px-6">
      <div className="rounded-xl border border-[#e8e4e0] bg-white shadow-xl max-h-[340px] flex flex-col overflow-hidden mb-1">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f0ebe6]">
          <Search size={13} className="text-[#bbb] shrink-0" />
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
            placeholder="搜索会话..."
            className="flex-1 text-[13px] text-[#333] placeholder-[#bbb] outline-none bg-transparent"
          />
          <button
            onClick={onCreate}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-[#c4a882] hover:bg-[#f5f0eb] transition shrink-0"
          >
            <Plus size={12} />
            New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollable">
          {renderGroup('Today', grouped.today)}
          {renderGroup('Yesterday', grouped.yesterday)}
          {renderGroup('Earlier', grouped.older)}
          {filtered.length === 0 && (
            <div className="text-center text-[12px] text-[#bbb] py-6">暂无会话</div>
          )}
        </div>
      </div>
    </div>
  );
}

function autoResize(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}
