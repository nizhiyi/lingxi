import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, XIcon, FileText, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { cn } from '../../ui/cn';
import { useStore } from '../../state/useStore';
import { api } from '../../api/client';

function parseDiffHunks(diffText) {
  if (!diffText) return [];
  const lines = diffText.split('\n');
  const hunks = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      if (current) hunks.push(current);
      current = { header: line, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) hunks.push(current);
  return hunks;
}

function DiffHunk({ hunk, index, onAccept, onReject, status }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={cn(
      'rounded-lg border overflow-hidden',
      status === 'accepted' ? 'border-[var(--cx-success)]/30' :
      status === 'rejected' ? 'border-[var(--cx-error)]/30 opacity-60' :
      'border-[var(--cx-border)]'
    )}>
      {/* Hunk header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--cx-surface-2)]">
        <button onClick={() => setExpanded(v => !v)} className="text-[var(--cx-text-3)]">
          {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
        <span className="text-[10px] font-mono text-[var(--cx-text-3)] flex-1 truncate">{hunk.header}</span>
        {!status && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAccept(index)}
              className="px-2 py-0.5 rounded text-[9px] font-semibold bg-[var(--cx-success)]/15 text-[var(--cx-success)] hover:bg-[var(--cx-success)]/25 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() => onReject(index)}
              className="px-2 py-0.5 rounded text-[9px] font-semibold bg-[var(--cx-error)]/15 text-[var(--cx-error)] hover:bg-[var(--cx-error)]/25 transition-colors"
            >
              Reject
            </button>
          </div>
        )}
        {status === 'accepted' && <Check size={12} className="text-[var(--cx-success)]" />}
        {status === 'rejected' && <XIcon size={12} className="text-[var(--cx-error)]" />}
      </div>

      {/* Hunk lines */}
      {expanded && (
        <pre className="p-2 text-[10px] font-mono leading-4 overflow-x-auto bg-[var(--cx-bg)]">
          {hunk.lines.map((line, i) => (
            <div key={i} className={cn(
              'px-2',
              line.startsWith('+') ? 'bg-[var(--cx-success)]/8 text-[var(--cx-success)]' :
              line.startsWith('-') ? 'bg-[var(--cx-error)]/8 text-[var(--cx-error)]' :
              'text-[var(--cx-text-3)]'
            )}>
              {line}
            </div>
          ))}
        </pre>
      )}
    </div>
  );
}

export function DiffAcceptReject({ filePath, diffText, onClose }) {
  const [hunkStatuses, setHunkStatuses] = useState({});
  const hunks = parseDiffHunks(diffText);
  const projectPath = useStore((s) => s.codingProjectPath);

  const handleAccept = (idx) => setHunkStatuses(prev => ({ ...prev, [idx]: 'accepted' }));
  const handleReject = (idx) => setHunkStatuses(prev => ({ ...prev, [idx]: 'rejected' }));

  const handleAcceptAll = () => {
    const statuses = {};
    hunks.forEach((_, i) => { statuses[i] = 'accepted'; });
    setHunkStatuses(statuses);
  };

  const handleRejectAll = () => {
    const statuses = {};
    hunks.forEach((_, i) => { statuses[i] = 'rejected'; });
    setHunkStatuses(statuses);
  };

  const allReviewed = hunks.length > 0 && Object.keys(hunkStatuses).length === hunks.length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[90vw] max-w-3xl max-h-[80vh] flex flex-col bg-[var(--cx-surface)] border border-[var(--cx-border)] rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--cx-border)] bg-[var(--cx-surface-2)]">
          <FileText size={14} className="text-[var(--cx-accent)]" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-[var(--cx-text)] truncate">{filePath}</div>
            <div className="text-[10px] text-[var(--cx-text-3)]">{hunks.length} hunks to review</div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAcceptAll}
              className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-[var(--cx-success)]/15 text-[var(--cx-success)] hover:bg-[var(--cx-success)]/25 transition-colors"
            >
              Accept All
            </button>
            <button
              onClick={handleRejectAll}
              className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-[var(--cx-error)]/15 text-[var(--cx-error)] hover:bg-[var(--cx-error)]/25 transition-colors"
            >
              Reject All
            </button>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--cx-surface-3)] text-[var(--cx-text-3)]">
            <X size={16} />
          </button>
        </div>

        {/* Hunks */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollable">
          {hunks.map((hunk, i) => (
            <DiffHunk
              key={i}
              hunk={hunk}
              index={i}
              onAccept={handleAccept}
              onReject={handleReject}
              status={hunkStatuses[i]}
            />
          ))}
        </div>

        {/* Footer */}
        {allReviewed && (
          <div className="px-4 py-3 border-t border-[var(--cx-border)] bg-[var(--cx-surface-2)] flex items-center justify-end gap-2">
            <span className="text-[11px] text-[var(--cx-text-3)]">
              {Object.values(hunkStatuses).filter(s => s === 'accepted').length} accepted,
              {' '}{Object.values(hunkStatuses).filter(s => s === 'rejected').length} rejected
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[var(--cx-accent)] text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
