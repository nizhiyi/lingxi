import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, RotateCcw, FileText, ChevronDown, ChevronRight, Clock, File, Loader2 } from 'lucide-react';
import { cn } from '../../ui/cn';
import { useStore } from '../../state/useStore';
import { api } from '../../api/client';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function CheckpointItem({ cp, rolling, onRollback, projectPath }) {
  const [expanded, setExpanded] = useState(false);
  const [files, setFiles] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [diffFile, setDiffFile] = useState(null);
  const [diffContent, setDiffContent] = useState('');
  const [loadingDiff, setLoadingDiff] = useState(false);

  const toggleExpand = useCallback(async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (files !== null) return;
    setLoadingFiles(true);
    try {
      const res = await api.getCheckpointFiles(cp.id);
      setFiles(res?.files || []);
    } catch {
      setFiles([]);
    }
    setLoadingFiles(false);
  }, [expanded, files, cp.id]);

  const viewDiff = useCallback(async (filePath) => {
    if (diffFile === filePath) {
      setDiffFile(null);
      return;
    }
    setDiffFile(filePath);
    setLoadingDiff(true);
    try {
      const res = await api.getCodingDiff(projectPath, filePath);
      setDiffContent(res?.diff || '(no diff available)');
    } catch {
      setDiffContent('(failed to load diff)');
    }
    setLoadingDiff(false);
  }, [diffFile, projectPath]);

  return (
    <div className="rounded-lg border border-[var(--cx-border)] bg-[var(--cx-surface)] mb-1.5 overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--cx-surface-2)] transition-colors cursor-pointer group"
        onClick={toggleExpand}
      >
        <div className="w-2 h-2 rounded-full bg-[var(--cx-accent)] shrink-0" />
        <Clock size={10} className="text-[var(--cx-text-3)]" />
        <span className="text-[10px] font-mono text-[var(--cx-text-2)]">
          {formatTime(cp.created_at)}
        </span>
        {cp.files_count > 0 && (
          <span className="text-[9px] text-[var(--cx-text-3)] flex items-center gap-0.5">
            <FileText size={8} />
            {cp.files_count} files
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={(e) => { e.stopPropagation(); onRollback(cp); }}
          disabled={rolling === cp.id}
          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--cx-warning)]/15 text-[var(--cx-warning)] text-[10px] font-medium hover:bg-[var(--cx-warning)]/25 transition-all"
        >
          <RotateCcw size={10} className={cn(rolling === cp.id && 'animate-spin')} />
          Rollback
        </button>
        {cp.files_count > 0 && (
          expanded
            ? <ChevronDown size={11} className="text-[var(--cx-text-3)]" />
            : <ChevronRight size={11} className="text-[var(--cx-text-3)]" />
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 border-t border-[var(--cx-border)]">
              {loadingFiles ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 size={11} className="text-[var(--cx-accent)] animate-spin" />
                  <span className="text-[10px] text-[var(--cx-text-3)]">Loading files…</span>
                </div>
              ) : files && files.length > 0 ? (
                <div className="space-y-0.5 pt-1.5">
                  {files.map((f, i) => (
                    <div key={i}>
                      <button
                        onClick={() => viewDiff(f.path)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-colors text-[10px]",
                          diffFile === f.path
                            ? "bg-[var(--cx-accent-soft)] text-[var(--cx-accent)]"
                            : "hover:bg-[var(--cx-surface-2)] text-[var(--cx-text-2)]"
                        )}
                      >
                        <File size={10} className="shrink-0" />
                        <span className="font-mono truncate">{f.path}</span>
                      </button>
                      <AnimatePresence>
                        {diffFile === f.path && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-4 mt-1 mb-1 rounded border border-[var(--cx-border)] bg-[#1e1e2e] overflow-auto max-h-[200px]">
                              {loadingDiff ? (
                                <div className="p-2 flex items-center gap-2">
                                  <Loader2 size={10} className="text-[var(--cx-accent)] animate-spin" />
                                  <span className="text-[10px] text-[#cdd6f4]">Loading diff…</span>
                                </div>
                              ) : (
                                <pre className="p-2 text-[10px] font-mono leading-[1.6] text-[#cdd6f4] whitespace-pre-wrap break-words">
                                  {diffContent.split('\n').map((line, li) => (
                                    <div
                                      key={li}
                                      className={cn(
                                        line.startsWith('+') && !line.startsWith('+++') && 'text-[#a6e3a1] bg-[#a6e3a1]/10',
                                        line.startsWith('-') && !line.startsWith('---') && 'text-[#f38ba8] bg-[#f38ba8]/10',
                                        line.startsWith('@@') && 'text-[#89b4fa]'
                                      )}
                                    >
                                      {line}
                                    </div>
                                  ))}
                                </pre>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-2 text-[10px] text-[var(--cx-text-3)]">No files in this checkpoint</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CheckpointTimeline() {
  const checkpoints = useStore((s) => s.codingCheckpoints) || [];
  const activeSessionId = useStore((s) => s.activeSessionId);
  const projectPath = useStore((s) => s.codingProjectPath);
  const loadCodingMessages = useStore((s) => s.loadCodingMessages);
  const [rolling, setRolling] = useState(null);
  const [expanded, setExpanded] = useState(false);

  if (checkpoints.length === 0) return null;

  const handleRollback = async (cp) => {
    if (!activeSessionId || !cp.id) return;
    setRolling(cp.id);
    try {
      await api.rollbackCheckpoint(cp.id);
      await loadCodingMessages(activeSessionId);
    } catch { /* ignore */ }
    setRolling(null);
  };

  return (
    <div className="border-b border-[var(--cx-border)] bg-[var(--cx-surface)]">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[var(--cx-surface-2)] transition-colors"
      >
        <History size={13} className="text-[var(--cx-accent)]" />
        <span className="text-[11px] font-semibold text-[var(--cx-text-2)]">
          Checkpoints ({checkpoints.length})
        </span>
        <div className="flex-1" />
        {expanded ? <ChevronDown size={11} className="text-[var(--cx-text-3)]" /> : <ChevronRight size={11} className="text-[var(--cx-text-3)]" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">
              {[...checkpoints].reverse().map((cp, i) => (
                <CheckpointItem
                  key={cp.id || i}
                  cp={cp}
                  rolling={rolling}
                  onRollback={handleRollback}
                  projectPath={projectPath}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
