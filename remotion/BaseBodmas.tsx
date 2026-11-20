import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const BASE_BODMAS_FPS = 30;
export const BASE_BODMAS_DURATION = 2160; // 72 seconds

export const BASE_BODMAS_CUES = [
  { fromFrame: 0, text: "Same sum, two different answers. Maths needs one agreed rule." },
  { fromFrame: 270, text: "Without a shared order, calculators, code, and people would all disagree." },
  { fromFrame: 480, text: "Think of 4 stairs, not 6 letters. Higher stairs always go first." },
  { fromFrame: 840, text: "Plus does not beat minus, and times does not beat divide. Whichever is on the left goes first." },
  { fromFrame: 1200, text: "Minus is on the left, so 10 minus 3 equals 7 goes first. Then 7 plus 2 equals 9." },
  { fromFrame: 1560, text: "One stair at a time: Brackets, then Orders, then Multiply, then Add." },
  { fromFrame: 1950, text: "Let's check your understanding with 4 quick questions." },
];

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

const CaptionBar: React.FC<{ text: string; stepLabel: string }> = ({ text, stepLabel }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 28,
        left: 48,
        right: 48,
        background: "rgba(15, 18, 38, 0.9)",
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
        {stepLabel}
      </span>
      <span style={{ fontSize: 22, color: PALETTE.text, lineHeight: 1.35 }}>{text}</span>
    </div>
  );
};

// Scene 1 (0–9s): Hook — 10 - 3 + 2 = ?
const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14 } });
  const leftPop = spring({ frame: Math.max(0, frame - 35), fps, config: { damping: 12 } });
  const rightPop = spring({ frame: Math.max(0, frame - 65), fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 70 }}>
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          letterSpacing: 3,
          transform: `scale(${pop})`,
          marginBottom: 42,
        }}
      >
        10 − 3 + 2 = ?
      </div>

      <div style={{ display: "flex", gap: 48 }}>
        <div
          style={{
            background: PALETTE.card,
            border: `2px solid ${PALETTE.amber}`,
            borderRadius: 18,
            padding: "20px 36px",
            textAlign: "center",
            transform: `scale(${leftPop})`,
          }}
        >
          <div style={{ fontSize: 16, color: PALETTE.muted, marginBottom: 6 }}>Learner A</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: PALETTE.amber }}>5</div>
          <div style={{ fontSize: 15, color: PALETTE.muted, marginTop: 4 }}>10 − (3 + 2)</div>
        </div>

        <div
          style={{
            background: PALETTE.card,
            border: `2px solid ${PALETTE.green}`,
            borderRadius: 18,
            padding: "20px 36px",
            textAlign: "center",
            transform: `scale(${rightPop})`,
          }}
        >
          <div style={{ fontSize: 16, color: PALETTE.muted, marginBottom: 6 }}>Learner B</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: PALETTE.green }}>9</div>
          <div style={{ fontSize: 15, color: PALETTE.muted, marginTop: 4 }}>(10 − 3) + 2</div>
        </div>
      </div>

      <CaptionBar
        stepLabel="The Puzzle"
        text="Same sum, two different answers. Maths needs one agreed rule."
      />
    </AbsoluteFill>
  );
};

// Scene 2 (9–16s): Why rules exist
const SceneWhyRules: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardScale = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 70 }}>
      <div
        style={{
          background: PALETTE.card,
          border: `1px solid ${PALETTE.border}`,
          borderRadius: 22,
          padding: "40px 56px",
          maxWidth: 700,
          textAlign: "center",
          transform: `scale(${cardScale})`,
        }}
      >
        <div style={{ fontSize: 20, color: PALETTE.accent, fontWeight: 700, marginBottom: 14 }}>
          ONE UNIVERSAL AGREEMENT
        </div>
        <div style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.3 }}>
          Order of Operations tells everyone <span style={{ color: PALETTE.green }}>which step goes first</span>.
        </div>
      </div>

      <CaptionBar
        stepLabel="Why Rules?"
        text="Without a shared order, calculators, code, and people would all disagree."
      />
    </AbsoluteFill>
  );
};

