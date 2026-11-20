import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Question, Quiz } from "../shared/types";

// The question bank is generated offline (npm run bank:generate), committed to the repo and
// shipped with the app, so serving a quiz needs no LLM call and survives container restarts.

const BANK_DIR = path.resolve("shared", "bank");
const bankFile = (topicId: string) => path.join(BANK_DIR, `${topicId}.json`);

export const QUIZ_KINDS = ["which_first", "next_step", "spot_mistake", "numeric"] as const;

export function loadBank(topicId: string): Question[] {
  const file = bankFile(topicId);
  if (!existsSync(file)) return [];
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { questions?: Question[] };
  return parsed.questions ?? [];
}

export function saveBank(topicId: string, questions: Question[]) {
  mkdirSync(BANK_DIR, { recursive: true });
  writeFileSync(bankFile(topicId), JSON.stringify({ topicId, questions }, null, 2));
}

/** Shuffles option order (so the right answer isn't always in the same slot) and relabels ids a, b, c... */
export function shuffleOptions(q: Question, rng: () => number = Math.random): Question {
  const options = [...q.options];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return {
    ...q,
    options: options.map((o, i) => ({ ...o, id: String.fromCharCode(97 + i) })),
  };
}

/**
 * Picks one random question of each kind. Tries several random draws and keeps the one that
 * covers the most distinct misconceptions, so a quiz probes different mistakes.
 * Returns undefined when the bank is missing a kind.
 */
export function pickQuiz(topicId: string, bank: Question[], rng: () => number = Math.random): Quiz | undefined {
  const pools = QUIZ_KINDS.map((k) => bank.filter((q) => q.kind === k));
  if (pools.some((p) => p.length === 0)) return undefined;

  let best: Question[] | undefined;
  let bestScore = -1;
  for (let i = 0; i < 30; i++) {
    const draw = pools.map((p) => p[Math.floor(rng() * p.length)]);
    const tags = new Set(
      draw.flatMap((q) => q.options.flatMap((o) => (o.misconception ? [o.misconception.tag] : []))),
    );
    if (tags.size > bestScore) {
      best = draw;
      bestScore = tags.size;
    }
  }
  return { topicId, questions: best!.map((q) => shuffleOptions(q, rng)) };
}
