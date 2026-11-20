import { z } from "zod";

export const JudgeVerdictSchema = z.object({
  score: z.number().min(1).max(10),
  approved: z.boolean(),
  critique: z.string().min(5),
  issues: z.array(z.string()),
});

export const StoryboardSceneSchema = z.object({
  title: z.string().min(3),
  visualIdea: z.string().min(10),
  caption: z.string().min(5),
  expressionOrExample: z.string().optional(),
});

export const StoryboardSchema = z.object({
  title: z.string().min(3),
  misconceptionTag: z.string().regex(/^[a-z0-9_]+$/),
  targetConcept: z.string().min(5),
  summary: z.string().min(10),
  scenes: z.array(StoryboardSceneSchema).min(3).max(5),
});

// ---------- Agent 3 (Director) closed scene vocabulary ----------

const TrapSceneSchema = z.object({
  kind: z.literal("trap"),
  durationInFrames: z.number().int().min(90).max(240),
  headline: z.string().min(3),
  expression: z.string().min(1),
  wrongStep: z.string().min(1),
  wrongAnswer: z.string().min(1),
  caption: z.string().min(5),
});

const RuleCardSceneSchema = z.object({
  kind: z.literal("rule_card"),
  durationInFrames: z.number().int().min(90).max(240),
  headline: z.string().min(3),
  badge: z.string().min(2),
  ruleText: z.string().min(5),
  highlightOps: z.array(z.string()).min(1).max(4),
  caption: z.string().min(5),
});

const StepByStepSceneSchema = z.object({
  kind: z.literal("step_by_step"),
  durationInFrames: z.number().int().min(120).max(300),
  headline: z.string().min(3),
  steps: z
    .array(
      z.object({
        expr: z.string().min(1),
        note: z.string().min(3),
      }),
    )
    .min(2)
    .max(5),
  finalAnswer: z.string().min(1),
  caption: z.string().min(5),
});

const TakeawaySceneSchema = z.object({
  kind: z.literal("takeaway"),
  durationInFrames: z.number().int().min(90).max(210),
  headline: z.string().min(3),
  summary: z.string().min(5),
  caption: z.string().min(5),
});

export const TimelineSceneSchema = z.discriminatedUnion("kind", [
  TrapSceneSchema,
  RuleCardSceneSchema,
  StepByStepSceneSchema,
  TakeawaySceneSchema,
]);

export const TimelineSchema = z.object({
  title: z.string().min(3),
  misconceptionTag: z.string().regex(/^[a-z0-9_]+$/),
  scenes: z.array(TimelineSceneSchema).min(3).max(5),
});

export type JudgeVerdict = z.infer<typeof JudgeVerdictSchema>;
export type StoryboardScene = z.infer<typeof StoryboardSceneSchema>;
export type Storyboard = z.infer<typeof StoryboardSchema>;
export type TimelineScene = z.infer<typeof TimelineSceneSchema>;
export type SceneTimeline = z.infer<typeof TimelineSchema>;