const STAIRS = [
  { rank: "1", title: "Brackets", symbols: "(  )   [  ]", color: "#6c8cff" },
  { rank: "2", title: "Orders", symbols: "x²   √x", color: "#a78bfa" },
  { rank: "3", title: "Division & Multiplication", symbols: "÷   ×", color: "#34d399" },
  { rank: "4", title: "Addition & Subtraction", symbols: "+   −", color: "#fbbf24" },
];

// Scene 3 (16–28s): The 4-tier priority staircase
const SceneStaircase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 75 }}>
      <div style={{ width: 680, display: "flex", flexDirection: "column", gap: 14 }}>
        {STAIRS.map((s, idx) => {
          const enter = spring({ frame: Math.max(0, frame - idx * 35), fps, config: { damping: 14 } });
          return (
            <div
              key={s.rank}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: PALETTE.card,
                border: `2px solid ${s.color}`,
                borderRadius: 14,
                padding: "14px 24px",
                marginLeft: idx * 24,
                opacity: enter,
                transform: `translateY(${(1 - enter) * 16}px)`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: s.color,
                    color: "#0f1226",
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {s.rank}
                </span>
                <span style={{ fontSize: 24, fontWeight: 700 }}>{s.title}</span>
              </div>
              <span style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.symbols}</span>
            </div>
          );
        })}
      </div>

      <CaptionBar
        stepLabel="4 Priority Tiers"
        text="Think of 4 stairs, not 6 letters. Higher stairs always go first."
      />
    </AbsoluteFill>
  );
};

// Scene 4 (28–40s): Equal-power twins (÷/× and +/-)
const SceneTwins: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop1 = spring({ frame, fps, config: { damping: 13 } });
  const pop2 = spring({ frame: Math.max(0, frame - 40), fps, config: { damping: 13 } });
  const arrowX = interpolate(frame % 90, [0, 90], [-14, 14]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 75 }}>
      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 28, color: PALETTE.text }}>
        Same stair = <span style={{ color: PALETTE.green }}>Equal Power</span>
      </div>

      <div style={{ display: "flex", gap: 36 }}>
        {[
          { label: "Tier 3 Twins", ops: "÷   =   ×", color: PALETTE.green, s: pop1 },
          { label: "Tier 4 Twins", ops: "+   =   −", color: PALETTE.amber, s: pop2 },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: PALETTE.card,
              border: `2px solid ${card.color}`,
              borderRadius: 18,
              padding: "26px 40px",
              textAlign: "center",
              transform: `scale(${card.s})`,
            }}
          >
            <div style={{ fontSize: 16, color: PALETTE.muted, marginBottom: 10 }}>{card.label}</div>
            <div style={{ fontSize: 44, fontWeight: 800, color: card.color }}>{card.ops}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 28,
          fontSize: 24,
          fontWeight: 700,
          color: PALETTE.accent,
          transform: `translateX(${arrowX}px)`,
        }}
      >
        Tie-breaker: Left ─────────▶ Right
      </div>

      <CaptionBar
        stepLabel="The Twin Rule"
        text="+ does NOT beat −, and × does NOT beat ÷. Whichever is on the left goes first."
      />
    </AbsoluteFill>
  );
};

// Scene 5 (40–52s): Resolve the hook 10 - 3 + 2
const SceneWorkedHook: React.FC = () => {
  const frame = useCurrentFrame();
  const step = frame < 110 ? 0 : frame < 220 ? 1 : 2;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 75 }}>
      <div style={{ fontSize: 20, color: PALETTE.muted, marginBottom: 16 }}>
        Back to our puzzle — Tier 4 twins go left to right:
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ fontSize: 58, fontWeight: 800 }}>
          <span
            style={{
              padding: "4px 14px",
              borderRadius: 12,
              background: step === 0 ? "rgba(251, 191, 36, 0.22)" : "transparent",
              border: step === 0 ? `2px solid ${PALETTE.amber}` : "2px solid transparent",
            }}
          >
            10 − 3
          </span>{" "}
          + 2
        </div>

        {step >= 1 && (
          <div style={{ fontSize: 52, fontWeight: 800, color: PALETTE.text }}>
            = <span style={{ color: PALETTE.amber }}>7</span> + 2
          </div>
        )}

        {step >= 2 && (
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: PALETTE.green,
              background: "rgba(52, 211, 153, 0.14)",
              border: `2px solid ${PALETTE.green}`,
              borderRadius: 14,
              padding: "6px 28px",
            }}
          >
            = 9 ✓
          </div>
        )}
      </div>

      <CaptionBar
        stepLabel="Worked Example 1"
        text="Minus is on the left, so 10 − 3 = 7 goes first. Then 7 + 2 = 9."
      />
    </AbsoluteFill>
  );
};

