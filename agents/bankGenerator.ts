import { z } from "zod";
import { generateJson } from "../server/gemini";
import { QuestionSchema, type Question, type Quiz } from "../shared/types";
import { verifyQuestion } from "../shared/verify";
import { judgeQuiz } from "./judge";
import { runGenerateAndJudgeLoop } from "./loops";
import { BANK_THEMES, CANONICAL_TAG_PROMPT } from "./misconceptions";

type Kind = Question["kind"];

const BatchSchema = z.object({ questions: z.array(QuestionSchema).min(1) });
type Batch = z.infer<typeof BatchSchema>;

const KIND_BRIEF: Record<Kind, string> = {
  which_first:
    'Text-based. Show an expression and ask which operation is done FIRST. Options are operations with a short reason (e.g. "+, because A comes before S"). Never offer an "either order is fine" option when the order changes the answer.',
  next_step:
    "Text-based. Show a multi-operation expression (with brackets or powers) and ask for the exact first step. Options are concrete first steps.",
  spot_mistake:
    "Text-based. Show a student's worked answer that contains one error and ask what rule they broke. Options name the rule broken.",
  numeric:
    'Arithmetic. Give an "expression" field (use +, -, ×, ÷, ^ or ²) and 4 plain-number options. The correct number must be an integer.',
};

const SYSTEM = `You are Agent 1 (Content Generator), an expert maths curriculum designer.
You write diagnostic multiple-choice questions where EVERY wrong option corresponds to one specific, named misconception.
Language is crisp, unambiguous and suitable for school students.`;

export interface BankBatchInput {
  kind: Kind;
  count: number;
  themeIndex: number;
  avoidPrompts: string[];
  feedback?: string;
  previous?: Batch;
}

export async function draftBankBatch(input: BankBatchInput): Promise<Batch> {
  const theme = BANK_THEMES[input.themeIndex % BANK_THEMES.length];
  const avoid = input.avoidPrompts.slice(-25);
  const revision =
    input.feedback && input.previous
      ? `\n\nTHE PREVIOUS BATCH WAS REJECTED.\nFeedback: ${input.feedback}\nPrevious batch: ${JSON.stringify(input.previous)}\nFix every issue.`
      : "";

  const prompt = `Write ${input.count} NEW questions of kind "${input.kind}" for the topic BODMAS (order of operations).
Kind brief: ${KIND_BRIEF[input.kind]}
Focus theme for this batch: ${theme}. Use varied numbers and wording; each question should differ from the others.

Reuse these canonical misconception tags when they fit (you may invent a new snake_case tag if none fits):
${CANONICAL_TAG_PROMPT}

Rules:
- kind must be exactly "${input.kind}" on every question.
- Every question has 4 options with ids "a","b","c","d" and EXACTLY ONE with correct:true.
- Every option with correct:false needs a misconception {tag, description}; the three wrong options of a question must carry three DIFFERENT tags.
- Each question needs a one-sentence "hint" (nudge, never the answer) and a clear "explanation".
- Exactly one mathematically defensible answer per question. Double-check all arithmetic.
- Question ids can be any short string; they will be renamed.
${avoid.length ? `- Do NOT repeat or closely paraphrase these existing questions:\n${avoid.map((p) => `  * ${p}`).join("\n")}` : ""}${revision}`;

  return generateJson({ system: SYSTEM, prompt, schema: BatchSchema, temperature: 0.7 });
}

const norm = (q: Question) => `${q.prompt} ${q.expression ?? ""}`.toLowerCase().replace(/\s+/g, " ").trim();

/** Generates, verifies and judges one batch; returns the approved, de-duplicated questions. */
export async function generateApprovedBatch(
  kind: Kind,
  count: number,
  themeIndex: number,
  existing: Question[],
  log: (msg: string) => void,
): Promise<Question[]> {
  const avoidPrompts = existing.filter((q) => q.kind === kind).map((q) => q.prompt);

  const { draft } = await runGenerateAndJudgeLoop<Batch>({
    learnerId: "system",
    label: `Bank batch (${kind})`,
    draftFn: (feedback, previous) => draftBankBatch({ kind, count, themeIndex, avoidPrompts, feedback, previous }),
    judgeFn: (batch) => {
      const wrongKind = batch.questions.filter((q) => q.kind !== kind).map((q) => `${q.id} has kind ${q.kind}, expected ${kind}`);
      const duplicateTags = batch.questions
        .filter((q) => {
          const tags = q.options.flatMap((o) => (o.misconception ? [o.misconception.tag] : []));
          return new Set(tags).size !== tags.length;
        })
        .map((q) => `${q.id}: two wrong options share the same misconception tag`);
      const codeProblems = [...wrongKind, ...duplicateTags, ...batch.questions.flatMap(verifyQuestion)];
      const quiz: Quiz = { topicId: "bodmas", questions: batch.questions };
      return judgeQuiz(quiz, codeProblems);
    },
    logFn: (e) => log(`[${e.agent}] ${e.message}`),
  });

  const seen = new Set(existing.map(norm));
  const fresh: Question[] = [];
  for (const q of draft.questions) {
    const key = norm(q);
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(q);
  }
  return fresh;
}
