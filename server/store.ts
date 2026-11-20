import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { BODMAS_TOPIC_ID } from "../shared/catalog";
import type { AgentEvent, Learner, Lesson, Quiz } from "../shared/types";

// MVP storage: one JSON file, kept in memory and rewritten atomically on each change.
// Fine for a single server process; swap for Firestore if we need durability.

interface Db {
  learners: Record<string, Learner>;
  quizzes: Record<string, Quiz>; // cached per topic, shared by all learners
  retests: Record<string, Quiz>; // keyed by `${learnerId}:${topicId}`
  lessons: Record<string, Lesson>;
  events: AgentEvent[];
}

const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const MAX_EVENTS = 2000;

function load(): Db {
  if (existsSync(DB_FILE)) {
    const parsed = JSON.parse(readFileSync(DB_FILE, "utf8")) as Partial<Db>;
    return {
      learners: parsed.learners ?? {},
      quizzes: parsed.quizzes ?? {},
      retests: parsed.retests ?? {},
      lessons: parsed.lessons ?? {},
      events: parsed.events ?? [],
    };
  }
  return { learners: {}, quizzes: {}, retests: {}, lessons: {}, events: [] };
}

const db: Db = load();

function save() {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2));
  renameSync(tmp, DB_FILE);
}

const now = () => new Date().toISOString();

// ---------- Learners ----------

export function getOrCreateLearner(id: string): Learner {
  let learner = db.learners[id];
  if (!learner) {
    learner = {
      id,
      createdAt: now(),
      topics: { [BODMAS_TOPIC_ID]: { status: "available", attempts: 0, misconceptions: [] } },
    };
    db.learners[id] = learner;
    save();
  }
  return learner;
}

export function updateLearner(id: string, mutate: (l: Learner) => void): Learner {
  const learner = getOrCreateLearner(id);
  mutate(learner);
  save();
  return learner;
}

// ---------- Quizzes ----------

export const getQuiz = (topicId: string): Quiz | undefined => db.quizzes[topicId];

export function saveQuiz(quiz: Quiz) {
  db.quizzes[quiz.topicId] = quiz;
  save();
}

export const getRetestQuiz = (learnerId: string, topicId: string): Quiz | undefined =>
  db.retests[`${learnerId}:${topicId}`];

export function saveRetestQuiz(learnerId: string, topicId: string, quiz: Quiz) {
  db.retests[`${learnerId}:${topicId}`] = quiz;
  save();
}

// ---------- Lessons ----------

export function createLesson(learnerId: string, topicId: string, misconceptionTag: string): Lesson {
  const lesson: Lesson = {
    id: randomUUID(),
    learnerId,
    topicId,
    misconceptionTag,
    status: "pending",
    attempts: 0,
    createdAt: now(),
    updatedAt: now(),
  };
  db.lessons[lesson.id] = lesson;
  save();
  return lesson;
}

export function updateLesson(id: string, patch: Partial<Lesson>): Lesson {
  const lesson = db.lessons[id];
  if (!lesson) throw new Error(`Unknown lesson ${id}`);
  Object.assign(lesson, patch, { updatedAt: now() });
  save();
  return lesson;
}

export const lessonsFor = (learnerId: string): Lesson[] =>
  Object.values(db.lessons).filter((l) => l.learnerId === learnerId);

export const pendingLessons = (): Lesson[] =>
  Object.values(db.lessons).filter((l) => l.status === "pending");

// ---------- Agent events (for the live inspector) ----------

export function logEvent(event: Omit<AgentEvent, "id" | "at">): AgentEvent {
  const full: AgentEvent = { ...event, id: randomUUID(), at: now() };
  db.events.push(full);
  if (db.events.length > MAX_EVENTS) db.events.splice(0, db.events.length - MAX_EVENTS);
  save();
  return full;
}

export const eventsFor = (learnerId: string, since?: string): AgentEvent[] =>
  db.events.filter((e) => e.learnerId === learnerId && (!since || e.at > since));
