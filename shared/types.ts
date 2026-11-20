import { z } from "zod";

// ---------- Catalog ----------

export type TopicStatus = "locked" | "available" | "passed";

export interface TopicDef {
  id: string;
  title: string;
  /** Placeholder topics are shown with a lock and have no content yet. */
  placeholder?: boolean;
}

export interface DomainDef {
  id: string;
  title: string;
  placeholder?: boolean;
  topics: TopicDef[];
}

// ---------- Quiz (produced by Agent 1, approved by Agent 2) ----------

export const QuestionKind = z.enum(["which_first", "next_step", "spot_mistake", "numeric"]);

export const MisconceptionSchema = z.object({
  tag: z.string().regex(/^[a-z0-9_]+$/, "snake_case tag"),
  description: z.string().min(5),
});

export const OptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  correct: z.boolean(),
  /** Required on every wrong option: the misconception that leads to picking it. */
  misconception: MisconceptionSchema.optional(),
});

export const QuestionSchema = z
  .object({
    id: z.string(),
    kind: QuestionKind,
    prompt: z.string().min(5),
    /** The arithmetic expression; required for numeric questions. */
    expression: z.string().optional(),
    options: z.array(OptionSchema).min(3).max(4),
    hint: z.string().min(5),
    explanation: z.string().min(5),
  })
  .superRefine((q, ctx) => {
    const correct = q.options.filter((o) => o.correct);
    if (correct.length !== 1) {
      ctx.addIssue({ code: "custom", message: `Question ${q.id} must have exactly one correct option` });
    }
    for (const o of q.options) {
      if (!o.correct && !o.misconception) {
        ctx.addIssue({ code: "custom", message: `Wrong option ${o.id} in ${q.id} needs a misconception` });
      }
    }
    if (q.kind === "numeric" && !q.expression) {
      ctx.addIssue({ code: "custom", message: `Numeric question ${q.id} needs an expression` });
    }
  });

export const QuizSchema = z.object({
  topicId: z.string(),
  questions: z.array(QuestionSchema).min(1),
});

export type Misconception = z.infer<typeof MisconceptionSchema>;
export type Option = z.infer<typeof OptionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;

// ---------- Learner progress ----------

export interface MisconceptionLog {
  tag: string;
  description: string;
  questionId: string;
  optionId: string;
  /** "slip" = wrong first try but correct after the hint; "confirmed" = wrong after the hint. */
  strength: "slip" | "confirmed";
  resolved: boolean;
  at: string;
}

export interface TopicProgress {
  status: TopicStatus;
  attempts: number;
  misconceptions: MisconceptionLog[];
}

export interface Learner {
  id: string;
  createdAt: string;
  topics: Record<string, TopicProgress>;
}

// ---------- Background jobs & generated lessons ----------

export type JobStatus = "pending" | "generating" | "ready" | "failed";

export interface Lesson {
  id: string;
  learnerId: string;
  topicId: string;
  misconceptionTag: string;
  status: JobStatus;
  attempts: number;
  /** Scene timeline from Agent 3 (schema defined in milestone 6). */
  timeline?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentEvent {
  id: string;
  learnerId: string;
  lessonId?: string;
  agent: "content_generator" | "judge" | "director" | "engineer" | "evaluator";
  message: string;
  data?: unknown;
  at: string;
}
