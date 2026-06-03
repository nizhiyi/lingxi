import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleQuestion, ChevronLeft, ChevronRight, Check, Send } from 'lucide-react';
import { cn } from '../../ui/cn';
import { useStore } from '../../state/useStore';

function QuestionCard({ question, answer, onAnswer }) {
  const [customText, setCustomText] = useState('');

  if (question.type === 'input' || (question.type !== 'choice' && !question.options?.length)) {
    return (
      <div className="space-y-3">
        <div className="text-[13px] font-medium text-[var(--cx-text)]">
          {question.question || question.title}
        </div>
        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Type your answer…"
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg bg-[var(--cx-bg)] border border-[var(--cx-border)] text-[12px] text-[var(--cx-text)] placeholder:text-[var(--cx-text-3)] focus:outline-none focus:border-[var(--cx-border-active)] resize-none"
        />
        <button
          onClick={() => onAnswer(customText)}
          disabled={!customText.trim()}
          className={cn(
            'px-4 py-2 rounded-lg text-[12px] font-medium transition-all',
            customText.trim()
              ? 'bg-[var(--cx-accent)] text-white hover:opacity-90'
              : 'bg-[var(--cx-surface-2)] text-[var(--cx-text-3)] cursor-not-allowed'
          )}
        >
          <Send size={12} className="inline mr-1.5" />
          Submit
        </button>
      </div>
    );
  }

  // Choice type
  return (
    <div className="space-y-3">
      <div className="text-[13px] font-medium text-[var(--cx-text)]">
        {question.question || question.title}
      </div>
      <div className="space-y-1.5">
        {(question.options || []).map((opt, i) => {
          const optId = opt.id || opt.value || String(i);
          const optLabel = opt.label || opt.text || opt;
          const isSelected = answer === optId;
          return (
            <button
              key={optId}
              onClick={() => onAnswer(optId)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                isSelected
                  ? 'border-[var(--cx-accent)] bg-[var(--cx-accent-soft)]'
                  : 'border-[var(--cx-border)] hover:border-[var(--cx-border-active)] hover:bg-[var(--cx-surface-2)]'
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                isSelected ? 'border-[var(--cx-accent)] bg-[var(--cx-accent)]' : 'border-[var(--cx-text-3)]'
              )}>
                {isSelected && <Check size={10} className="text-white" />}
              </div>
              <span className={cn('text-[12px]', isSelected ? 'text-[var(--cx-accent)] font-medium' : 'text-[var(--cx-text-2)]')}>
                {optLabel}
              </span>
            </button>
          );
        })}
      </div>
      {question.allow_custom !== false && (
        <div className="pt-2 border-t border-[var(--cx-border)]">
          <input
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && customText.trim()) onAnswer(customText); }}
            placeholder="Or type a custom answer…"
            className="w-full px-3 py-2 rounded-lg bg-[var(--cx-bg)] border border-[var(--cx-border)] text-[12px] text-[var(--cx-text)] placeholder:text-[var(--cx-text-3)] focus:outline-none focus:border-[var(--cx-border-active)]"
          />
        </div>
      )}
    </div>
  );
}

export function AskQuestionDialog() {
  const questions = useStore((s) => s.codingPendingQuestions);
  const currentIdx = useStore((s) => s.codingCurrentQuestionIdx);
  const answers = useStore((s) => s.codingAnswers);
  const submitted = useStore((s) => s.codingQuestionsSubmitted);
  const submitBatch = useStore((s) => s.submitCodingAnswerBatch);

  const setAnswer = (qId, value) => {
    useStore.setState({
      codingAnswers: { ...useStore.getState().codingAnswers, [qId]: value },
    });
  };

  const goNext = () => {
    if (currentIdx < questions.length - 1) {
      useStore.setState({ codingCurrentQuestionIdx: currentIdx + 1 });
    }
  };
  const goPrev = () => {
    if (currentIdx > 0) {
      useStore.setState({ codingCurrentQuestionIdx: currentIdx - 1 });
    }
  };

  if (!questions.length || submitted) return null;

  const current = questions[currentIdx];
  const getAnswer = (q, i) => answers[q?.id] ?? answers[`q_${i}`] ?? null;
  const allAnswered = questions.every((q, i) => getAnswer(q, i) != null);
  const isLast = currentIdx === questions.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4 rounded-xl border border-[var(--cx-accent)]/30 bg-[var(--cx-surface)] overflow-hidden shadow-lg shadow-[var(--cx-accent-glow)]"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--cx-border)] bg-[var(--cx-accent-soft)]">
        <MessageCircleQuestion size={14} className="text-[var(--cx-accent)]" />
        <span className="text-[11px] font-semibold text-[var(--cx-accent)]">
          Question {currentIdx + 1} of {questions.length}
        </span>
        {/* Progress dots */}
        <div className="flex-1 flex items-center justify-end gap-1">
          {questions.map((q, i) => (
            <div
              key={i}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                i === currentIdx
                  ? 'bg-[var(--cx-accent)]'
                  : getAnswer(q, i) != null
                    ? 'bg-[var(--cx-success)]'
                    : 'bg-[var(--cx-text-3)]'
              )}
            />
          ))}
        </div>
      </div>

      {/* Question content */}
      <div className="px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
          >
            <QuestionCard
              question={current}
              answer={getAnswer(current, currentIdx)}
              onAnswer={(val) => {
                setAnswer(current.id || `q_${currentIdx}`, val);
                if (!isLast) setTimeout(goNext, 200);
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer navigation */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--cx-border)]">
        <button
          onClick={goPrev}
          disabled={currentIdx === 0}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-2)] disabled:opacity-40 transition-colors"
        >
          <ChevronLeft size={12} />
          Previous
        </button>

        <div className="flex items-center gap-2">
          {!isLast && (
            <button
              onClick={goNext}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] text-[var(--cx-text-2)] hover:bg-[var(--cx-surface-2)] transition-colors"
            >
              Next
              <ChevronRight size={12} />
            </button>
          )}
          {allAnswered && (
            <button
              onClick={submitBatch}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--cx-accent)] text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
            >
              <Check size={12} />
              Submit All
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
