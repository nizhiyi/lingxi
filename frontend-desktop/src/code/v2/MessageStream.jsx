import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowDown } from 'lucide-react';
import { cn } from '../../ui/cn';
import { useStore } from '../../state/useStore';
import { AgentMessage } from './AgentMessage';
import { UserMessage } from './UserMessage';
import { TaskPanel } from './TaskPanel';
import { ThinkingIndicator } from './ThinkingIndicator';
import { PermissionDialog } from './PermissionDialog';
import { AskQuestionDialog } from './AskQuestionDialog';
import { SubAgentCard } from './SubAgentCard';
import { CheckpointTimeline } from './CheckpointTimeline';

export function MessageStream({ projectPath }) {
  const messages = useStore((s) => s.codingMessages);
  const liveBlocks = useStore((s) => s.codingLiveBlocks);
  const isStreaming = useStore((s) => s.codingIsStreaming);
  const agentState = useStore((s) => s.codingAgentState);
  const codingTasks = useStore((s) => s.codingTasks);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const loadCodingMessages = useStore((s) => s.loadCodingMessages);
  const pendingQuestions = useStore((s) => s.codingPendingQuestions);
  const questionsSubmitted = useStore((s) => s.codingQuestionsSubmitted);
  const subAgents = useStore((s) => s.subAgents);

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

  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    if (activeSessionId) loadCodingMessages(activeSessionId);
  }, [activeSessionId, loadCodingMessages]);

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
    setShowScrollBtn(!atBottom);
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setStickToBottom(true);
  };

  // Empty state: no session, or session with no messages and not streaming
  const showWelcome = !activeSessionId || (messages.length === 0 && liveBlocks.length === 0 && !isStreaming);
  if (showWelcome) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-[var(--cx-accent-soft)] flex items-center justify-center mx-auto">
            <Sparkles size={28} className="text-[var(--cx-accent)]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-[16px] font-semibold text-[var(--cx-text)]">Ready to code</h2>
            <p className="text-[13px] text-[var(--cx-text-3)] max-w-sm">
              Start a conversation to build, debug, and ship faster. Your AI coding partner is ready.
            </p>
          </div>
          {projectPath && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--cx-surface-2)] border border-[var(--cx-border)]">
              <span className="text-[11px] font-mono text-[var(--cx-text-2)]">{projectPath.split('/').pop()}</span>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Task panel (sticky top) */}
      {codingTasks.length > 0 && (
        <TaskPanel tasks={codingTasks} />
      )}

      {/* Checkpoint timeline */}
      <CheckpointTimeline />

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 scrollable"
      >
        {messages.map((msg, idx) => (
          msg.role === 'user'
            ? <UserMessage key={msg.id || idx} message={msg} />
            : <AgentMessage key={msg.id || idx} message={msg} />
        ))}

        {/* Live streaming blocks */}
        {liveBlocks.length > 0 && (
          <AgentMessage live blocks={liveBlocks} />
        )}

        {/* Sub-agent tree */}
        {subAgents.length > 0 && (
          <SubAgentCard agents={enrichedAgents} />
        )}

        {/* Permission dialogs from live blocks */}
        {liveBlocks.filter(b => b.type === 'permission' && !b.resolved).map((b, i) => (
          <PermissionDialog key={`perm-${b.id || i}`} block={b} />
        ))}

        {/* Thinking indicator */}
        {isStreaming && liveBlocks.length === 0 && agentState !== 'IDLE' && (
          <ThinkingIndicator state={agentState} />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--cx-surface-2)] border border-[var(--cx-border)] shadow-lg text-[11px] text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-3)] transition-colors"
          >
            <ArrowDown size={12} />
            Scroll to bottom
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
