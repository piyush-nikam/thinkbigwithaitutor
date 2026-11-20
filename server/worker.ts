import { CATALOG } from "../shared/catalog";
import type { Lesson, Question } from "../shared/types";
import { directLesson } from "../agents/director";
import { generateApprovedQuiz, generateApprovedStoryboard } from "../agents/loops";
import { getOrCreateLearner, logEvent, pendingLessons, updateLesson } from "./store";

let running = false;

/** Re-ids retest questions so ids stay unique when questions from several lessons are combined. */
function namespaceQuestions(lessonId: string, questions: Question[]): Question[] {
  const prefix = lessonId.slice(0, 8);
  return questions.map((q, i) => ({ ...q, id: `rt_${prefix}_${i + 1}` }));
}

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
    const description =
      misconception?.description ?? `Misconception: ${lesson.misconceptionTag.replace(/_/g, " ")}`;

    const storyboard = await generateApprovedStoryboard({
      learnerId: lesson.learnerId,
      lessonId: lesson.id,
      topicTitle,
      misconceptionTag: lesson.misconceptionTag,
      misconceptionDescription: description,
    });

    logEvent({
      learnerId: lesson.learnerId,
      lessonId: lesson.id,
      agent: "director",
      message: `Composing Remotion timeline for "${storyboard.title}" and curating retest questions in parallel`,
    });

    // Build the video and the retest questions for THIS misconception at the same time, so the
    // retest is ready the moment the lesson is published.
    const [timelineResult, retestResult] = await Promise.allSettled([
      directLesson(storyboard),
      lesson.retestQuestions?.length
        ? Promise.resolve({ questions: lesson.retestQuestions })
        : generateApprovedQuiz(lesson.topicId, topicTitle, lesson.learnerId, [
            { tag: lesson.misconceptionTag, description },
          ]),
    ]);

    if (timelineResult.status === "rejected") throw timelineResult.reason;
    const timeline = timelineResult.value;

    let retestQuestions: Question[] | undefined;
    if (retestResult.status === "fulfilled") {
      retestQuestions = namespaceQuestions(lesson.id, retestResult.value.questions);
      logEvent({
        learnerId: lesson.learnerId,
        lessonId: lesson.id,
        agent: "content_generator",
        message: `Curated ${retestQuestions.length} retest question(s) for "${lesson.misconceptionTag}"`,
      });
    } else {
      logEvent({
        learnerId: lesson.learnerId,
        lessonId: lesson.id,
        agent: "content_generator",
        message: `Retest questions could not be prepared (${String(retestResult.reason).slice(0, 120)}) — will be created on demand`,
      });
    }

    // Agent 4 (Engineer): publish the lesson so it appears on the learner's home screen.
    updateLesson(lesson.id, { status: "ready", timeline, retestQuestions });
    logEvent({
      learnerId: lesson.learnerId,
      lessonId: lesson.id,
      agent: "engineer",
      message: `Published remedial lesson "${timeline.title}" with its retest to learner dashboard`,
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
