import { useState } from "react";
import type { Question, Quiz } from "../shared/types";

export interface AnswerRecord {
  questionId: string;
  firstOptionId: string;
  finalOptionId: string;
}

interface QuizFlowProps {
  quiz: Quiz;
  onComplete: (answers: AnswerRecord[]) => void;
  submitting: boolean;
}

const KIND_LABELS: Record<Question["kind"], string> = {
  which_first: "Which Goes First?",
  next_step: "Next Step",
  spot_mistake: "Spot the Mistake",
  numeric: "Calculate",
};

export function QuizFlow({ quiz, onComplete, submitting }: QuizFlowProps) {
  const [index, setIndex] = useState(0);
  const [firstPick, setFirstPick] = useState<string | null>(null);
  const [finalPick, setFinalPick] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);

  const q = quiz.questions[index];
  const resolved = finalPick !== null;

  function handleSelect(optionId: string) {
    if (resolved) return;
    const option = q.options.find((o) => o.id === optionId);
    if (!option) return;

    if (!firstPick) {
      setFirstPick(optionId);
      if (option.correct) {
        setFinalPick(optionId);
      } else {
        // First wrong answer: reveal the single hint and allow 1 retry.
        setShowHint(true);
      }
      return;
    }

    // Second attempt after hint.
    if (optionId === firstPick) return;
    setFinalPick(optionId);
  }

  function handleNext() {
    if (!firstPick || !finalPick) return;
    const nextAnswers = [...answers, { questionId: q.id, firstOptionId: firstPick, finalOptionId: finalPick }];
    if (index + 1 < quiz.questions.length) {
      setAnswers(nextAnswers);
      setIndex(index + 1);
      setFirstPick(null);
      setFinalPick(null);
      setShowHint(false);
    } else {
      onComplete(nextAnswers);
    }
  }

  return (
    <div className="card quiz-card">
      <div className="quiz-meta">
        <span className="pill">{KIND_LABELS[q.kind]}</span>
        <span className="muted">
          Question {index + 1} of {quiz.questions.length}
        </span>
      </div>

      <h2 className="quiz-prompt">{q.prompt}</h2>
      {q.expression && <div className="expr-box">{q.expression}</div>}

      <div className="options-grid">
        {q.options.map((opt) => {
          const isFirstWrong = firstPick === opt.id && !opt.correct;
          const isFinal = finalPick === opt.id;
          let cls = "option-btn";
          if (resolved) {
            if (opt.correct) cls += " correct";
            else if (isFinal || isFirstWrong) cls += " wrong";
          } else if (isFirstWrong) {
            cls += " wrong";
          }

          return (
            <button
              key={opt.id}
              className={cls}
              disabled={resolved || isFirstWrong}
              onClick={() => handleSelect(opt.id)}
            >
              <span className="opt-id">{opt.id.toUpperCase()}</span>
              <span>{opt.text}</span>
            </button>
          );
        })}
      </div>

      {showHint && !resolved && (
        <div className="banner hint">
          <strong>Hint:</strong> {q.hint} <span className="muted">Try one more time.</span>
        </div>
      )}

      {resolved && (
        <div className={`banner ${q.options.find((o) => o.id === finalPick)?.correct ? "ok" : "warn"}`}>
          <div>
            <strong>
              {q.options.find((o) => o.id === finalPick)?.correct ? "Correct!" : "Misconception logged."}
            </strong>{" "}
            {q.explanation}
          </div>
          <button className="primary-btn" disabled={submitting} onClick={handleNext}>
            {submitting
              ? "Grading..."
              : index + 1 < quiz.questions.length
                ? "Next Question →"
                : "See Results →"}
          </button>
        </div>
      )}
    </div>
  );
}
