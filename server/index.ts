import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { CATALOG } from "../shared/catalog";
import type { Question, Quiz } from "../shared/types";
import { generateApprovedQuiz } from "../agents/loops";
import { loadBank, pickQuiz, shuffleOptions } from "./bank";
import { evaluateSubmission, type SubmittedAnswer } from "./evaluator";
import { isGeminiConfigured } from "./gemini";
import {
  eventsFor,
  getActiveQuiz,
  getOrCreateLearner,
  getQuiz,
  lessonsFor,
  saveActiveQuiz,
  saveQuiz,
  updateLesson,
} from "./store";
import { startWorker } from "./worker";

const app = express();
app.use(express.json());

// Learner IDs are random UUIDs generated in the browser; reject anything else.
const LEARNER_ID = /^[0-9a-f-]{36}$/i;

const findTopic = (topicId: string) =>
  CATALOG.flatMap((d) => d.topics).find((t) => t.id === topicId && !t.placeholder);

app.get("/api/health", (_req, res) => {
  const bank = loadBank("bodmas");
  res.json({
    ok: true,
    geminiKeyConfigured: isGeminiConfigured(),
    bankSize: bank.length,
  });
});

app.get("/api/catalog", (_req, res) => {
  res.json(CATALOG);
});

app.get("/api/learners/:id", (req, res) => {
  const { id } = req.params;
  if (!LEARNER_ID.test(id)) {
    res.status(400).json({ error: "invalid learner id" });
    return;
  }
  res.json({ learner: getOrCreateLearner(id), lessons: lessonsFor(id) });
});

app.get("/api/learners/:id/events", (req, res) => {
  const { id } = req.params;
  if (!LEARNER_ID.test(id)) {
    res.status(400).json({ error: "invalid learner id" });
    return;
  }
  const combined = [...eventsFor("system"), ...eventsFor(id)].sort((a, b) =>
    a.at.localeCompare(b.at),
  );
  res.json({ events: combined });
});

// ---------- First quiz: a random draw from the pre-generated question bank ----------

const legacyQuizInFlight = new Map<string, Promise<Quiz>>();

/** Only used if the bank is incomplete (e.g. `npm run bank:generate` hasn't been run yet). */
async function legacyGeneratedQuiz(topicId: string, title: string): Promise<Quiz> {
  const cached = getQuiz(topicId);
  if (cached) return cached;
  let pending = legacyQuizInFlight.get(topicId);
  if (!pending) {
    pending = generateApprovedQuiz(topicId, title).then((quiz) => {
      saveQuiz(quiz);
      return quiz;
    });
    legacyQuizInFlight.set(topicId, pending);
    pending.finally(() => legacyQuizInFlight.delete(topicId));
  }
  return pending;
}

app.get("/api/learners/:id/topics/:topicId/quiz", async (req, res) => {
  const { id, topicId } = req.params;
  if (!LEARNER_ID.test(id)) {
    res.status(400).json({ error: "invalid learner id" });
    return;
  }
  const topic = findTopic(topicId);
  if (!topic) {
    res.status(404).json({ error: "topic not found" });
    return;
  }

  try {
    const quiz = pickQuiz(topicId, loadBank(topicId)) ?? (await legacyGeneratedQuiz(topicId, topic.title));
    saveActiveQuiz(id, topicId, quiz);
    res.json(quiz);
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

// ---------- Submitting answers (first quiz and retest share one handler) ----------

function submitHandler(req: express.Request<{ id: string; topicId: string }>, res: express.Response) {
  const { id, topicId } = req.params;
  if (!LEARNER_ID.test(id)) {
    res.status(400).json({ error: "invalid learner id" });
    return;
  }
  const quiz = getActiveQuiz(id, topicId);
  if (!quiz) {
    res.status(404).json({ error: "no active quiz for this learner — start the quiz again" });
    return;
  }
  const answers = (req.body?.answers ?? []) as SubmittedAnswer[];
  if (!Array.isArray(answers) || answers.length === 0) {
    res.status(400).json({ error: "answers array required" });
    return;
  }
  const result = evaluateSubmission(id, topicId, quiz, answers);
  res.json({
    ...result,
    learner: getOrCreateLearner(id),
    lessons: lessonsFor(id),
  });
}

app.post("/api/learners/:id/topics/:topicId/submit", submitHandler);
app.post("/api/learners/:id/topics/:topicId/retest-submit", submitHandler);

app.post("/api/learners/:id/lessons/:lessonId/retry", (req, res) => {
  const { id, lessonId } = req.params;
  if (!LEARNER_ID.test(id)) {
    res.status(400).json({ error: "invalid learner id" });
    return;
  }
  const lesson = lessonsFor(id).find((l) => l.id === lessonId);
  if (!lesson) {
    res.status(404).json({ error: "lesson not found" });
    return;
  }
  updateLesson(lessonId, { status: "pending", attempts: 0, error: undefined });
  res.json({ lessons: lessonsFor(id) });
});

// ---------- Retest: assembled from questions curated while each lesson was prepared ----------

app.get("/api/learners/:id/topics/:topicId/retest", async (req, res) => {
  const { id, topicId } = req.params;
  if (!LEARNER_ID.test(id)) {
    res.status(400).json({ error: "invalid learner id" });
    return;
  }
  const topic = findTopic(topicId);
  if (!topic) {
    res.status(404).json({ error: "topic not found" });
    return;
  }

  const learner = getOrCreateLearner(id);
  const unresolved = (learner.topics[topicId]?.misconceptions ?? []).filter(
    (m) => m.strength === "confirmed" && !m.resolved,
  );
  const focus = Array.from(
    new Map(unresolved.map((m) => [m.tag, { tag: m.tag, description: m.description }])).values(),
  );
  if (focus.length === 0) {
    res.status(400).json({ error: "no unresolved misconceptions to retest" });
    return;
  }

  const lessons = lessonsFor(id).filter((l) => l.topicId === topicId);
  const stillPreparing = focus.filter((f) =>
    lessons.some((l) => l.misconceptionTag === f.tag && (l.status === "pending" || l.status === "generating")),
  );
  if (stillPreparing.length > 0) {
    res.status(409).json({
      error: `Your lesson for "${stillPreparing[0].tag.replace(/_/g, " ")}" is still being prepared. Retest unlocks when it is ready.`,
    });
    return;
  }

  const questions: Question[] = [];
  const missing: typeof focus = [];
  for (const f of focus) {
    const lesson = [...lessons].reverse().find(
      (l) => l.misconceptionTag === f.tag && l.status === "ready" && l.retestQuestions?.length,
    );
    if (lesson?.retestQuestions) questions.push(...lesson.retestQuestions.map((q) => shuffleOptions(q)));
    else missing.push(f);
  }

  try {
    // Safety net for older lessons that were created before retests were curated up front.
    if (missing.length > 0) {
      const extra = await generateApprovedQuiz(topicId, topic.title, id, missing);
      questions.push(...extra.questions.map((q, i) => ({ ...q, id: `rt_gen_${i + 1}` })));
    }
    const quiz: Quiz = { topicId, questions };
    saveActiveQuiz(id, topicId, quiz);
    res.json(quiz);
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

// In production the server also serves the built frontend.
const dist = path.resolve("dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(dist, "index.html"));
  });
}

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`);
  startWorker();
});
