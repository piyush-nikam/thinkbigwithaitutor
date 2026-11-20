import { logEvent } from "../server/store";
import { verifyQuestion } from "../shared/verify";
import type { Quiz } from "../shared/types";
import { draftQuiz, draftRemedialStoryboard } from "./contentGenerator";
import { judgeQuiz, judgeStoryboard } from "./judge";
import type { JudgeVerdict, Storyboard } from "./schemas";

export interface LoopConfig<T> {
  learnerId: string;
  lessonId?: string;
  label: string;
  maxRounds?: number;
  draftFn: (feedback?: string, previousDraft?: T) => Promise<T>;
  judgeFn: (draft: T) => Promise<JudgeVerdict>;
  logFn?: (entry: {
    learnerId: string;
    lessonId?: string;
    agent: "content_generator" | "judge";
    message: string;
    data?: unknown;
  }) => void;
}

/**
 * Runs Agent 1 (draft) <-> Agent 2 (judge) up to `maxRounds` times.
 * Throws if the cap is reached without approval so weak content is never published.
 */
export async function runGenerateAndJudgeLoop<T>({
  learnerId,
  lessonId,
  label,
  maxRounds = 3,
  draftFn,
  judgeFn,
  logFn = logEvent,
}: LoopConfig<T>): Promise<{ draft: T; verdict: JudgeVerdict; rounds: number }> {
  let feedback: string | undefined;
  let previousDraft: T | undefined;

  for (let round = 1; round <= maxRounds; round++) {
    logFn({
      learnerId,
      lessonId,
      agent: "content_generator",
      message: `${label}: drafting (round ${round}/${maxRounds})`,
    });

    const draft = await draftFn(feedback, previousDraft);
    const verdict = await judgeFn(draft);

    logFn({
      learnerId,
      lessonId,
      agent: "judge",
      message: `${label}: round ${round} scored ${verdict.score}/10 — ${verdict.approved ? "approved" : "rejected"}`,
      data: verdict,
    });

    if (verdict.approved) {
      return { draft, verdict, rounds: round };
    }

    feedback = [verdict.critique, ...verdict.issues].filter(Boolean).join(" | ");
    previousDraft = draft;
  }

  throw new Error(`${label} was not approved after ${maxRounds} rounds. Last critique: ${feedback}`);
}

export async function generateApprovedQuiz(
  topicId: string,
  topicTitle: string,
  learnerId = "system",
  misconceptionsFocus?: Array<{ tag: string; description: string }>,
): Promise<Quiz> {
  const { draft } = await runGenerateAndJudgeLoop<Quiz>({
    learnerId,
    label: misconceptionsFocus ? `Retest quiz (${topicId})` : `Topic quiz (${topicId})`,
    draftFn: (feedback, previousDraft) =>
      draftQuiz({ topicId, topicTitle, misconceptionsFocus, feedback, previousDraft }),
    judgeFn: (quiz) => {
      const codeProblems = quiz.questions.flatMap(verifyQuestion);
      return judgeQuiz(quiz, codeProblems);
    },
  });
  return draft;
}

export async function generateApprovedStoryboard(params: {
  learnerId: string;
  lessonId: string;
  topicTitle: string;
  misconceptionTag: string;
  misconceptionDescription: string;
  wrongContext?: string;
}): Promise<Storyboard> {
  const { draft } = await runGenerateAndJudgeLoop<Storyboard>({
    learnerId: params.learnerId,
    lessonId: params.lessonId,
    label: `Storyboard (${params.misconceptionTag})`,
    draftFn: (feedback, previousDraft) =>
      draftRemedialStoryboard({ ...params, feedback, previousDraft }),
    judgeFn: (storyboard) => judgeStoryboard(storyboard, params.misconceptionDescription),
  });
  return draft;
}
