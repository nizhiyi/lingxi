import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
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

export function PermissionDialog({ block, onAllow, onDeny }) {
  const [expanded, setExpanded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const risk = getRiskLevel(block.toolName);

  const handleAllow = async () => {
    setProcessing(true);
    try {
      await api.sendCodingPermissionResponse?.({
        sessionId: String(activeSessionId),
        permissionId: block.id,
        action: 'allow',
      });
      onAllow?.();
    } catch { /* ignore */ }
    setProcessing(false);
  };

  const handleDeny = async () => {
    setProcessing(true);
    try {
      await api.sendCodingPermissionResponse?.({
        sessionId: String(activeSessionId),
        permissionId: block.id,
        action: 'deny',
      });
      onDeny?.();
    } catch { /* ignore */ }
    setProcessing(false);
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
          <div className="w-8 h-8 rounded-lg bg-[var(--cx-error)]/15 flex items-center justify-center">
            <ShieldAlert size={16} className="text-[var(--cx-error)]" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-[var(--cx-warning)]/15 flex items-center justify-center">
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
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-[var(--cx-error)]/20 text-[var(--cx-error)] animate-pulse">
            High Risk
          </span>
        )}
      </div>

      {/* Input preview */}
      {block.input && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[10px] text-[var(--cx-text-3)] hover:text-[var(--cx-text-2)]"
          >
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            View details
          </button>
          {expanded && (
            <pre className="mt-1.5 p-2 rounded-md bg-[var(--cx-bg)] text-[10px] font-mono text-[var(--cx-text-3)] overflow-x-auto max-h-[120px] overflow-y-auto">
              {typeof block.input === 'string' ? block.input : JSON.stringify(block.input, null, 2)}
            </pre>
          )}
        </div>
      )}

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
          onClick={handleAllow}
          disabled={processing}
          className="px-3 py-2 rounded-lg text-[12px] font-medium bg-[var(--cx-surface-2)] text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-3)] transition-colors"
        >
          Always Allow
        </button>
        <button
          onClick={handleDeny}
          disabled={processing}
          className="px-3 py-2 rounded-lg text-[12px] font-medium text-[var(--cx-error)] hover:bg-[var(--cx-error)]/10 transition-colors"
        >
          Deny
        </button>
      </div>
    </motion.div>
  );
}
