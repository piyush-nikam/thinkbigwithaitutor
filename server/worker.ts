import { CATALOG } from "../shared/catalog";
import type { Lesson } from "../shared/types";
import { directLesson } from "../agents/director";
import { generateApprovedStoryboard } from "../agents/loops";
import { getOrCreateLearner, logEvent, pendingLessons, updateLesson } from "./store";

let running = false;

async function processLesson(lesson: Lesson) {
  const attempts = lesson.attempts + 1;
  updateLesson(lesson.id, { status: "generating", attempts, error: undefined });

  try {
    const learner = getOrCreateLearner(lesson.learnerId);
    const topicTitle =
      CATALOG.flatMap((d) => d.topics).find((t) => t.id === lesson.topicId)?.title ?? lesson.topicId;
    const misconception = learner.topics[lesson.topicId]?.misconceptions.find(
      (m) => m.tag === lesson.misconceptionTag,
    );

    const storyboard = await generateApprovedStoryboard({
      learnerId: lesson.learnerId,
      lessonId: lesson.id,
      topicTitle,
      misconceptionTag: lesson.misconceptionTag,
      misconceptionDescription:
        misconception?.description ?? `Misconception: ${lesson.misconceptionTag.replace(/_/g, " ")}`,
    });

    logEvent({
      learnerId: lesson.learnerId,
      lessonId: lesson.id,
      agent: "director",
      message: `Composing Remotion timeline for "${storyboard.title}"`,
    });

    const timeline = await directLesson(storyboard);

    // Agent 4 (Engineer): publish the lesson so it appears on the learner's home screen.
    updateLesson(lesson.id, { status: "ready", timeline });
    logEvent({
      learnerId: lesson.learnerId,
      lessonId: lesson.id,
      agent: "engineer",
      message: `Published remedial lesson "${timeline.title}" to learner dashboard`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const retry = attempts < 2;
    updateLesson(lesson.id, { status: retry ? "pending" : "failed", error: msg });
    logEvent({
      learnerId: lesson.learnerId,
      lessonId: lesson.id,
      agent: "engineer",
      message: retry ? `Lesson job failed (${msg}) — queued for retry` : `Lesson job failed: ${msg}`,
    });
  }
}

export function startWorker(intervalMs = 2000) {
  setInterval(async () => {
    if (running) return;
    const queue = pendingLessons();
    if (queue.length === 0) return;

    running = true;
    try {
      for (const lesson of queue) {
        await processLesson(lesson);
      }
    } finally {
      running = false;
    }
  }, intervalMs);
}
