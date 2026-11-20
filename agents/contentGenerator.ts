import { generateJson } from "../server/gemini";
import { QuizSchema, type Quiz } from "../shared/types";
import { StoryboardSchema, type Storyboard } from "./schemas";

const QUIZ_SYSTEM = `You are Agent 1 (Content Generator), an expert maths curriculum designer.
Your job is to create diagnostic multiple-choice quizzes where EVERY wrong option corresponds to a specific, named misconception.
Keep language crisp, unambiguous, and suitable for students.`;

export interface DraftQuizInput {
  topicId: string;
  topicTitle: string;
  misconceptionsFocus?: Array<{ tag: string; description: string }>;
  feedback?: string;
  previousDraft?: Quiz;
}

export async function draftQuiz({
  topicId,
  topicTitle,
  misconceptionsFocus,
  feedback,
  previousDraft,
}: DraftQuizInput): Promise<Quiz> {
  const isRetest = Boolean(misconceptionsFocus?.length);
  const focusBlock = isRetest
    ? `This is a RETEST targeting ONLY these missed misconceptions:\n${misconceptionsFocus!
        .map((m) => `- ${m.tag}: ${m.description}`)
        .join("\n")}\nCreate exactly 2 fresh questions per misconception: one text-based question (kind "which_first", "next_step" or "spot_mistake") and one "numeric" question. Every question must lead a learner with that misconception to a specific wrong option, and use brand-new expressions not seen before.`
    : `Create 4 questions for "${topicTitle}":
- Question 1 (kind: "which_first"): text-based, asking which operation is evaluated first (e.g. testing equal precedence left-to-right for + and - or × and ÷).
- Question 2 (kind: "next_step"): text-based, asking what the exact first step is in a multi-operation expression with brackets or orders.
- Question 3 (kind: "spot_mistake"): text-based, showing a student's wrong worked answer and asking what rule they broke.
- Question 4 (kind: "numeric"): arithmetic calculation with an explicit "expression" field (using standard +, -, *, /, ^ or ×, ÷, ²) and 4 numeric options.`;

  const revisionBlock =
    feedback && previousDraft
      ? `\n\nPREVIOUS DRAFT WAS REJECTED BY JUDGE:\nFeedback: ${feedback}\nPrevious Draft: ${JSON.stringify(previousDraft)}\nFix all issues noted by the Judge.`
      : "";

  const prompt = `Topic ID: "${topicId}" (${topicTitle})
${focusBlock}

Rules:
- Each question must have 4 options (ids "a", "b", "c", "d"), with EXACTLY ONE option having correct: true.
- Every option with correct: false MUST include a misconception object: { tag: "snake_case_tag", description: "clear explanation of the misconception" }.
- For "numeric" questions, every option's "text" must be a plain number (e.g. "12", "-4").
- Each question needs a helpful 1-sentence "hint" (nudges without giving away the answer) and a clear "explanation".
- Ensure there is zero ambiguity and only one mathematically defensible answer.${revisionBlock}`;

  return generateJson({
    system: QUIZ_SYSTEM,
    prompt,
    schema: QuizSchema,
    temperature: 0.35,
  });
}

export interface DraftStoryboardInput {
  topicTitle: string;
  misconceptionTag: string;
  misconceptionDescription: string;
  wrongContext?: string;
  feedback?: string;
  previousDraft?: Storyboard;
}

const STORYBOARD_SYSTEM = `You are Agent 1 (Content Generator), an expert visual maths tutor.
You design short, high-impact 3-to-4-scene remedial lesson storyboards that dismantle a single learner misconception using clear visual analogies—never by just repeating an acronym.`;

export async function draftRemedialStoryboard({
  topicTitle,
  misconceptionTag,
  misconceptionDescription,
  wrongContext,
  feedback,
  previousDraft,
}: DraftStoryboardInput): Promise<Storyboard> {
  const revisionBlock =
    feedback && previousDraft
      ? `\n\nPREVIOUS STORYBOARD WAS REJECTED BY JUDGE:\nFeedback: ${feedback}\nPrevious Draft: ${JSON.stringify(previousDraft)}\nRevise the storyboard to address every point.`
      : "";

  const prompt = `Topic: ${topicTitle}
Target Misconception Tag: ${misconceptionTag}
Misconception Description: ${misconceptionDescription}
${wrongContext ? `Learner Context: ${wrongContext}` : ""}

Design a 3-to-4-scene visual lesson (30–45 seconds total, captions only, no voiceover):
1. Scene 1: Show the exact trap / wrong approach and why it feels tempting.
2. Scene 2: Introduce the clear mental model or rule (e.g., equal-rank twins evaluated left-to-right, or tier priority).
3. Scene 3: Walk through the concrete example step-by-step to the correct answer.
4. Optional Scene 4: Quick takeaway rule card.

Each scene needs:
- title: short headline
- visualIdea: concrete description of what moves/highlights on screen (for the animation Director)
- caption: concise on-screen text (max ~18 words)
- expressionOrExample: optional math expression shown in that scene${revisionBlock}`;

  return generateJson({
    system: STORYBOARD_SYSTEM,
    prompt,
    schema: StoryboardSchema,
    temperature: 0.45,
  });
}
