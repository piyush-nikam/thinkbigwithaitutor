import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { CATALOG } from "../shared/catalog";
import type { Quiz } from "../shared/types";
import { generateApprovedQuiz } from "../agents/loops";
import { evaluateSubmission, type SubmittedAnswer } from "./evaluator";
import {
  eventsFor,
  getOrCreateLearner,
  getQuiz,
  getRetestQuiz,
  lessonsFor,
  saveQuiz,
  saveRetestQuiz,
  updateLesson,
} from "./store";
import { startWorker } from "./worker";

const app = express();
app.use(express.json());

// Learner IDs are random UUIDs generated in the browser; reject anything else.
const LEARNER_ID = /^[0-9a-f-]{36}$/i;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY) });
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

const quizInFlight = new Map<string, Promise<Quiz>>();

app.get("/api/topics/:topicId/quiz", async (req, res) => {
  const { topicId } = req.params;
  const topic = CATALOG.flatMap((d) => d.topics).find((t) => t.id === topicId && !t.placeholder);
  if (!topic) {
    res.status(404).json({ error: "topic not found" });
    return;
  }

  const cached = getQuiz(topicId);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    let pending = quizInFlight.get(topicId);
    if (!pending) {
      pending = generateApprovedQuiz(topicId, topic.title).then((quiz) => {
        saveQuiz(quiz);
        return quiz;
      });
      quizInFlight.set(topicId, pending);
      pending.finally(() => quizInFlight.delete(topicId));
    }
    const quiz = await pending;
    res.json(quiz);
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

app.post("/api/learners/:id/topics/:topicId/submit", (req, res) => {
  const { id, topicId } = req.params;
  if (!LEARNER_ID.test(id)) {
    res.status(400).json({ error: "invalid learner id" });
    return;
  }
  const quiz = getQuiz(topicId);
  if (!quiz) {
    res.status(404).json({ error: "quiz not found for topic" });
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
});

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

app.get("/api/learners/:id/topics/:topicId/retest", async (req, res) => {
  const { id, topicId } = req.params;
  if (!LEARNER_ID.test(id)) {
    res.status(400).json({ error: "invalid learner id" });
    return;
  }
  const topic = CATALOG.flatMap((d) => d.topics).find((t) => t.id === topicId && !t.placeholder);
  if (!topic) {
    res.status(404).json({ error: "topic not found" });
    return;
  }

  const learner = getOrCreateLearner(id);
  const unresolved = (learner.topics[topicId]?.misconceptions ?? []).filter(
    (m) => m.strength === "confirmed" && !m.resolved,
  );
  const uniqueFocus = Array.from(
    new Map(unresolved.map((m) => [m.tag, { tag: m.tag, description: m.description }])).values(),
  );
  if (uniqueFocus.length === 0) {
    res.status(400).json({ error: "no unresolved misconceptions to retest" });
    return;
  }

  try {
    const quiz = await generateApprovedQuiz(topicId, topic.title, id, uniqueFocus);
    saveRetestQuiz(id, topicId, quiz);
    res.json(quiz);
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

app.post("/api/learners/:id/topics/:topicId/retest-submit", (req, res) => {
  const { id, topicId } = req.params;
  if (!LEARNER_ID.test(id)) {
    res.status(400).json({ error: "invalid learner id" });
    return;
  }
  const quiz = getRetestQuiz(id, topicId);
  if (!quiz) {
    res.status(404).json({ error: "retest quiz not found" });
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
