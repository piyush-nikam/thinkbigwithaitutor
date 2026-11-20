import { generateJson } from "../server/gemini";
import { TimelineSchema, type SceneTimeline, type Storyboard } from "./schemas";

const DIRECTOR_SYSTEM = `You are Agent 3 (Director), an animation director for an educational Remotion player.
Convert the approved storyboard into a concrete SceneTimeline JSON using ONLY the 4 allowed scene kinds:
- "trap": shows the expression, wrongStep, and wrongAnswer that learners fall into.
- "rule_card": shows the mental model badge, ruleText, and highlightOps (e.g. ["+", "−"] or ["÷", "×"]).
- "step_by_step": animates 2–5 sequential calculation steps (expr + short note) to finalAnswer.
- "takeaway": closing summary card.

Use durationInFrames between 120 and 210 (at 30fps, 4–7 seconds per scene). Keep captions concise.`;

export async function directLesson(storyboard: Storyboard): Promise<SceneTimeline> {
  const prompt = `Convert this approved storyboard into a SceneTimeline JSON:

${JSON.stringify(storyboard, null, 2)}

Requirements:
- Keep misconceptionTag exact: "${storyboard.misconceptionTag}".
- Start with a "trap" scene, include at least one "rule_card" and one "step_by_step" scene, and end with a "takeaway" scene.
- Every number and step must be 100% mathematically accurate.`;

  return generateJson({
    system: DIRECTOR_SYSTEM,
    prompt,
    schema: TimelineSchema,
    temperature: 0.25,
  });
}
