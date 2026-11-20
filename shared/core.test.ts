import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "./arith";
import { verifyQuestion } from "./verify";
import { QuestionSchema, type Question } from "./types";

test("addition and subtraction share a level and go left to right", () => {
  assert.equal(evaluate("10 - 3 + 2"), 9);
  assert.equal(evaluate("10 − 4 + 2 × 3"), 12);
});

test("division and multiplication share a level and go left to right", () => {
  assert.equal(evaluate("24 ÷ 4 × 2"), 12);
  assert.equal(evaluate("36 ÷ 6 × 3 + 1"), 19);
});

test("brackets and orders come first", () => {
  assert.equal(evaluate("5 × (2 + 3) − 4"), 21);
  assert.equal(evaluate("2 + 3 × (4 - 1)²"), 29);
  assert.equal(evaluate("2 + 3² × 2"), 20);
  assert.equal(evaluate("2 ^ 3 ^ 2"), 512); // right-associative
  assert.equal(evaluate("[8 + {6 - 2}] × 3"), 36);
});

test("unary minus and decimals", () => {
  assert.equal(evaluate("-3 + 5"), 2);
  assert.equal(evaluate("1.5 × 4"), 6);
});

test("invalid expressions throw", () => {
  assert.throws(() => evaluate("4 ÷ 0"), /Division by zero/);
  assert.throws(() => evaluate("(2 + 3"), /closing bracket/);
  assert.throws(() => evaluate("2 + a"), /Unexpected character/);
});

const numeric = (correctText: string, wrongText = "5"): Question => ({
  id: "q4",
  kind: "numeric",
  prompt: "What is 10 − 3 + 2?",
  expression: "10 − 3 + 2",
  options: [
    { id: "a", text: correctText, correct: true },
    { id: "b", text: wrongText, correct: false, misconception: { tag: "add_before_sub", description: "Adds before subtracting" } },
    { id: "c", text: "15", correct: false, misconception: { tag: "ignores_operators", description: "Adds everything" } },
  ],
  hint: "Addition and subtraction are equals.",
  explanation: "Go left to right: 10 − 3 = 7, then 7 + 2 = 9.",
});

test("verifyQuestion accepts a correct numeric question", () => {
  assert.deepEqual(verifyQuestion(numeric("9")), []);
});

test("verifyQuestion catches a wrong answer key", () => {
  assert.match(verifyQuestion(numeric("5", "9")).join(), /marked correct/);
});

test("schema requires a misconception on every wrong option", () => {
  const q = numeric("9");
  delete q.options[1].misconception;
  assert.equal(QuestionSchema.safeParse(q).success, false);
});

test("schema requires exactly one correct option", () => {
  const q = numeric("9");
  q.options[1].correct = true;
  assert.equal(QuestionSchema.safeParse(q).success, false);
});
