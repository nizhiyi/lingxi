import { useState, useCallback, useMemo } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Send, ListChecks, Loader2 } from 'lucide-react';
import { cn } from '../ui/cn';
import { useStore } from '../state/useStore';

export function AskQuestionWizard() {
  const questions = useStore((s) => s.codingPendingQuestions);
  const currentIdx = useStore((s) => s.codingCurrentQuestionIdx);
  const answers = useStore((s) => s.codingAnswers);
  const submitted = useStore((s) => s.codingQuestionsSubmitted);
  const setCodingAnswer = useStore((s) => s.setCodingAnswer);
  const codingNextQuestion = useStore((s) => s.codingNextQuestion);
  const codingPrevQuestion = useStore((s) => s.codingPrevQuestion);
  const submitBatch = useStore((s) => s.submitCodingAnswerBatch);

  const [showSummary, setShowSummary] = useState(false);

  const parsedQuestions = useMemo(() => {
    return questions.map((q) => {
      if (typeof q === 'string') {
        try { return JSON.parse(q); } catch { return q; }
      }
      return q;
    });
  }, [questions]);

  const total = parsedQuestions.length;
  if (total === 0) return null;

  const allAnswered = parsedQuestions.every((q) => {
    const qId = q.id || `q_${parsedQuestions.indexOf(q)}`;
    return answers[qId] && answers[qId].trim();
  });

  const currentQ = parsedQuestions[currentIdx];
  if (!currentQ) return null;

  const questionId = currentQ.id || `q_${currentIdx}`;
  const currentAnswer = answers[questionId] || '';
  const isLastQuestion = currentIdx === total - 1;

  const handleNext = () => {
    if (isLastQuestion) {
      setShowSummary(true);
    } else {
      codingNextQuestion();
    }
  };

  const handleSubmit = () => {
    submitBatch();
    setShowSummary(false);
  };

  if (submitted) {
    return (
      <div className="my-4 rounded-xl border border-[#e8e4e0] bg-white overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-green-500" />
          <span className="text-[14px] text-green-600 font-medium">All answers submitted, continuing...</span>
          <Loader2 size={14} className="text-[#c4a882] animate-spin ml-auto" />
        </div>
      </div>
    );
  }

  if (showSummary) {
    return (
      <SummaryView
        questions={parsedQuestions}
        answers={answers}
        onBack={() => setShowSummary(false)}
        onSubmit={handleSubmit}
        allAnswered={allAnswered}
      />
    );
  }

  return (
    <div className="my-4 rounded-xl border-2 border-[#e8c4a0] bg-white overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-[#f0ebe6]">
        <div
          className="h-full bg-gradient-to-r from-[#c4a882] to-[#d4b896] transition-all duration-500"
          style={{ width: `${((currentIdx + 1) / total) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[#f0ebe6] bg-[#fdf8f3]">
        <ListChecks size={15} className="text-[#c4a882]" />
        <span className="text-[13px] font-medium text-[#555]">
          Question {currentIdx + 1} of {total}
        </span>
        <div className="flex-1" />
        <div className="flex gap-1">
          {parsedQuestions.map((_, i) => {
            const qId = (parsedQuestions[i]?.id) || `q_${i}`;
            const answered = !!answers[qId];
            return (
              <div
                key={i}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  i === currentIdx ? 'bg-[#c4a882] scale-125' :
                  answered ? 'bg-green-400' : 'bg-[#e0dbd5]'
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Question content */}
      <div className="px-5 py-4">
        <QuestionCard
          question={currentQ}
          questionId={questionId}
          answer={currentAnswer}
          onAnswer={(val) => setCodingAnswer(questionId, val)}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2 px-5 pb-4">
        <button
          onClick={codingPrevQuestion}
          disabled={currentIdx === 0}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition',
            currentIdx === 0
              ? 'text-[#ccc] cursor-default'
              : 'text-[#888] hover:text-[#555] hover:bg-[#f5f0eb]'
          )}
        >
          <ChevronLeft size={14} />
          Previous
        </button>
        <div className="flex-1" />
        <button
          onClick={handleNext}
          disabled={!currentAnswer}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition',
            currentAnswer
              ? 'bg-[#c4a882] text-white hover:bg-[#b09670]'
              : 'bg-[#f0ebe6] text-[#ccc] cursor-default'
          )}
        >
          {isLastQuestion ? (
            <>
              Review & Submit
              <Send size={13} />
            </>
          ) : (
            <>
              Next
              <ChevronRight size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function QuestionCard({ question, questionId, answer, onAnswer }) {
  const [customText, setCustomText] = useState('');

  const title = question.title || question.question || '';
  const options = question.options || [];
  const allowCustom = question.allow_custom !== false;

  const handleSelect = (optId) => {
    const opt = options.find(o => o.id === optId);
    onAnswer(opt?.label || optId);
    setCustomText('');
  };

  const handleCustom = (val) => {
    setCustomText(val);
    onAnswer(val);
  };

  return (
    <div>
      <h3 className="text-[15px] font-bold text-[#1a1a1a] mb-4">{title}</h3>

      {options.length > 0 && (
        <div className="space-y-2">
          {options.map((opt) => {
            const optLabel = opt.label || opt.id;
            const isSelected = answer === optLabel && !customText;
            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-xl border-2 transition-all',
                  isSelected
                    ? 'border-[#c4a882] bg-[#faf5ef]'
                    : 'border-[#e8e4e0] hover:border-[#d4cec6] bg-white'
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">
                    {isSelected ? (
                      <CheckCircle2 size={18} className="text-[#c4a882]" />
                    ) : (
                      <Circle size={18} className="text-[#ddd]" />
                    )}
                  </span>
                  <div>
                    <div className="text-[14px] font-medium text-[#333]">
                      {optLabel}
                      {opt.recommended && <span className="ml-2 text-[11px] text-[#c4a882]">(推荐)</span>}
                    </div>
                    {(opt.desc || opt.description) && (
                      <div className="text-[12px] text-[#999] mt-0.5">{opt.desc || opt.description}</div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {allowCustom && (
        <div className="mt-4">
          <div className="text-[12px] text-[#999] mb-1.5">
            {options.length > 0 ? 'Or type a custom response:' : 'Your answer:'}
          </div>
          <input
            type="text"
            value={customText}
            onChange={(e) => handleCustom(e.target.value)}
            placeholder="Type your answer..."
            className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4e0] text-[14px] text-[#333] placeholder-[#ccc] outline-none focus:border-[#c4a882] transition"
          />
        </div>
      )}
    </div>
  );
}

function SummaryView({ questions, answers, onBack, onSubmit, allAnswered }) {
  return (
    <div className="my-4 rounded-xl border-2 border-[#c4a882] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[#f0ebe6] bg-[#fdf8f3]">
        <ListChecks size={15} className="text-[#c4a882]" />
        <span className="text-[13px] font-bold text-[#555]">Review your answers</span>
      </div>

      <div className="px-5 py-4 space-y-3">
        {questions.map((q, i) => {
          const qId = q.id || `q_${i}`;
          const qTitle = q.title || q.question || `Question ${i + 1}`;
          const ans = answers[qId] || '';
          return (
            <div key={qId} className="rounded-lg border border-[#e8e4e0] p-3">
              <div className="text-[12px] text-[#999] mb-1">Q{i + 1}: {qTitle}</div>
              <div className="text-[14px] text-[#333] font-medium flex items-center gap-2">
                {ans ? (
                  <>
                    <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                    <span>{ans}</span>
                  </>
                ) : (
                  <span className="text-[#ccc] italic">Not answered</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 px-5 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] text-[#888] hover:text-[#555] hover:bg-[#f5f0eb] transition"
        >
          <ChevronLeft size={14} />
          Back to edit
        </button>
        <div className="flex-1" />
        <button
          onClick={onSubmit}
          disabled={!allAnswered}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-medium transition',
            allAnswered
              ? 'bg-[#c4a882] text-white hover:bg-[#b09670]'
              : 'bg-[#f0ebe6] text-[#ccc] cursor-default'
          )}
        >
          <Send size={13} />
          Confirm & Submit All
        </button>
      </div>
    </div>
  );
}
