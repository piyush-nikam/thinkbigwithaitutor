import { generateJson } from "../server/gemini";
import type { Quiz } from "../shared/types";
import { JudgeVerdictSchema, type JudgeVerdict, type Storyboard } from "./schemas";

const JUDGE_SYSTEM = `You are Agent 2 (LLM-as-a-Judge), a strict maths pedagogy reviewer.
You reject drafts that have any mathematical error, ambiguous wording, multiple defensible answers, mismatched misconception tags, or weak explanations.
Approve (approved: true) ONLY when score >= 8 and there are zero blocking issues.`;

export async function judgeQuiz(quiz: Quiz, codeProblems: string[]): Promise<JudgeVerdict> {
  if (codeProblems.length > 0) {
    return {
      score: 3,
      approved: false,
      critique: `Automated arithmetic verification failed: ${codeProblems.join("; ")}`,
      issues: codeProblems,
    };
  }

  const prompt = `Review this generated quiz JSON for mathematical rigor, zero ambiguity, and accurate misconception tagging:

${JSON.stringify(quiz, null, 2)}

Checklist:
1. Does every question have exactly ONE mathematically defensible correct answer?
2. Are the distractors realistic mistakes, and does each wrong option's misconception tag/description accurately match why a student would pick that option?
3. Are hints helpful without giving away the exact answer?
4. Is the wording crisp and unambiguous?

Return score (1-10), approved (true only if score >= 8 and no blocking issues), critique, and issues.`;

  return generateJson({
    system: JUDGE_SYSTEM,
    prompt,
    schema: JudgeVerdictSchema,
    temperature: 0.2,
  });
}

export async function judgeStoryboard(
  storyboard: Storyboard,
  misconceptionDescription: string,
): Promise<JudgeVerdict> {
  const prompt = `Review this remedial lesson storyboard targeting the misconception:
"${misconceptionDescription}"

Storyboard:
${JSON.stringify(storyboard, null, 2)}

Checklist:
1. Is every mathematical step and equation 100% accurate?
2. Does it directly resolve the stated misconception rather than just repeating "BODMAS"?
3. Are the captions concise enough to read comfortably in a short animated video?
4. Are the visual ideas concrete enough for an animation Director to render with equation steps, highlights, and rule cards?

Return score (1-10), approved (true only if score >= 8 and no blocking issues), critique, and issues.`;

  return generateJson({
    system: JUDGE_SYSTEM,
    prompt,
    schema: JudgeVerdictSchema,
    temperature: 0.2,
  });
}
