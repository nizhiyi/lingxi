import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, ChevronDown, ChevronRight, Terminal, FileText, Copy, Check } from 'lucide-react';
import { cn } from '../../ui/cn';
import { useStore } from '../../state/useStore';
import { api } from '../../api/client';

const RISK_LEVELS = {
  Write: 'medium',
  Edit: 'medium',
  MultiEdit: 'medium',
  Shell: 'high',
  Bash: 'high',
  Delete: 'high',
  NotebookEdit: 'medium',
};

function getRiskLevel(toolName) {
  for (const [key, level] of Object.entries(RISK_LEVELS)) {
    if ((toolName || '').toLowerCase().includes(key.toLowerCase())) return level;
  }
  return 'low';
}

function getToolSummary(toolName, input) {
  if (!input || typeof input !== 'object') return null;
  const name = (toolName || '').toLowerCase();

  if (name === 'bash' || name === 'shell') {
    return { type: 'command', label: 'Command', value: input.command || input.cmd || '' };
  }
  if (name === 'write') {
    return { type: 'file', label: 'File', value: input.file_path || input.path || '' };
  }
  if (name === 'edit' || name === 'multiedit') {
    return { type: 'file', label: 'File', value: input.file_path || input.path || '' };
  }
  if (name === 'delete') {
    return { type: 'file', label: 'Delete', value: input.file_path || input.path || '' };
  }
  if (name === 'notebookedit') {
    return { type: 'file', label: 'Notebook', value: input.notebook_path || input.path || '' };
  }
  return null;
}

