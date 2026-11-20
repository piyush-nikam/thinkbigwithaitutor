import { test } from "node:test";
import assert from "node:assert/strict";
import { runGenerateAndJudgeLoop } from "./loops";

test("loop approves on first round when judge approves", async () => {
  const logs: string[] = [];
  const res = await runGenerateAndJudgeLoop({
    learnerId: "l1",
    label: "Test",
    draftFn: async () => ({ content: "v1" }),
    judgeFn: async () => ({ score: 9, approved: true, critique: "Good", issues: [] }),
    logFn: (e) => logs.push(`${e.agent}:${e.message}`),
  });

  assert.equal(res.rounds, 1);
  assert.deepEqual(res.draft, { content: "v1" });
  assert.equal(logs.length, 2);
});

test("loop passes critique back to generator and approves on round 2", async () => {
  const seenFeedback: Array<string | undefined> = [];
  let attempt = 0;

  const res = await runGenerateAndJudgeLoop({
    learnerId: "l1",
    label: "Test",
    draftFn: async (feedback) => {
      seenFeedback.push(feedback);
      attempt++;
      return { version: attempt };
    },
    judgeFn: async (d) =>
      d.version < 2
        ? { score: 5, approved: false, critique: "Clarify tie-breaker", issues: ["Missing example"] }
        : { score: 9, approved: true, critique: "Clear", issues: [] },
    logFn: () => {},
  });

  assert.equal(res.rounds, 2);
  assert.equal(seenFeedback[0], undefined);
  assert.match(seenFeedback[1]!, /Clarify tie-breaker/);
});

test("loop throws when maxRounds is exceeded without approval", async () => {
  await assert.rejects(
    () =>
      runGenerateAndJudgeLoop({
        learnerId: "l1",
        label: "Test",
        maxRounds: 2,
        draftFn: async () => ({}),
        judgeFn: async () => ({ score: 4, approved: false, critique: "Still wrong", issues: [] }),
        logFn: () => {},
      }),
    /not approved after 2 rounds/,
  );
});
