import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch, FileText, ChevronRight, ChevronDown, RefreshCw,
  X, FolderOpen, GitCommit, Globe, Users, FilePlus, FileEdit,
  FileX, File, Copy, Check,
} from 'lucide-react';
import { cn } from '../../ui/cn';
import { useStore } from '../../state/useStore';
import { api } from '../../api/client';

function StatusBadge({ type }) {
  const config = {
    M: { label: 'M', color: 'bg-amber-500/20 text-amber-400', title: '修改' },
    A: { label: 'A', color: 'bg-green-500/20 text-green-400', title: '新增' },
    D: { label: 'D', color: 'bg-red-500/20 text-red-400', title: '删除' },
    U: { label: 'U', color: 'bg-blue-500/20 text-blue-400', title: '未追踪' },
    '?': { label: '?', color: 'bg-gray-500/20 text-gray-400', title: '未知' },
  };
  const c = config[type] || config['?'];
  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold', c.color)} title={c.title}>
      {c.label}
    </span>
  );
}

function StatusIcon({ type }) {
  switch (type) {
    case 'A': return <FilePlus size={12} className="text-green-400" />;
    case 'D': return <FileX size={12} className="text-red-400" />;
    case 'M': return <FileEdit size={12} className="text-amber-400" />;
    default: return <File size={12} className="text-gray-400" />;
  }
}

function SectionHeader({ title, count, open, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-2)] transition-colors"
    >
      {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      <span>{title}</span>
      {count != null && <span className="ml-auto text-[var(--cx-text-3)]">{count}</span>}
    </button>
  );
}

