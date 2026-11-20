// Generates the BODMAS question bank (Agent 1 drafts, Agent 2 judges, code verifies numerics).
// Resumable: re-running keeps approved questions and only fills the remaining gaps.
//
//   npm run bank:generate            -> fill up to 50 questions
//   npm run bank:generate -- 60      -> fill up to a different total
import { generateApprovedBatch } from "../agents/bankGenerator";
import { loadBank, saveBank } from "../server/bank";
import type { Question } from "../shared/types";

const TOPIC_ID = "bodmas";
const TOTAL = Number(process.argv[2] ?? 50);
const BATCH_SIZE = 4;
const MAX_FAILED_BATCHES_PER_KIND = 4;

const SHARE: Array<{ kind: Question["kind"]; weight: number }> = [
  { kind: "which_first", weight: 12 },
  { kind: "next_step", weight: 12 },
  { kind: "spot_mistake", weight: 12 },
  { kind: "numeric", weight: 14 },
];
const weightSum = SHARE.reduce((s, k) => s + k.weight, 0);
const targets = SHARE.map(({ kind, weight }) => ({ kind, target: Math.round((TOTAL * weight) / weightSum) }));

const log = (msg: string) => console.log(`  ${msg}`);

function nextId(bank: Question[], kind: Question["kind"]): string {
  const used = bank.filter((q) => q.kind === kind).length;
  return `${kind}_${String(used + 1).padStart(2, "0")}`;
}

async function main() {
  const bank = loadBank(TOPIC_ID);
  console.log(`Bank has ${bank.length} questions. Targets: ${targets.map((t) => `${t.kind}=${t.target}`).join(", ")}`);

  let themeIndex = bank.length;
  for (const { kind, target } of targets) {
    let failed = 0;
    while (bank.filter((q) => q.kind === kind).length < target && failed < MAX_FAILED_BATCHES_PER_KIND) {
      const have = bank.filter((q) => q.kind === kind).length;
      const want = Math.min(BATCH_SIZE, target - have);
      console.log(`\n[${kind}] ${have}/${target} - generating ${want} (theme ${themeIndex % 8})`);
      try {
        const fresh = await generateApprovedBatch(kind, want, themeIndex++, bank, log);
        for (const q of fresh.slice(0, want)) bank.push({ ...q, id: nextId(bank, kind) });
        saveBank(TOPIC_ID, bank);
        console.log(`  + ${fresh.length} approved (total ${bank.length})`);
        if (fresh.length === 0) failed++;
      } catch (e) {
        failed++;
        console.log(`  ! batch failed (${failed}/${MAX_FAILED_BATCHES_PER_KIND}): ${(e as Error).message.slice(0, 200)}`);
      }
    }
  }

  const counts = Object.fromEntries(SHARE.map(({ kind }) => [kind, bank.filter((q) => q.kind === kind).length]));
  console.log(`\nDone. ${bank.length} questions saved to shared/bank/${TOPIC_ID}.json`, counts);
  process.exit(0);
}

main();