export function PermissionDialog({ block, onAllow, onDeny }) {
  const [expanded, setExpanded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [denyMode, setDenyMode] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [copied, setCopied] = useState(false);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const addAlwaysAllowTool = useStore((s) => s.addAlwaysAllowTool);
  const risk = getRiskLevel(block.toolName);
  const inputObj = typeof block.input === 'string' ? tryParseJSON(block.input) : block.input;
  const summary = getToolSummary(block.toolName, inputObj);

  const sendResponse = async (behavior, message) => {
    return api.submitCodingPermissionResponse({
      sessionId: String(activeSessionId),
      permissionId: block.id,
      behavior,
      ...(message ? { message } : {}),
    });
  };

  const handleAllow = async () => {
    setProcessing(true);
    try {
      await sendResponse('allow');
      onAllow?.();
    } catch { /* ignore */ }
    setProcessing(false);
  };

  const handleAlwaysAllow = async () => {
    setProcessing(true);
    try {
      await sendResponse('allow');
      if (block.toolName) addAlwaysAllowTool(block.toolName);
      onAllow?.();
    } catch { /* ignore */ }
    setProcessing(false);
  };

  const handleDeny = async () => {
    if (!denyMode) {
      setDenyMode(true);
      return;
    }
    setProcessing(true);
    try {
      await sendResponse('deny', denyReason || undefined);
      onDeny?.();
    } catch { /* ignore */ }
    setProcessing(false);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (block.resolved) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--cx-success)]/10 border border-[var(--cx-success)]/20">
        <ShieldCheck size={13} className="text-[var(--cx-success)]" />
        <span className="text-[11px] text-[var(--cx-success)] font-medium">Approved: {block.toolName}</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'rounded-xl border overflow-hidden',
        risk === 'high'
          ? 'border-[var(--cx-error)]/40 bg-[var(--cx-error)]/5'
          : risk === 'medium'
            ? 'border-[var(--cx-warning)]/40 bg-[var(--cx-warning)]/5'
            : 'border-[var(--cx-border)] bg-[var(--cx-surface)]'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {risk === 'high' ? (
          <div className="w-8 h-8 rounded-lg bg-[var(--cx-error)]/15 flex items-center justify-center shrink-0">
            <ShieldAlert size={16} className="text-[var(--cx-error)]" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-[var(--cx-warning)]/15 flex items-center justify-center shrink-0">
            <Shield size={16} className="text-[var(--cx-warning)]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-[var(--cx-text)]">
            Permission Required
          </div>
          <div className="text-[11px] text-[var(--cx-text-2)] mt-0.5">
            <span className="font-mono font-medium">{block.toolName}</span> wants to execute
          </div>
        </div>
        {risk === 'high' && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-[var(--cx-error)]/20 text-[var(--cx-error)] animate-pulse shrink-0">
            High Risk
          </span>
        )}
      </div>

      {/* Tool-specific summary (command or file path) */}
      {summary && summary.value && (
        <div className="mx-4 mb-2 rounded-lg border border-[var(--cx-border)] bg-[var(--cx-bg)] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2">
            {summary.type === 'command' ? (
              <Terminal size={12} className="text-emerald-500 shrink-0" />
            ) : (
              <FileText size={12} className="text-blue-500 shrink-0" />
            )}
            <span className="text-[10px] text-[var(--cx-text-3)] font-medium shrink-0">{summary.label}</span>
            <span className="text-[11px] font-mono text-[var(--cx-text)] truncate flex-1">{summary.value}</span>
            <button
              onClick={() => handleCopy(summary.value)}
              className="p-1 rounded hover:bg-[var(--cx-surface-2)] text-[var(--cx-text-3)] shrink-0"
            >
              {copied ? <Check size={10} className="text-[var(--cx-success)]" /> : <Copy size={10} />}
            </button>
          </div>
        </div>
      )}

      {/* Expandable full input preview */}
      {inputObj && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[10px] text-[var(--cx-text-3)] hover:text-[var(--cx-text-2)] transition-colors"
          >
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            View full parameters
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.pre
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-1.5 p-2 rounded-md bg-[var(--cx-bg)] text-[10px] font-mono text-[var(--cx-text-3)] overflow-x-auto max-h-[200px] overflow-y-auto"
              >
                {JSON.stringify(inputObj, null, 2)}
              </motion.pre>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Deny with reason input */}
      <AnimatePresence>
        {denyMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-2">
              <label className="text-[10px] text-[var(--cx-text-3)] block mb-1">
                Reason for denial (optional, the agent will see this):
              </label>
              <textarea
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                placeholder="e.g. Use a different approach, avoid modifying that file..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--cx-border)] bg-[var(--cx-bg)] text-[11px] text-[var(--cx-text)] placeholder-[var(--cx-text-3)] resize-none focus:outline-none focus:border-[var(--cx-accent)]"
                rows={2}
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--cx-border)]">
        <button
          onClick={handleAllow}
          disabled={processing}
          className={cn(
            'flex-1 px-3 py-2 rounded-lg text-[12px] font-medium transition-all',
            risk === 'high'
              ? 'bg-[var(--cx-error)] text-white hover:opacity-90'
              : 'bg-[var(--cx-accent)] text-white hover:opacity-90'
          )}
        >
          {processing ? 'Processing…' : 'Allow'}
        </button>
        <button
          onClick={handleAlwaysAllow}
          disabled={processing}
          className="px-3 py-2 rounded-lg text-[12px] font-medium bg-[var(--cx-surface-2)] text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-3)] transition-colors"
        >
          Always Allow
        </button>
        <button
          onClick={handleDeny}
          disabled={processing}
          className={cn(
            "px-3 py-2 rounded-lg text-[12px] font-medium transition-colors",
            denyMode
              ? "bg-[var(--cx-error)] text-white hover:opacity-90"
              : "text-[var(--cx-error)] hover:bg-[var(--cx-error)]/10"
          )}
        >
          {denyMode ? (processing ? 'Denying…' : 'Confirm Deny') : 'Deny'}
        </button>
        {denyMode && (
          <button
            onClick={() => { setDenyMode(false); setDenyReason(''); }}
            className="px-2 py-2 rounded-lg text-[11px] text-[var(--cx-text-3)] hover:bg-[var(--cx-surface-2)] transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </motion.div>
  );
}

function tryParseJSON(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}