function DiffModal({ file, projectPath, onClose }) {
  const [diff, setDiff] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!file || !projectPath) return;
    setLoading(true);
    api.getCodingDiff(projectPath, file.path || file.file)
      .then(res => setDiff(res.diff || ''))
      .catch(() => setDiff(''))
      .finally(() => setLoading(false));
  }, [file, projectPath]);

  const handleCopy = () => {
    navigator.clipboard.writeText(file.path || file.file);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!file) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-[90vw] max-w-[800px] max-h-[80vh] flex flex-col bg-[var(--cx-surface)] border border-[var(--cx-border)] rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--cx-border)] shrink-0">
          <div className="flex items-center gap-2">
            <StatusIcon type={file.status} />
            <span className="text-[12px] font-mono font-medium text-[var(--cx-text)]">{file.path || file.file}</span>
            <button onClick={handleCopy} className="p-1 rounded hover:bg-[var(--cx-surface-2)] text-[var(--cx-text-3)]">
              {copied ? <Check size={11} /> : <Copy size={11} />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {file.additions != null && <span className="text-[10px] text-green-400 font-mono">+{file.additions}</span>}
            {file.deletions != null && <span className="text-[10px] text-red-400 font-mono">-{file.deletions}</span>}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--cx-surface-2)] text-[var(--cx-text-3)]">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-0 font-mono text-[11px] leading-[1.6]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-[var(--cx-accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !diff ? (
            <div className="text-center py-12 text-[var(--cx-text-3)]">无变更内容（可能是新文件或二进制文件）</div>
          ) : (
            <pre className="p-0 m-0">
              {diff.split('\n').map((line, i) => {
                let bg = '';
                let textColor = 'text-[var(--cx-text-2)]';
                if (line.startsWith('+') && !line.startsWith('+++')) {
                  bg = 'bg-green-500/10';
                  textColor = 'text-green-300';
                } else if (line.startsWith('-') && !line.startsWith('---')) {
                  bg = 'bg-red-500/10';
                  textColor = 'text-red-300';
                } else if (line.startsWith('@@')) {
                  bg = 'bg-blue-500/10';
                  textColor = 'text-blue-300';
                }
                return (
                  <div key={i} className={cn('px-4 py-0', bg, textColor)}>
                    {line || ' '}
                  </div>
                );
              })}
            </pre>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function EnvironmentPanel({ visible, projectPath }) {
  const gitBranch = useStore((s) => s.gitBranch);
  const refreshGitBranch = useStore((s) => s.refreshGitBranch);
  const codingSubAgents = useStore((s) => s.subAgents) || [];
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const [sections, setSections] = useState({
    changes: true,
    local: true,
    branch: true,
    commit: false,
    subagents: true,
    source: false,
  });

  const toggleSection = (key) => setSections(prev => ({ ...prev, [key]: !prev[key] }));

  const fetchChanges = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    try {
      const res = await api.getCodingChanges(projectPath);
      setChanges(res.changes || []);
    } catch { setChanges([]); }
    setLoading(false);
  }, [projectPath]);

  useEffect(() => {
    if (visible && projectPath) {
      fetchChanges();
      refreshGitBranch?.();
    }
  }, [visible, projectPath, fetchChanges, refreshGitBranch]);

  useEffect(() => {
    if (!visible) return;
    const iv = setInterval(fetchChanges, 30000);
    return () => clearInterval(iv);
  }, [visible, fetchChanges]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          className="h-full flex flex-col border-l border-[var(--cx-border)] bg-[var(--cx-surface)] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--cx-border)] shrink-0">
            <span className="text-[11px] font-semibold text-[var(--cx-text-2)]">
              环境信息
            </span>
            <button
              onClick={fetchChanges}
              className={cn('p-1 rounded hover:bg-[var(--cx-surface-2)] text-[var(--cx-text-3)]', loading && 'animate-spin')}
            >
              <RefreshCw size={12} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollable">
            {/* Changes section */}
            <SectionHeader title="变更" count={changes.length} open={sections.changes} onToggle={() => toggleSection('changes')} />
            {sections.changes && (
              <div className="px-2 pb-2">
                {changes.length === 0 ? (
                  <div className="text-[10px] text-[var(--cx-text-3)] px-2 py-1">无变更</div>
                ) : (
                  <div className="space-y-0.5">
                    {changes.map((file, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedFile(file)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--cx-surface-2)] transition-colors text-left group"
                      >
                        <StatusIcon type={file.status} />
                        <span className="flex-1 text-[10px] text-[var(--cx-text-2)] truncate font-mono">
                          {file.path || file.file}
                        </span>
                        {file.additions != null && (
                          <span className="text-[9px] text-green-400 font-mono">+{file.additions}</span>
                        )}
                        {file.deletions != null && (
                          <span className="text-[9px] text-red-400 font-mono">-{file.deletions}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Local section */}
            <SectionHeader title="本地" open={sections.local} onToggle={() => toggleSection('local')} />
            {sections.local && (
              <div className="px-3 pb-2 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--cx-text-2)]">
                  <FolderOpen size={11} className="text-[var(--cx-accent)]" />
                  <span className="font-mono truncate">{projectPath || '未选择'}</span>
                </div>
              </div>
            )}

            {/* Branch */}
            <SectionHeader title="分支" open={sections.branch} onToggle={() => toggleSection('branch')} />
            {sections.branch && (
              <div className="px-3 pb-2">
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--cx-text-2)]">
                  <GitBranch size={11} className="text-[var(--cx-accent)]" />
                  <span className="font-mono">{gitBranch || 'main'}</span>
                </div>
              </div>
            )}

            {/* Commit */}
            <SectionHeader title="提交" open={sections.commit} onToggle={() => toggleSection('commit')} />
            {sections.commit && (
              <div className="px-3 pb-2">
                <div className="text-[10px] text-[var(--cx-text-3)]">最近提交记录</div>
              </div>
            )}

            {/* Sub-agents */}
            {codingSubAgents.length > 0 && (
              <>
                <SectionHeader title="子智能体" count={codingSubAgents.length} open={sections.subagents} onToggle={() => toggleSection('subagents')} />
                {sections.subagents && (
                  <div className="px-2 pb-2 space-y-1">
                    {codingSubAgents.map((agent, i) => (
                      <div key={agent.id || i} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[var(--cx-surface-2)]">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          agent.status === 'done' ? 'bg-[var(--cx-success)]' :
                          agent.status === 'error' ? 'bg-[var(--cx-error)]' : 'bg-[var(--cx-accent)] animate-pulse'
                        )} />
                        <span className="text-[10px] text-[var(--cx-text-2)] truncate flex-1">
                          {agent.description || agent.name || `Agent ${i + 1}`}
                        </span>
                        <span className="text-[9px] text-[var(--cx-text-3)]">
                          ({agent.model || 'explorer'})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Source */}
            <SectionHeader title="来源" open={sections.source} onToggle={() => toggleSection('source')} />
            {sections.source && (
              <div className="px-3 pb-2">
                <div className="text-[10px] text-[var(--cx-text-3)]">暂无来源</div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Diff modal */}
      {selectedFile && (
        <DiffModal
          file={selectedFile}
          projectPath={projectPath}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </AnimatePresence>
  );
}
