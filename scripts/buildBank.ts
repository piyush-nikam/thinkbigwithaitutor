// Validates the static BODMAS question source, computes numeric answers & distractors
// deterministically via shared/arith.ts, and writes shared/bank/bodmas.json.
// Run: npm run bank:build
import { evaluate } from "../shared/arith";
import { saveBank } from "../server/bank";
import { QuestionSchema, type Question } from "../shared/types";
import { verifyQuestion } from "../shared/verify";
import { NEXT_STEP, NUMERIC, SPOT_MISTAKE, TAGS, WHICH_FIRST, type TextRow } from "./bankSource";

function buildText(kind: "which_first" | "next_step" | "spot_mistake", rows: TextRow[]): Question[] {
  return rows.map((row, idx) => {
    const id = `${kind}_${String(idx + 1).padStart(2, "0")}`;
    const prompt =
      row.prompt ??
      (kind === "which_first"
        ? `In ${row.expression}, which operation should be done first?`
        : `What is the exact first step when solving ${row.expression}?`);

    const options = [
      { id: "a", text: row.correct, correct: true },
      ...row.wrongs.map(([text, tag], i) => {
        if (!TAGS[tag]) throw new Error(`${id}: unknown tag "${tag}"`);
        return {
          id: String.fromCharCode(98 + i),
          text,
          correct: false,
          misconception: { tag, description: TAGS[tag] },
        };
      }),
    ];

    const q: Question = {
      id,
      kind,
      prompt,
      expression: kind === "spot_mistake" ? undefined : row.expression,
      options,
      hint: row.hint,
      explanation: row.explanation,
    };
    const parsed = QuestionSchema.safeParse(q);
    if (!parsed.success) {
      throw new Error(`${id} failed schema: ${parsed.error.message}`);
    }
    return parsed.data;
  });
}

function buildNumeric(): Question[] {
  return NUMERIC.map((row, idx) => {
    const id = `numeric_${String(idx + 1).padStart(2, "0")}`;
    const answer = evaluate(row.expression);
    const seen = new Set<number>([answer]);

    const wrongOptions = row.wrongs.map(([expr, tag], i) => {
      if (!TAGS[tag]) throw new Error(`${id}: unknown tag "${tag}"`);
      const val = evaluate(expr);
      if (seen.has(val)) {
        throw new Error(`${id}: distractor "${expr}" evaluated to duplicate value ${val}`);
      }
      seen.add(val);
      return {
        id: String.fromCharCode(98 + i),
        text: String(val),
        correct: false,
        misconception: { tag, description: TAGS[tag] },
      };
    });

    const q: Question = {
      id,
      kind: "numeric",
      prompt: `Calculate: ${row.expression}`,
      expression: row.expression,
      options: [{ id: "a", text: String(answer), correct: true }, ...wrongOptions],
      hint: row.hint,
      explanation: row.explanation,
    };

    const parsed = QuestionSchema.safeParse(q);
    if (!parsed.success) throw new Error(`${id} failed schema: ${parsed.error.message}`);
    const problems = verifyQuestion(q);
    if (problems.length > 0) throw new Error(`${id} failed verify: ${problems.join(", ")}`);
    return parsed.data;
  });
}

const all: Question[] = [
  ...buildText("which_first", WHICH_FIRST),
  ...buildText("next_step", NEXT_STEP),
  ...buildText("spot_mistake", SPOT_MISTAKE),
  ...buildNumeric(),
];

saveBank("bodmas", all);
console.log(
  `Built shared/bank/bodmas.json with ${all.length} validated questions:`,
  {
    which_first: WHICH_FIRST.length,
    next_step: NEXT_STEP.length,
    spot_mistake: SPOT_MISTAKE.length,
    numeric: NUMERIC.length,
  },
);
