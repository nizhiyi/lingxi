import { useState, useCallback } from 'react';
import { Shield, ChevronDown, ChevronRight, Check, X } from 'lucide-react';
import { cn } from '../ui/cn';

export function PermissionBlock({ toolName, input, onAllow, onAllowSession, onDeny, resolved }) {
  const [showInput, setShowInput] = useState(false);
  const [decision, setDecision] = useState(resolved || null);

  const handleAllow = useCallback(() => {
    setDecision('allowed');
    onAllow?.();
  }, [onAllow]);

  const handleAllowSession = useCallback(() => {
    setDecision('allowed_session');
    onAllowSession?.();
  }, [onAllowSession]);

  const handleDeny = useCallback(() => {
    setDecision('denied');
    onDeny?.();
  }, [onDeny]);

  const inputPreview = typeof input === 'string'
    ? (input.length > 120 ? input.slice(0, 120) + '...' : input)
    : JSON.stringify(input)?.slice(0, 120);

  return (
    <div className={cn(
      'my-4 rounded-xl border-2 overflow-hidden',
      decision ? 'border-[#e8e4e0] bg-[#faf8f6]' : 'border-[#e8c4a0] bg-[#fdf8f3]'
    )}>
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className={decision ? 'text-[#999]' : 'text-[#c4a882]'} />
          <span className="text-[14px] font-medium text-[#333]">
            Allow to use <span className="font-bold">{toolName}</span>?
          </span>
          {!decision && (
            <span className="ml-2 text-[10px] font-bold text-[#c4a882] bg-[#f5ece0] px-2 py-0.5 rounded-full uppercase tracking-wider">
              Awaiting Approval
            </span>
          )}
          {decision === 'allowed' && (
            <span className="ml-2 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Allowed</span>
          )}
          {decision === 'allowed_session' && (
            <span className="ml-2 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Allowed for session</span>
          )}
          {decision === 'denied' && (
            <span className="ml-2 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Denied</span>
          )}
        </div>

        {input && (
          <div className="mb-3">
            <button
              onClick={() => setShowInput(v => !v)}
              className="flex items-center gap-1.5 text-[12px] text-[#999] hover:text-[#666] transition"
            >
              {showInput ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span>{showInput ? 'Hide full input' : 'Show full input'}</span>
            </button>
            {!showInput && (
              <div className="mt-1.5 px-3 py-2 rounded-lg bg-[#f5f0eb] text-[12px] font-mono text-[#777] truncate">
                {inputPreview}
              </div>
            )}
            {showInput && (
              <div className="mt-1.5 px-3 py-2 rounded-lg bg-[#f5f0eb] text-[12px] font-mono text-[#777] whitespace-pre-wrap break-all max-h-60 overflow-y-auto scrollable">
                {typeof input === 'string' ? input : JSON.stringify(input, null, 2)}
              </div>
            )}
          </div>
        )}

        {!decision && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleAllow}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#c4a882] text-white text-[13px] font-medium hover:bg-[#b09670] transition"
            >
              <Check size={13} />
              Allow
            </button>
            <button
              onClick={handleAllowSession}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#f5f0eb] text-[#666] text-[13px] font-medium hover:bg-[#ede5dc] transition"
            >
              <Shield size={13} />
              Allow for session
            </button>
            <div className="flex-1" />
            <button
              onClick={handleDeny}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-500 text-[13px] font-medium hover:bg-red-100 transition"
            >
              <X size={13} />
              Deny
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
