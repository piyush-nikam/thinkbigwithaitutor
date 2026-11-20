import { topicOrder } from "../shared/catalog";
import type { Lesson, MisconceptionLog, Quiz } from "../shared/types";
import { createLesson, lessonsFor, logEvent, updateLearner } from "./store";

export interface SubmittedAnswer {
  questionId: string;
  firstOptionId: string;
  finalOptionId: string;
}

export interface EvaluationResult {
  passed: boolean;
  score: number;
  total: number;
  slips: MisconceptionLog[];
  confirmed: MisconceptionLog[];
  lessonsCreated: Lesson[];
  unlockedTopicId?: string;
}

const MAX_LESSONS_PER_LEARNER = 8;

/**
 * Agent 5 (Evaluator / Grader): grades a quiz against the 100% pass rule,
 * logs slips (wrong first try, right after hint) and confirmed misconceptions,
 * queues one remedial lesson per confirmed misconception, and unlocks the next topic on pass.
 */
export function evaluateSubmission(
  learnerId: string,
  topicId: string,
  quiz: Quiz,
  answers: SubmittedAnswer[],
): EvaluationResult {
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));
  const now = new Date().toISOString();
  const slips: MisconceptionLog[] = [];
  const confirmed: MisconceptionLog[] = [];
  let score = 0;

  for (const q of quiz.questions) {
    const sub = answerMap.get(q.id);
    if (!sub) continue;

    const firstOpt = q.options.find((o) => o.id === sub.firstOptionId);
    const finalOpt = q.options.find((o) => o.id === sub.finalOptionId);

    if (finalOpt?.correct) {
      score++;
      if (firstOpt && !firstOpt.correct && firstOpt.misconception) {
        slips.push({
          tag: firstOpt.misconception.tag,
          description: firstOpt.misconception.description,
          questionId: q.id,
          optionId: firstOpt.id,
          strength: "slip",
          resolved: true,
          at: now,
        });
      }
    } else if (finalOpt && !finalOpt.correct && finalOpt.misconception) {
      confirmed.push({
        tag: finalOpt.misconception.tag,
        description: finalOpt.misconception.description,
        questionId: q.id,
        optionId: finalOpt.id,
        strength: "confirmed",
        resolved: false,
        at: now,
      });
    }
  }

  const total = quiz.questions.length;
  const passed = score === total && confirmed.length === 0;
  let unlockedTopicId: string | undefined;

  updateLearner(learnerId, (learner) => {
    const tp = learner.topics[topicId] ?? { status: "available", attempts: 0, misconceptions: [] };
    tp.attempts += 1;
    tp.misconceptions.push(...slips, ...confirmed);

    if (passed) {
      tp.status = "passed";
      for (const m of tp.misconceptions) m.resolved = true;
      const order = topicOrder();
      const idx = order.indexOf(topicId);
      if (idx >= 0 && idx + 1 < order.length) {
        const nextId = order[idx + 1];
        if (!learner.topics[nextId] || learner.topics[nextId].status === "locked") {
          learner.topics[nextId] = { status: "available", attempts: 0, misconceptions: [] };
          unlockedTopicId = nextId;
        }
      }
    }
    learner.topics[topicId] = tp;
  });

  const existing = lessonsFor(learnerId);
  const lessonsCreated: Lesson[] = [];
  const seenTags = new Set<string>();

  if (!passed) {
    for (const m of confirmed) {
      if (seenTags.has(m.tag)) continue;
      seenTags.add(m.tag);

      const alreadyQueued = existing.some(
        (l) => l.topicId === topicId && l.misconceptionTag === m.tag && l.status !== "failed",
      );
      if (alreadyQueued) continue;
      if (existing.length + lessonsCreated.length >= MAX_LESSONS_PER_LEARNER) break;

      lessonsCreated.push(createLesson(learnerId, topicId, m.tag));
    }
  }

  logEvent({
    learnerId,
    agent: "evaluator",
    message: passed
      ? `Passed ${topicId} (${score}/${total})${unlockedTopicId ? ` — unlocked ${unlockedTopicId}` : ""}`
      : `Scored ${score}/${total} on ${topicId} — ${confirmed.length} misconception(s) logged, queued ${lessonsCreated.length} lesson(s)`,
    data: { score, total, slips: slips.map((s) => s.tag), confirmed: confirmed.map((c) => c.tag) },
  });

  return { passed, score, total, slips, confirmed, lessonsCreated, unlockedTopicId };
}
