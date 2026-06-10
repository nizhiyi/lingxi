import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Square, Plus, X, FileText, Folder, Mic, MicOff,
  Loader2, ImagePlus, ChevronDown, Shield, ShieldCheck, ShieldOff,
  Brain, Sparkles, Users, Bot,
} from 'lucide-react';
import { cn } from '../../ui/cn';
import { useStore } from '../../state/useStore';
import { api } from '../../api/client';

function DropupPortal({ anchorRef, open, onClose, children, width = 'auto' }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.top, left: rect.left });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (anchorRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999]"
      style={{ top: pos.top, left: pos.left, transform: 'translateY(-100%)' }}
    >
      <div style={{ width, paddingBottom: 4 }}>
        {children}
      </div>
    </div>,
    document.body
  );
}

const PERMISSION_MODES = [
  { id: 'default', label: 'Default', icon: Shield, desc: 'Ask before risky actions' },
  { id: 'acceptEdits', label: 'Auto-edit', icon: ShieldCheck, desc: 'Auto-approve file edits' },
  { id: 'bypassPermissions', label: 'Full Access', icon: ShieldOff, desc: 'No approval needed' },
  { id: 'plan', label: 'Plan Only', icon: Brain, desc: 'Analyze without changes' },
];

export const ComposerV2 = forwardRef(function ComposerV2({
  onSend,
  disabled,
  projectPath,
  permissionMode = 'default',
  onPermissionModeChange,
  mode = 'agent',
  onModeChange,
}, ref) {
  const [text, setText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [images, setImages] = useState([]);
  const [showPermMenu, setShowPermMenu] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const textareaRef = useRef(null);
  const composingRef = useRef(false);
  const composingEndTsRef = useRef(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const isStreaming = useStore((s) => s.codingIsStreaming);
  const abort = useStore((s) => s.codingAbort);
  const profiles = useStore((s) => s.profiles);
  const activeProfile = useStore((s) => s.activeProfile);
  const activateProfile = useStore((s) => s.activateProfile);
  const agents = useStore((s) => s.agents);
  const activeAgentId = useStore((s) => s.activeAgentId);
  const setActiveAgent = useStore((s) => s.setActiveAgent);
  const codingThinkingEnabled = useStore((s) => s.codingThinkingEnabled);
  const setCodingThinkingEnabled = useStore((s) => s.setCodingThinkingEnabled);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const permBtnRef = useRef(null);
  const modeBtnRef = useRef(null);
  const modelBtnRef = useRef(null);
  const agentBtnRef = useRef(null);

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

  const autoResize = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && images.length === 0 && attachedFiles.length === 0) return;
    if (disabled) return;
    onSend(trimmed || 'Please analyze the attached content', attachedFiles, images);
    setText('');
    setAttachedFiles([]);
    setImages([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [text, onSend, disabled, attachedFiles, images]);

  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    if (e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229 ||
        composingRef.current || Date.now() - composingEndTsRef.current < 50) return;
    e.preventDefault();
    handleSend();
  }, [handleSend]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const filePath = e.dataTransfer.getData('application/x-file-path') || e.dataTransfer.getData('text/plain');
    const isDir = e.dataTransfer.getData('application/x-is-dir') === 'true';

    if (filePath && filePath.startsWith('/')) {
      const name = filePath.split('/').pop() || filePath;
      setAttachedFiles(prev => {
        if (prev.some(f => f.path === filePath)) return prev;
        return [...prev, { name, path: filePath, isDir }];
      });
      return;
    }

    const files = Array.from(e.dataTransfer.files || []);
    for (const file of files) {
      if (file.type?.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          setImages(prev => [...prev, { mediaType: file.type, data: base64, name: file.name }]);
        };
        reader.readAsDataURL(file);
      } else if (file.path) {
        setAttachedFiles(prev => {
          if (prev.some(f => f.path === file.path)) return prev;
          return [...prev, { name: file.name, path: file.path, isDir: false }];
        });
      }
    }
  }, []);

  const handlePaste = useCallback((e) => {
    const items = Array.from(e.clipboardData?.items || []);
    for (const item of items) {
      if (item.type?.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          setImages(prev => [...prev, { mediaType: blob.type, data: base64, name: 'pasted-image' }]);
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  }, []);

  const handleAddFiles = useCallback(async () => {
    if (window.electronAPI?.selectFiles) {
      const selected = await window.electronAPI.selectFiles();
      if (selected?.length) {
        setAttachedFiles(prev => [
          ...prev,
          ...selected.map(f => ({ name: f.split('/').pop(), path: f, isDir: false })),
        ]);
      }
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setTranscribing(true);
        try {
          const result = await api.transcribeAudio(blob);
          if (result?.text) setText(prev => prev + result.text);
        } catch { /* ignore */ }
        setTranscribing(false);
        setRecording(false);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch { /* ignore */ }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const removeFile = (idx) => setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  const currentPerm = PERMISSION_MODES.find(p => p.id === permissionMode) || PERMISSION_MODES[0];

  return (
    <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 safe-area-bottom" onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}>
      <div
        className={cn(
          'relative rounded-xl border bg-[var(--cx-surface)] transition-all duration-200',
          'border-[var(--cx-border)] focus-within:border-[var(--cx-border-active)] focus-within:shadow-[0_0_0_3px_var(--cx-accent-soft)]'
        )}
      >
        {/* Attached files / images */}
        {(attachedFiles.length > 0 || images.length > 0) && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
            {attachedFiles.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--cx-surface-2)] text-[11px] text-[var(--cx-text-2)] border border-[var(--cx-border)]">
                {f.isDir ? <Folder size={11} /> : <FileText size={11} />}
                <span className="max-w-[120px] truncate">{f.name}</span>
                <button onClick={() => removeFile(i)} className="hover:text-[var(--cx-error)]"><X size={10} /></button>
              </span>
            ))}
            {images.map((img, i) => (
              <span key={`img-${i}`} className="relative w-10 h-10 rounded-md overflow-hidden border border-[var(--cx-border)]">
                <img src={`data:${img.mediaType};base64,${img.data}`} className="w-full h-full object-cover" />
                <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--cx-error)] text-white flex items-center justify-center">
                  <X size={8} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => { setText(e.target.value); autoResize(e.target); }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={() => { composingRef.current = false; composingEndTsRef.current = Date.now(); }}
          placeholder={mode === 'plan' ? 'Describe what you want to plan…' : 'What would you like to do?'}
          disabled={isStreaming || disabled}
          rows={1}
          className="w-full px-3 py-3 text-[13px] leading-relaxed bg-transparent text-[var(--cx-text)] placeholder:text-[var(--cx-text-3)] resize-none focus:outline-none"
          style={{ maxHeight: 200 }}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-2 sm:px-3 pb-2.5 gap-1 sm:gap-2">
          {/* Left actions */}
          <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto min-w-0 scrollbar-none">
            {/* Permission mode */}
            <div>
              <button
                ref={permBtnRef}
                onClick={() => setShowPermMenu(v => !v)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors',
                  'bg-[var(--cx-surface-2)] text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-3)]'
                )}
              >
                <currentPerm.icon size={12} />
                <span>{currentPerm.label}</span>
                <ChevronDown size={10} />
              </button>
              <DropupPortal anchorRef={permBtnRef} open={showPermMenu} onClose={() => setShowPermMenu(false)} width={192}>
                <div className="py-1 bg-[var(--cx-surface-2)] border border-[var(--cx-border)] rounded-lg shadow-xl">
                  {PERMISSION_MODES.map(pm => (
                    <button
                      key={pm.id}
                      onClick={() => { onPermissionModeChange?.(pm.id); setShowPermMenu(false); }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
                        pm.id === permissionMode
                          ? 'bg-[var(--cx-accent-soft)] text-[var(--cx-accent)]'
                          : 'text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-3)]'
                      )}
                    >
                      <pm.icon size={13} />
                      <div>
                        <div className="text-[11px] font-medium">{pm.label}</div>
                        <div className="text-[10px] text-[var(--cx-text-3)]">{pm.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </DropupPortal>
            </div>

            {/* Mode selector */}
            <div>
              <button
                ref={modeBtnRef}
                onClick={() => setShowModeMenu(v => !v)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors',
                  mode === 'teams'
                    ? 'bg-[var(--cx-purple)]/15 text-[var(--cx-purple)]'
                    : mode === 'plan'
                      ? 'bg-[var(--cx-warning)]/15 text-[var(--cx-warning)]'
                      : 'bg-[var(--cx-surface-2)] text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-3)]'
                )}
              >
                {mode === 'teams' ? <Users size={12} /> : mode === 'plan' ? <Brain size={12} /> : <Sparkles size={12} />}
                <span>{mode === 'teams' ? 'Teams' : mode === 'plan' ? 'Plan' : 'Agent'}</span>
                <ChevronDown size={10} />
              </button>
              <DropupPortal anchorRef={modeBtnRef} open={showModeMenu} onClose={() => setShowModeMenu(false)} width={160}>
                <div className="py-1 bg-[var(--cx-surface-2)] border border-[var(--cx-border)] rounded-lg shadow-xl">
                  {[
                    { id: 'normal', label: 'Agent', icon: Sparkles },
                    { id: 'plan', label: 'Plan', icon: Brain },
                    { id: 'teams', label: 'Agent Teams', icon: Users },
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => { onModeChange?.(m.id); setShowModeMenu(false); }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-left transition-colors',
                        mode === m.id
                          ? 'bg-[var(--cx-accent-soft)] text-[var(--cx-accent)]'
                          : 'text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-3)]'
                      )}
                    >
                      <m.icon size={13} />
                      {m.label}
                    </button>
                  ))}
                </div>
              </DropupPortal>
            </div>

            {/* Think toggle (independent of mode) */}
            <button
              onClick={() => setCodingThinkingEnabled(!codingThinkingEnabled)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors',
                codingThinkingEnabled
                  ? 'bg-purple-500/15 text-purple-600'
                  : 'bg-[var(--cx-surface-2)] text-[var(--cx-text-3)] hover:bg-[var(--cx-surface-3)] hover:text-[var(--cx-text-2)]'
              )}
              title={codingThinkingEnabled ? 'Thinking ON (click to disable)' : 'Thinking OFF (click to enable)'}
            >
              <Brain size={12} />
              <span>Think</span>
            </button>

            {/* Model selector */}
            <div>
              <button
                ref={modelBtnRef}
                onClick={() => setShowModelMenu(v => !v)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-[var(--cx-surface-2)] text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-3)] transition-colors"
              >
                <span className="max-w-[80px] truncate">{activeProfile?.model || 'Model'}</span>
                <ChevronDown size={10} />
              </button>
              <DropupPortal anchorRef={modelBtnRef} open={showModelMenu} onClose={() => setShowModelMenu(false)} width={208}>
                <div className="max-h-48 overflow-y-auto py-1 bg-[var(--cx-surface-2)] border border-[var(--cx-border)] rounded-lg shadow-xl">
                  {(profiles || []).map(p => (
                    <button
                      key={p.id}
                      onClick={() => { activateProfile(p.id); setShowModelMenu(false); }}
                      className={cn(
                        'w-full px-3 py-1.5 text-[11px] text-left transition-colors',
                        p.id === activeProfile?.id
                          ? 'bg-[var(--cx-accent-soft)] text-[var(--cx-accent)]'
                          : 'text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-3)]'
                      )}
                    >
                      <div className="font-medium truncate">{p.name || p.model}</div>
                      <div className="text-[10px] text-[var(--cx-text-3)]">{p.provider}</div>
                    </button>
                  ))}
                </div>
              </DropupPortal>
            </div>

            {/* Agent selector */}
            <div>
              <button
                ref={agentBtnRef}
                onClick={() => setShowAgentMenu(v => !v)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-[var(--cx-surface-2)] text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-3)] transition-colors"
              >
                <AgentAvatar agent={agents.find(a => a.id === activeAgentId)} size={14} />
                <span className="max-w-[70px] truncate">{agents.find(a => a.id === activeAgentId)?.name || 'Agent'}</span>
                <ChevronDown size={10} />
              </button>
              <DropupPortal anchorRef={agentBtnRef} open={showAgentMenu} onClose={() => setShowAgentMenu(false)} width={224}>
                <div className="max-h-60 overflow-y-auto py-1 bg-[var(--cx-surface-2)] border border-[var(--cx-border)] rounded-lg shadow-xl">
                  <div className="px-3 py-1.5 text-[10px] text-[var(--cx-text-3)] font-medium border-b border-[var(--cx-border)]">Choose Agent</div>
                  {agents.map(a => (
                    <button
                      key={a.id}
                      onClick={() => { setActiveAgent(a.id); setShowAgentMenu(false); }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                        a.id === activeAgentId
                          ? 'bg-[var(--cx-accent-soft)] text-[var(--cx-accent)]'
                          : 'text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-3)]'
                      )}
                    >
                      <AgentAvatar agent={a} size={18} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium truncate">{a.name}</div>
                        {a.description && <div className="text-[10px] text-[var(--cx-text-3)] truncate">{a.description}</div>}
                      </div>
                    </button>
                  ))}
                  {agents.length === 0 && <div className="px-3 py-3 text-[11px] text-[var(--cx-text-3)] text-center">No agents</div>}
                </div>
              </DropupPortal>
            </div>

            {/* Add file */}
            <button
              onClick={handleAddFiles}
              className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--cx-text-3)] hover:text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-2)] transition-colors"
              title="Attach file"
            >
              <Plus size={14} />
            </button>

            {/* Image */}
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.multiple = true;
                input.onchange = (e) => {
                  Array.from(e.target.files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const base64 = reader.result.split(',')[1];
                      setImages(prev => [...prev, { mediaType: file.type, data: base64, name: file.name }]);
                    };
                    reader.readAsDataURL(file);
                  });
                };
                input.click();
              }}
              className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--cx-text-3)] hover:text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-2)] transition-colors"
              title="Attach image"
            >
              <ImagePlus size={14} />
            </button>

            {/* Microphone */}
            <button
              onClick={recording ? stopRecording : startRecording}
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded-md transition-colors',
                recording
                  ? 'bg-[var(--cx-error)]/20 text-[var(--cx-error)] animate-pulse'
                  : transcribing
                    ? 'text-[var(--cx-accent)]'
                    : 'text-[var(--cx-text-3)] hover:text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-2)]'
              )}
              title={recording ? 'Stop recording' : 'Voice input'}
            >
              {transcribing ? <Loader2 size={14} className="animate-spin" /> : recording ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          </div>

          {/* Right: send/stop */}
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {isStreaming ? (
              <button
                onClick={abort}
                className="flex items-center gap-1.5 px-4 py-2 sm:px-3 sm:py-1.5 rounded-lg bg-[var(--cx-error)]/15 text-[var(--cx-error)] text-[12px] font-medium hover:bg-[var(--cx-error)]/25 transition-colors min-w-[60px] justify-center"
              >
                <Square size={12} />
                Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={disabled || (!text.trim() && images.length === 0 && attachedFiles.length === 0)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 sm:px-3 sm:py-1.5 rounded-lg text-[12px] font-medium transition-all min-w-[60px] justify-center',
                  text.trim() || images.length > 0 || attachedFiles.length > 0
                    ? 'bg-[var(--cx-accent)] text-white hover:opacity-90'
                    : 'bg-[var(--cx-surface-2)] text-[var(--cx-text-3)] cursor-not-allowed'
                )}
              >
                <Send size={12} />
                Run
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

function AgentAvatar({ agent, size = 18 }) {
  if (agent?.avatar?.startsWith('/api/')) {
    return <img src={agent.avatar} className="rounded-sm object-cover shrink-0" style={{ width: size, height: size }} alt="" />;
  }
  return <Bot size={size - 4} className="text-[var(--cx-accent)] shrink-0" />;
}
