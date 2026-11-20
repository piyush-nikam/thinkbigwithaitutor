import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const TOPIC_UNLOCK_FPS = 30;
export const TOPIC_UNLOCK_DURATION = 150; // 5 seconds

export const TopicUnlock: React.FC<{ completedTitle: string; nextTitle: string }> = ({
  completedTitle,
  nextTitle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeScale = spring({ frame, fps, config: { damping: 12 } });
  const nextSlide = spring({ frame: Math.max(0, frame - 45), fps, config: { damping: 13 } });
  const unlocked = frame >= 30;
  const glow = interpolate(frame, [25, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "#0f1226",
        color: "#f4f6ff",
        fontFamily: "system-ui, sans-serif",
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
      }}
    >
      <div
        style={{
          transform: `scale(${badgeScale})`,
          background: "rgba(52, 211, 153, 0.14)",
          border: "2px solid #34d399",
          borderRadius: 999,
          padding: "8px 22px",
          fontSize: 18,
          fontWeight: 800,
          color: "#34d399",
          marginBottom: 18,
        }}
      >
        ✓ {completedTitle} — Mastered!
      </div>

      <div
        style={{
          fontSize: 56,
          marginBottom: 20,
          transform: `scale(${unlocked ? 1.1 : 1})`,
          transition: "transform 0.2s",
        }}
      >
        {unlocked ? "🔓" : "🔒"}
      </div>

      <div
        style={{
          background: "#191e3f",
          border: `2px solid ${unlocked ? "#6c8cff" : "#2e3568"}`,
          borderRadius: 20,
          padding: "26px 48px",
          textAlign: "center",
          opacity: nextSlide,
          transform: `translateY(${(1 - nextSlide) * 28}px)`,
          boxShadow: `0 0 ${32 * glow}px rgba(108, 140, 255, 0.35)`,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.5, color: "#6c8cff", marginBottom: 8 }}>
          WELCOME TO THE NEXT TOPIC
        </div>
        <div style={{ fontSize: 38, fontWeight: 800 }}>{nextTitle}</div>
      </div>
    </AbsoluteFill>
  );
};
