import { evaluate, sameNumber } from "./arith";
import type { Question } from "./types";

/**
 * Code-level safety net for numeric questions: the option marked correct must
 * equal the evaluated expression, and no wrong option may equal it.
 * Returns a list of problems (empty = OK). Text questions are left to the Judge.
 */
export function verifyQuestion(q: Question): string[] {
  if (q.kind !== "numeric" || !q.expression) return [];

  let answer: number;
  try {
    answer = evaluate(q.expression);
  } catch (e) {
    return [`${q.id}: cannot evaluate "${q.expression}" (${(e as Error).message})`];
  }

  const problems: string[] = [];
  for (const o of q.options) {
    const value = Number(o.text.trim().replace("−", "-"));
    if (Number.isNaN(value)) {
      problems.push(`${q.id}: option ${o.id} "${o.text}" is not a number`);
      continue;
    }
    const matches = sameNumber(value, answer);
    if (o.correct && !matches) problems.push(`${q.id}: option ${o.id} is marked correct but the answer is ${answer}`);
    if (!o.correct && matches) problems.push(`${q.id}: wrong option ${o.id} equals the correct answer ${answer}`);
  }
  return problems;
}
