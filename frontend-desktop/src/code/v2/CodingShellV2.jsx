import { useEffect, useState, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronRight, Folder, ArrowLeft, Home, Copy, Check, Edit3, Save, FolderOpen } from 'lucide-react';
import { cn } from '../../ui/cn';
import { useStore, initStore } from '../../state/useStore';
import { IconSidebar } from './IconSidebar';
import { SessionListPanel } from './SessionListPanel';
import { ComposerV2 } from './ComposerV2';
import { MessageStream } from './MessageStream';
import { EnvironmentPanel } from './EnvironmentPanel';
import { AskQuestionDialog } from './AskQuestionDialog';
import { SettingsPanel } from './SettingsPanel';
import { CostIndicator } from './CostIndicator';
import { CodingErrorBoundary } from '../CodingErrorBoundary';
import { TerminalPanel } from '../TerminalPanel';
import { FileSidebar } from '../FileSidebar';
import { ToastStack } from '../../ui/primitives';
import { api } from '../../api/client';
import { applyCodexTheme, getCodexTheme } from './codexTheme';
import { TeamSetupWizard } from './TeamSetupWizard';
import { TeamProgressView } from './TeamProgressView';
import { SubAgentCard } from './SubAgentCard';

function FilePreviewModal({ filePath, onClose }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!filePath) return;
    setLoading(true);
    api.readFile(filePath).then(res => {
      setContent(res?.content || '');
      setEditContent(res?.content || '');
      setLoading(false);
    }).catch(() => { setContent(''); setLoading(false); });
  }, [filePath]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.writeFile(filePath, editContent);
      setContent(editContent);
      setEditing(false);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fileName = filePath?.split('/').pop() || '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[90vw] max-w-[900px] h-[80vh] flex flex-col bg-[var(--cx-surface)] border border-[var(--cx-border)] rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--cx-border)] bg-[var(--cx-surface-2)] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[12px] font-semibold text-[var(--cx-text)] truncate">{fileName}</span>
            <span className="text-[10px] text-[var(--cx-text-3)] font-mono truncate max-w-[400px]">{filePath}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-[var(--cx-surface-3)] text-[var(--cx-text-3)] transition-colors" title="Copy">
              {copied ? <Check size={13} className="text-[var(--cx-success)]" /> : <Copy size={13} />}
            </button>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="p-1.5 rounded-md hover:bg-[var(--cx-surface-3)] text-[var(--cx-text-3)] transition-colors" title="Edit">
                <Edit3 size={13} />
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-md hover:bg-[var(--cx-accent-soft)] text-[var(--cx-accent)] transition-colors" title="Save">
                <Save size={13} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[var(--cx-surface-3)] text-[var(--cx-text-3)] transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-0 font-mono text-[12px] leading-[1.7] bg-[#1e1e2e]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-[var(--cx-text-3)]">Loading...</div>
          ) : editing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-full p-4 bg-transparent text-[#cdd6f4] resize-none focus:outline-none"
              spellCheck={false}
            />
          ) : (
            <pre className="p-4 text-[#cdd6f4] whitespace-pre-wrap break-words">{content || '(empty file)'}</pre>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function DirectoryBrowserModal({ open, onClose, onSelect, initialPath }) {
  const [currentPath, setCurrentPath] = useState(initialPath || '');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const loadDir = useCallback(async (dirPath) => {
    setLoading(true);
    try {
      const res = await api.listDirectory(dirPath || '');
      setCurrentPath(res.path || dirPath);
      setManualInput(res.path || dirPath);
      setEntries((res.entries || []).filter((e) => e.is_dir));
    } catch { setEntries([]); }
    setLoading(false);
  }, []);

  useEffect(() => { if (open) loadDir(initialPath || ''); }, [open, initialPath, loadDir]);

  if (!open) return null;
  const parentPath = currentPath ? currentPath.split('/').slice(0, -1).join('/') || '/' : '/';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--cx-surface)] rounded-xl shadow-2xl w-[90vw] max-w-lg max-h-[70vh] flex flex-col overflow-hidden border border-[var(--cx-border)]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--cx-border)]">
          <h3 className="text-[14px] font-semibold text-[var(--cx-text)]">Select Project Directory</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--cx-surface-2)] text-[var(--cx-text-3)]"><X size={16} /></button>
        </div>
        <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--cx-border)]">
          <button onClick={() => loadDir(parentPath)} className="p-1.5 rounded-lg hover:bg-[var(--cx-surface-2)] text-[var(--cx-text-3)]"><ArrowLeft size={14} /></button>
          <button onClick={() => loadDir('')} className="p-1.5 rounded-lg hover:bg-[var(--cx-surface-2)] text-[var(--cx-text-3)]"><Home size={14} /></button>
          <input
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') loadDir(manualInput); }}
            className="flex-1 px-2 py-1 text-[12px] rounded-md border border-[var(--cx-border)] bg-[var(--cx-bg)] text-[var(--cx-text)] focus:outline-none focus:border-[var(--cx-border-active)]"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-[var(--cx-accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10 text-[12px] text-[var(--cx-text-3)]">No subdirectories</div>
          ) : (
            entries.map((e) => (
              <button key={e.path} onClick={() => loadDir(e.path)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--cx-surface-2)] transition-colors border-b border-[var(--cx-border)]">
                <Folder size={15} className="text-[var(--cx-accent)] shrink-0" />
                <span className="text-[12px] text-[var(--cx-text)] truncate flex-1">{e.name}</span>
                <ChevronRight size={13} className="text-[var(--cx-text-3)] shrink-0" />
              </button>
            ))
          )}
        </div>
        <div className="px-4 py-3 border-t border-[var(--cx-border)] flex items-center justify-between gap-3">
          <div className="text-[11px] text-[var(--cx-text-3)] truncate flex-1 font-mono">{currentPath}</div>
          <button
            onClick={() => { onSelect(currentPath); onClose(); }}
            className="px-4 py-1.5 rounded-lg bg-[var(--cx-accent)] text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
          >
            Select
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function PageFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[var(--cx-accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function CodingShellV2() {
  const notifications = useStore((s) => s.notifications);
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const authChecked = useStore((s) => s.authChecked);
  const projectPath = useStore((s) => s.codingProjectPath);
  const setCodingProjectPath = useStore((s) => s.setCodingProjectPath);
  const refreshSessions = useStore((s) => s.refreshSessions);
  const setActiveSession = useStore((s) => s.setActiveSession);
  const createSession = useStore((s) => s.createSession);
  const codingSendMessage = useStore((s) => s.codingSendMessage);
  const codingThinkingEnabled = useStore((s) => s.codingThinkingEnabled);
  const codingMode = useStore((s) => s.codingMode);
  const setCodingMode = useStore((s) => s.setCodingMode);
  const codingPermissionMode = useStore((s) => s.codingPermissionMode);
  const setCodingPermissionMode = useStore((s) => s.setCodingPermissionMode);

  const codingTerminalOpen = useStore((s) => s.codingTerminalOpen);
  const toggleCodingTerminal = useStore((s) => s.toggleCodingTerminal);
  const subAgents = useStore((s) => s.subAgents);
  const liveBlocks = useStore((s) => s.codingLiveBlocks);

  const enrichedAgents = useMemo(() => {
    if (subAgents.length === 0) return subAgents;
    const recentTools = liveBlocks
      .filter(b => b.type === 'tool' && !b.parent_tool_use_id)
      .slice(-5)
      .map(b => ({ name: b.name || '', ts: b.startedAt || Date.now(), done: !!b.done, endedAt: b.endedAt }));
    return subAgents.map(a => {
      if (a.status === 'working' && (!a.toolActivities || a.toolActivities.length === 0) && recentTools.length > 0) {
        return { ...a, toolActivities: recentTools };
      }
      return a;
    });
  }, [subAgents, liveBlocks]);

  const [sidebarAction, setSidebarAction] = useState(null);
  const [sessionsVisible, setSessionsVisible] = useState(false);
  const [envPanelVisible, setEnvPanelVisible] = useState(false);
  const [fileTreeVisible, setFileTreeVisible] = useState(false);
  const [previewFilePath, setPreviewFilePath] = useState(null);
  const [dirBrowserOpen, setDirBrowserOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [codingView, setCodingView] = useState('chat');
  const [teamWizardOpen, setTeamWizardOpen] = useState(false);
  const [activeTeam, setActiveTeam] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const composerRef = useRef(null);

  useEffect(() => { initStore(); }, []);
  useEffect(() => { applyCodexTheme(getCodexTheme()); }, []);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const applyNewProject = useCallback(async (newPath) => {
    if (newPath && newPath !== projectPath) {
      setCodingProjectPath(newPath);
      const sessions = await refreshSessions();
      if (sessions?.length > 0) await setActiveSession(sessions[0].id);
      else await setActiveSession(null);
    }
  }, [projectPath, setCodingProjectPath, refreshSessions, setActiveSession]);

  const handleChangeProject = useCallback(async () => {
    if (window.electronAPI?.selectDirectory) {
      const selected = await window.electronAPI.selectDirectory();
      if (selected) await applyNewProject(selected);
    } else {
      setDirBrowserOpen(true);
    }
  }, [applyNewProject]);

  const handleNewSession = useCallback(async () => {
    await createSession();
  }, [createSession]);

  const handleIconAction = useCallback((action) => {
    switch (action) {
      case 'new':
        handleNewSession();
        break;
      case 'search':
        setSidebarAction(a => a === 'search' ? null : 'search');
        setSessionsVisible(v => !v);
        break;
      case 'terminal':
        toggleCodingTerminal();
        break;
      case 'files':
        setFileTreeVisible(v => !v);
        break;
      case 'plugins':
        setCodingView('settings');
        break;
      case 'automation':
        setCodingView('settings');
        break;
      case 'mobile':
        setCodingView('settings-remote');
        break;
      case 'project':
        handleChangeProject();
        break;
      case 'settings':
        setCodingView(v => v === 'settings' ? 'chat' : 'settings');
        break;
      case 'switch':
        useStore.getState().setAppMode('main');
        break;
      default:
        break;
    }
    if (action !== 'search' && action !== 'files') setSidebarAction(action);
  }, [handleNewSession, handleChangeProject, toggleCodingTerminal]);

  const handleSend = useCallback((text, attachedFiles, images) => {
    let msg = text;
    if (attachedFiles?.length > 0) {
      const refs = attachedFiles.map(f => f.isDir ? `[目录: ${f.path}]` : `@${f.path}`).join(' ');
      msg = `${refs}\n\n${text}`;
    }
    const imgs = images?.map(({ mediaType, data }) => ({ mediaType, data })) || [];
    const files = attachedFiles?.filter(f => f.content).map(f => ({ name: f.name, ext: f.ext, content: f.content })) || [];
    codingSendMessage({ message: msg, workingDir: projectPath || '', images: imgs, files, thinking: codingThinkingEnabled });
  }, [codingSendMessage, projectPath, codingThinkingEnabled]);

  // Auth checks
  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--cx-bg)]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--cx-accent-soft)] flex items-center justify-center mx-auto">
            <span className="text-[var(--cx-accent)] font-bold text-lg font-mono">&gt;_</span>
          </div>
          <p className="text-[12px] text-[var(--cx-text-3)]">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    const LoginPage = lazy(() => import('../../LoginPage'));
    return (
      <Suspense fallback={<PageFallback />}>
        <LoginPage />
        <ToastStack items={notifications} />
      </Suspense>
    );
  }

  const handleModeChange = useCallback((mode) => {
    setCodingMode(mode);
    if (mode === 'teams') setTeamWizardOpen(true);
  }, [setCodingMode]);

  const handleTeamStart = useCallback((config) => {
    setTeamWizardOpen(false);
    setActiveTeam({
      id: `team_${Date.now()}`,
      agents: config.roles.map((r, i) => ({
        id: `agent_${i}`,
        name: r.name,
        role: r.description,
        status: 'working',
        output: '',
      })),
      requirement: config.requirement,
    });
  }, []);

  return (
    <CodingErrorBoundary title="Coding View Error">
      <div className="h-screen flex bg-[var(--cx-bg)] text-[var(--cx-text)] overflow-hidden">
        {/* Mobile header */}
        {isMobile && (
          <div className="absolute top-0 left-0 right-0 z-40 h-12 flex items-center px-3 border-b border-[var(--cx-border)] bg-[var(--cx-surface)] backdrop-blur-lg safe-area-top">
            <button onClick={() => setMobileMenuOpen(v => !v)} className="p-2 rounded-lg hover:bg-[var(--cx-surface-2)] text-[var(--cx-text-2)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
            </button>
            <button
              onClick={handleChangeProject}
              className="flex-1 flex items-center justify-center gap-1.5 mx-2 px-2 py-1 rounded-lg active:bg-[var(--cx-surface-2)] transition min-w-0"
            >
              <Folder size={13} className="text-[var(--cx-accent)] shrink-0" />
              <span className="text-[12px] font-semibold text-[var(--cx-text)] truncate">
                {projectPath ? projectPath.split('/').pop() : 'Select Project'}
              </span>
            </button>
            <button
              onClick={() => useStore.getState().setAppMode('main')}
              className="p-2 rounded-lg hover:bg-[var(--cx-surface-2)] text-[var(--cx-text-3)] text-[11px] shrink-0"
            >
              Exit
            </button>
          </div>
        )}

        {/* Left: Icon sidebar (desktop only) */}
        {!isMobile && (
          <IconSidebar onAction={handleIconAction} activeAction={sidebarAction} />
        )}

        {/* Session list panel (desktop only) */}
        {!isMobile && (
          <SessionListPanel
            visible={sessionsVisible}
            onClose={() => setSessionsVisible(false)}
            onNewSession={handleNewSession}
          />
        )}

        {/* File tree panel (toggleable) */}
        {!isMobile && fileTreeVisible && projectPath && (
          <div
            className="w-[240px] h-full border-r border-[var(--cx-border)] bg-[var(--cx-surface)] shrink-0 overflow-hidden"
            style={{
              '--text-faint': 'var(--cx-text-3)',
              '--text-soft': 'var(--cx-text-2)',
              '--text': 'var(--cx-text)',
              '--accent-soft': 'var(--cx-accent-soft)',
              '--coding-border': 'var(--cx-border)',
              '--coding-surface': 'var(--cx-surface)',
              '--coding-surface-raised': 'var(--cx-surface-2)',
            }}
          >
            <FileSidebar projectPath={projectPath} onFileSelect={(filePath) => {
              setPreviewFilePath(filePath);
            }} onClose={() => setFileTreeVisible(false)} embedded />
          </div>
        )}

        {/* Main content area */}
        <div className={cn('flex-1 flex flex-col min-h-0 min-w-0', isMobile && 'pt-12')}>
          {/* Top bar (desktop only) */}
          {!isMobile && (
            <div className="h-10 flex items-center justify-between px-4 border-b border-[var(--cx-border)] bg-[var(--cx-surface)] shrink-0 app-drag">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--cx-success)] animate-pulse" />
                <span className="text-[11px] text-[var(--cx-text-2)] font-medium">
                  {projectPath ? projectPath.split('/').pop() : 'No project'}
                </span>
                {projectPath && !isMobile && (
                  <span className="text-[10px] text-[var(--cx-text-3)] font-mono truncate max-w-[200px]">
                    {projectPath}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 app-no-drag">
                <button
                  onClick={() => setFileTreeVisible(v => !v)}
                  className={cn(
                    "text-[11px] transition-colors px-2 py-0.5 rounded-md",
                    fileTreeVisible
                      ? "text-[var(--cx-accent)] bg-[var(--cx-accent-soft)]"
                      : "text-[var(--cx-text-3)] hover:text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-2)]"
                  )}
                >
                  Files
                </button>
                <button
                  onClick={() => setSessionsVisible(v => !v)}
                  className="text-[11px] text-[var(--cx-text-3)] hover:text-[var(--cx-text-2)] transition-colors px-2 py-0.5 rounded-md hover:bg-[var(--cx-surface-2)]"
                >
                  Sessions
                </button>
                <button
                  onClick={() => setEnvPanelVisible(v => !v)}
                  className="text-[11px] text-[var(--cx-text-3)] hover:text-[var(--cx-text-2)] transition-colors px-2 py-0.5 rounded-md hover:bg-[var(--cx-surface-2)]"
                >
                  Environment
                </button>
              </div>
            </div>
          )}

          {/* Chat / Settings / Teams */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
              {codingView === 'chat' && !activeTeam && (
                <>
                  <MessageStream projectPath={projectPath} />
                  <AskQuestionDialog />
                  <ComposerV2
                    ref={composerRef}
                    onSend={handleSend}
                    disabled={false}
                    projectPath={projectPath}
                    permissionMode={codingPermissionMode}
                    onPermissionModeChange={setCodingPermissionMode}
                    mode={codingMode}
                    onModeChange={handleModeChange}
                  />
                </>
              )}
              {codingView === 'chat' && activeTeam && (
                <TeamProgressView
                  team={activeTeam}
                  onStop={() => setActiveTeam(null)}
                />
              )}
              {(codingView === 'settings' || codingView === 'settings-remote') && (
                <SettingsPanel
                  onClose={() => setCodingView('chat')}
                  initialTab={codingView === 'settings-remote' ? 'remote' : undefined}
                />
              )}
            </div>

            {/* Right: Environment panel (desktop only) */}
            {!isMobile && (
              <EnvironmentPanel visible={envPanelVisible} projectPath={projectPath} />
            )}
          </div>

          {/* Terminal panel (bottom, toggleable) */}
          {codingTerminalOpen && !isMobile && (
            <TerminalPanel projectPath={projectPath} onClose={toggleCodingTerminal} />
          )}
        </div>

        {/* Floating Sub-agent card (right-center, only when agents active) */}
        <AnimatePresence>
          {subAgents.length > 0 && !isMobile && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed right-4 top-1/2 -translate-y-1/2 z-50 w-[260px] max-h-[50vh] overflow-y-auto shadow-2xl rounded-xl"
            >
              <SubAgentCard agents={enrichedAgents} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Team setup wizard */}
        <AnimatePresence>
          {teamWizardOpen && (
            <TeamSetupWizard
              onStart={handleTeamStart}
              onCancel={() => { setTeamWizardOpen(false); setCodingMode('agent'); }}
            />
          )}
        </AnimatePresence>

        {/* Directory browser modal */}
        <AnimatePresence>
          {dirBrowserOpen && (
            <DirectoryBrowserModal
              open={dirBrowserOpen}
              onClose={() => setDirBrowserOpen(false)}
              onSelect={applyNewProject}
              initialPath={projectPath}
            />
          )}
        </AnimatePresence>

        {/* File preview modal */}
        <AnimatePresence>
          {previewFilePath && (
            <FilePreviewModal filePath={previewFilePath} onClose={() => setPreviewFilePath(null)} />
          )}
        </AnimatePresence>

        {/* Mobile drawer */}
        <AnimatePresence>
          {isMobile && mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            >
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-0 left-0 bottom-0 w-[260px] bg-[var(--cx-surface)] border-r border-[var(--cx-border)]"
              >
                <div className="flex flex-col h-full">
                  {/* Project selector in mobile drawer */}
                  <button
                    onClick={() => { setMobileMenuOpen(false); handleChangeProject(); }}
                    className="mx-3 mt-3 mb-2 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--cx-accent-soft)] border border-[var(--cx-border)] text-[12px] text-[var(--cx-accent)] font-medium active:scale-[0.98] transition shrink-0"
                  >
                    <FolderOpen size={14} />
                    <span className="truncate">{projectPath ? projectPath.split('/').pop() : 'Select Project'}</span>
                  </button>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <SessionListPanel visible={true} onClose={() => setMobileMenuOpen(false)} onNewSession={handleNewSession} />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toasts */}
        <ToastStack items={notifications} />
      </div>
    </CodingErrorBoundary>
  );
}

