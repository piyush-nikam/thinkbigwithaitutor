import { test } from "node:test";
import assert from "node:assert/strict";
import { pickQuiz, shuffleOptions } from "./bank";
import type { Question } from "../shared/types";

const make = (id: string, kind: Question["kind"]): Question => ({
  id,
  kind,
  prompt: `Prompt for ${id}`,
  expression: kind === "numeric" ? "10 - 3 + 2" : undefined,
  options: [
    { id: "a", text: "right", correct: true },
    { id: "b", text: "wrong b", correct: false, misconception: { tag: `tag_${id}_b`, description: "wrong b mistake" } },
    { id: "c", text: "wrong c", correct: false, misconception: { tag: `tag_${id}_c`, description: "wrong c mistake" } },
    { id: "d", text: "wrong d", correct: false, misconception: { tag: `tag_${id}_d`, description: "wrong d mistake" } },
  ],
  hint: "A helpful hint",
  explanation: "A clear explanation",
});

const bank: Question[] = [
  ...["w1", "w2", "w3"].map((id) => make(id, "which_first")),
  ...["n1", "n2", "n3"].map((id) => make(id, "next_step")),
  ...["s1", "s2", "s3"].map((id) => make(id, "spot_mistake")),
  ...["m1", "m2", "m3"].map((id) => make(id, "numeric")),
];

test("pickQuiz returns one question of each kind", () => {
  const quiz = pickQuiz("bodmas", bank)!;
  assert.equal(quiz.questions.length, 4);
  assert.deepEqual(quiz.questions.map((q) => q.kind).sort(), ["next_step", "numeric", "spot_mistake", "which_first"]);
});

test("pickQuiz returns undefined when a kind is missing", () => {
  assert.equal(pickQuiz("bodmas", bank.filter((q) => q.kind !== "numeric")), undefined);
});

test("pickQuiz gives different quizzes across draws", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 20; i++) seen.add(pickQuiz("bodmas", bank)!.questions.map((q) => q.id).join());
  assert.ok(seen.size > 1);
});

test("shuffleOptions keeps one correct option, misconceptions and relabels ids", () => {
  for (let i = 0; i < 20; i++) {
    const q = shuffleOptions(bank[0]);
    assert.deepEqual(q.options.map((o) => o.id), ["a", "b", "c", "d"]);
    assert.equal(q.options.filter((o) => o.correct).length, 1);
    assert.equal(q.options.filter((o) => !o.correct && o.misconception).length, 3);
  }
});

test("shuffleOptions does not mutate the original question", () => {
  const original = JSON.stringify(bank[0]);
  shuffleOptions(bank[0]);
  assert.equal(JSON.stringify(bank[0]), original);
});
