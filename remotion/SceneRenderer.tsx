import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SceneTimeline, TimelineScene } from "../agents/schemas";

const PALETTE = {
  bg: "#0f1226",
  card: "#191e3f",
  border: "#2e3568",
  text: "#f4f6ff",
  muted: "#a5add4",
  accent: "#6c8cff",
  green: "#34d399",
  amber: "#fbbf24",
  red: "#f87171",
};

export function totalTimelineFrames(timeline: SceneTimeline): number {
  return Math.max(
    90,
    timeline.scenes.reduce((sum, s) => sum + s.durationInFrames, 0),
  );
}

export function timelineToCues(timeline: SceneTimeline): Array<{ fromFrame: number; text: string }> {
  let cursor = 0;
  return timeline.scenes.map((scene) => {
    const cue = { fromFrame: cursor, text: scene.caption };
    cursor += scene.durationInFrames;
    return cue;
  });
}

const Caption: React.FC<{ label: string; text: string }> = ({ label, text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        bottom: 28,
        left: 48,
        right: 48,
        background: "rgba(15, 18, 38, 0.92)",
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 14,
        padding: "14px 22px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        opacity,
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: PALETTE.accent,
          background: "rgba(108, 140, 255, 0.14)",
          padding: "5px 10px",
          borderRadius: 8,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 22, color: PALETTE.text, lineHeight: 1.35 }}>{text}</span>
    </div>
  );
};

const TrapView: React.FC<{ scene: Extract<TimelineScene, { kind: "trap" }> }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14 } });
  const warnPop = spring({ frame: Math.max(0, frame - 35), fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 75 }}>
      <div style={{ fontSize: 24, color: PALETTE.amber, fontWeight: 700, marginBottom: 18 }}>
        {scene.headline}
      </div>
      <div style={{ fontSize: 58, fontWeight: 800, transform: `scale(${pop})`, marginBottom: 28 }}>
        {scene.expression}
      </div>
      <div
        style={{
          background: "rgba(248, 113, 113, 0.14)",
          border: `2px solid ${PALETTE.red}`,
          borderRadius: 16,
          padding: "16px 32px",
          textAlign: "center",
          transform: `scale(${warnPop})`,
        }}
      >
        <div style={{ fontSize: 15, color: PALETTE.muted }}>Common Trap</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: PALETTE.red }}>
          {scene.wrongStep} → {scene.wrongAnswer} ✗
        </div>
      </div>
      <Caption label="The Trap" text={scene.caption} />
    </AbsoluteFill>
  );
};

const RuleCardView: React.FC<{ scene: Extract<TimelineScene, { kind: "rule_card" }> }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 13 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 75 }}>
      <div
        style={{
          background: PALETTE.card,
          border: `2px solid ${PALETTE.accent}`,
          borderRadius: 22,
          padding: "34px 48px",
          maxWidth: 720,
          textAlign: "center",
          transform: `scale(${pop})`,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: PALETTE.accent, marginBottom: 10 }}>
          {scene.badge.toUpperCase()}
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 18 }}>{scene.headline}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 18, marginBottom: 18 }}>
          {scene.highlightOps.map((op) => (
            <span
              key={op}
              style={{
                fontSize: 38,
                fontWeight: 800,
                color: PALETTE.green,
                background: "rgba(52, 211, 153, 0.14)",
                border: `2px solid ${PALETTE.green}`,
                borderRadius: 14,
                padding: "8px 22px",
              }}
            >
              {op}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 24, color: PALETTE.text, lineHeight: 1.4 }}>{scene.ruleText}</div>
      </div>
      <Caption label="Mental Model" text={scene.caption} />
    </AbsoluteFill>
  );
};

const StepByStepView: React.FC<{
  scene: Extract<TimelineScene, { kind: "step_by_step" }>;
}> = ({ scene }) => {
  const frame = useCurrentFrame();
  const totalSteps = scene.steps.length + 1;
  const framesPerStage = Math.max(25, Math.floor(scene.durationInFrames / totalSteps));
  const stage = Math.min(totalSteps - 1, Math.floor(frame / framesPerStage));

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 75 }}>
      <div style={{ fontSize: 22, color: PALETTE.muted, marginBottom: 16 }}>{scene.headline}</div>
      <div style={{ width: 660, display: "flex", flexDirection: "column", gap: 10 }}>
        {scene.steps.slice(0, stage + 1).map((s, idx) => {
          const active = idx === stage && stage < scene.steps.length;
          return (
            <div
              key={`${s.expr}-${idx}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: active ? PALETTE.card : "rgba(25, 30, 63, 0.5)",
                border: `2px solid ${active ? PALETTE.accent : PALETTE.border}`,
                borderRadius: 12,
                padding: "12px 20px",
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 800 }}>{s.expr}</span>
              <span style={{ fontSize: 16, color: PALETTE.muted }}>{s.note}</span>
            </div>
          );
        })}
        {stage >= scene.steps.length && (
          <div
            style={{
              background: "rgba(52, 211, 153, 0.16)",
              border: `2px solid ${PALETTE.green}`,
              borderRadius: 12,
              padding: "12px 24px",
              textAlign: "center",
              fontSize: 34,
              fontWeight: 800,
              color: PALETTE.green,
            }}
          >
            {scene.finalAnswer} ✓
          </div>
        )}
      </div>
      <Caption label="Step by Step" text={scene.caption} />
    </AbsoluteFill>
  );
};

const TakeawayView: React.FC<{ scene: Extract<TimelineScene, { kind: "takeaway" }> }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 75 }}>
      <div
        style={{
          background: PALETTE.card,
          border: `2px solid ${PALETTE.green}`,
          borderRadius: 22,
          padding: "36px 48px",
          maxWidth: 700,
          textAlign: "center",
          transform: `scale(${pop})`,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: PALETTE.green, marginBottom: 12 }}>
          KEY TAKEAWAY
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, marginBottom: 14 }}>{scene.headline}</div>
        <div style={{ fontSize: 24, color: PALETTE.muted, lineHeight: 1.4 }}>{scene.summary}</div>
      </div>
      <Caption label="Takeaway" text={scene.caption} />
    </AbsoluteFill>
  );
};

export const SceneRenderer: React.FC<{ timeline: SceneTimeline }> = ({ timeline }) => {
  let cursor = 0;

  return (
    <AbsoluteFill style={{ background: PALETTE.bg, color: PALETTE.text, fontFamily: "system-ui, sans-serif" }}>
      {timeline.scenes.map((scene, idx) => {
        const from = cursor;
        cursor += scene.durationInFrames;

        return (
          <Sequence key={idx} from={from} durationInFrames={scene.durationInFrames}>
            {scene.kind === "trap" && <TrapView scene={scene} />}
            {scene.kind === "rule_card" && <RuleCardView scene={scene} />}
            {scene.kind === "step_by_step" && <StepByStepView scene={scene} />}
            {scene.kind === "takeaway" && <TakeawayView scene={scene} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