// Scene 6 (52–65s): Full example 2 + 3 × (4 - 1)²
const SceneBiggerExample: React.FC = () => {
  const frame = useCurrentFrame();
  const stage = frame < 85 ? 0 : frame < 170 ? 1 : frame < 255 ? 2 : frame < 320 ? 3 : 4;

  const lines = [
    { expr: "2 + 3 × (4 − 1)²", note: "Start: spot Brackets (4 − 1)" },
    { expr: "2 + 3 × 3²", note: "Brackets done → Orders: 3² = 9" },
    { expr: "2 + 3 × 9", note: "Orders done → Multiply: 3 × 9 = 27" },
    { expr: "2 + 27", note: "Multiply done → Add: 2 + 27" },
    { expr: "= 29 ✓", note: "Final answer: 29" },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 75 }}>
      <div style={{ width: 640, display: "flex", flexDirection: "column", gap: 10 }}>
        {lines.slice(0, stage + 1).map((line, i) => {
          const active = i === stage;
          return (
            <div
              key={line.expr}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: active ? PALETTE.card : "rgba(25, 30, 63, 0.45)",
                border: `2px solid ${active ? (stage === 4 ? PALETTE.green : PALETTE.accent) : PALETTE.border}`,
                borderRadius: 12,
                padding: "10px 20px",
              }}
            >
              <span style={{ fontSize: 30, fontWeight: 800, color: stage === 4 && active ? PALETTE.green : PALETTE.text }}>
                {line.expr}
              </span>
              <span style={{ fontSize: 16, color: PALETTE.muted }}>{line.note}</span>
            </div>
          );
        })}
      </div>

      <CaptionBar
        stepLabel="Worked Example 2"
        text="One stair at a time: Brackets → Orders → Multiply → Add."
      />
    </AbsoluteFill>
  );
};

// Scene 7 (65–72s): Recap
const SceneRecap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 70 }}>
      <div
        style={{
          background: PALETTE.card,
          border: `2px solid ${PALETTE.green}`,
          borderRadius: 22,
          padding: "36px 48px",
          textAlign: "center",
          transform: `scale(${pop})`,
        }}
      >
        <div style={{ fontSize: 18, color: PALETTE.green, fontWeight: 700, marginBottom: 14 }}>
          RECAP
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, marginBottom: 14 }}>
          Brackets → Orders → ÷ × → + −
        </div>
        <div style={{ fontSize: 22, color: PALETTE.muted }}>
          Same stair? Always work <span style={{ color: PALETTE.amber, fontWeight: 700 }}>left to right</span>.
        </div>
      </div>

      <CaptionBar
        stepLabel="Ready?"
        text="Let's check your understanding with 4 quick questions."
      />
    </AbsoluteFill>
  );
};

export const BaseBodmas: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: PALETTE.bg, color: PALETTE.text, fontFamily: "system-ui, sans-serif" }}>
      <Sequence from={0} durationInFrames={270}><SceneHook /></Sequence>
      <Sequence from={270} durationInFrames={210}><SceneWhyRules /></Sequence>
      <Sequence from={480} durationInFrames={360}><SceneStaircase /></Sequence>
      <Sequence from={840} durationInFrames={360}><SceneTwins /></Sequence>
      <Sequence from={1200} durationInFrames={360}><SceneWorkedHook /></Sequence>
      <Sequence from={1560} durationInFrames={390}><SceneBiggerExample /></Sequence>
      <Sequence from={1950} durationInFrames={210}><SceneRecap /></Sequence>
    </AbsoluteFill>
  );
};
