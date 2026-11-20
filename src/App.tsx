import { useEffect, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import {
  BASE_BODMAS_CUES,
  BASE_BODMAS_DURATION,
  BASE_BODMAS_FPS,
  BaseBodmas,
} from "../remotion/BaseBodmas";
import { SceneRenderer, timelineToCues, totalTimelineFrames } from "../remotion/SceneRenderer";
import { TOPIC_UNLOCK_DURATION, TOPIC_UNLOCK_FPS, TopicUnlock } from "../remotion/TopicUnlock";
import type { SceneTimeline } from "../agents/schemas";
import type { DomainDef, Learner, Lesson, MisconceptionLog, Quiz } from "../shared/types";
import { getLearnerId } from "./learner";
import { QuizFlow, type AnswerRecord } from "./QuizFlow";
import { InspectorDrawer } from "./InspectorDrawer";
import { useAvailableVoices, usePlayerVoice } from "./usePlayerVoice";

type Screen =
  | { view: "domains" }
  | { view: "topics"; domainId: string }
  | { view: "learn"; topicId: string; step: "video" | "quiz" | "result"; isRetest?: boolean }
  | { view: "remedial"; lessonId: string };

interface SubmitOutcome {
  passed: boolean;
  score: number;
  total: number;
  slips: MisconceptionLog[];
  confirmed: MisconceptionLog[];
  lessonsCreated: Lesson[];
  unlockedTopicId?: string;
}

export function App() {
  const [learnerId, setLearnerId] = useState<string>(() => getLearnerId());
  const [catalog, setCatalog] = useState<DomainDef[]>([]);
  const [learner, setLearner] = useState<Learner | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [screen, setScreen] = useState<Screen>({ view: "domains" });

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceURI, setVoiceURI] = useState<string>("");
  const availableVoices = useAvailableVoices();

  const basePlayerRef = useRef<PlayerRef>(null);
  const remedialPlayerRef = useRef<PlayerRef>(null);

  async function refreshState(id = learnerId) {
    const [cat, state] = await Promise.all([
      fetch("/api/catalog").then((r) => r.json()),
      fetch(`/api/learners/${id}`).then((r) => r.json()),
    ]);
    setCatalog(cat);
    setLearner(state.learner);
    setLessons(state.lessons);
  }

  useEffect(() => {
    refreshState(learnerId);
  }, [learnerId]);

  // Poll every 2s while any remedial lesson is still pending or generating.
  useEffect(() => {
    const hasActiveJob = lessons.some((l) => l.status === "pending" || l.status === "generating");
    if (!hasActiveJob) return;
    const timer = setInterval(() => {
      fetch(`/api/learners/${learnerId}`)
        .then((r) => r.json())
        .then((d) => {
          setLearner(d.learner);
          setLessons(d.lessons);
        })
        .catch(() => {});
    }, 2000);
    return () => clearInterval(timer);
  }, [lessons, learnerId]);

  async function loadQuiz(topicId: string) {
    setQuizLoading(true);
    setQuizError(null);
    try {
      const res = await fetch(`/api/topics/${topicId}/quiz`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate quiz");
      setQuiz(data);
    } catch (e) {
      setQuizError((e as Error).message);
    } finally {
      setQuizLoading(false);
    }
  }

  function startTopic(topicId: string) {
    setOutcome(null);
    setQuiz(null);
    setScreen({ view: "learn", topicId, step: "video" });
    loadQuiz(topicId); // Prefetch while learner watches the video.
  }

  async function startRetest(topicId: string) {
    setOutcome(null);
    setQuiz(null);
    setQuizLoading(true);
    setQuizError(null);
    setScreen({ view: "learn", topicId, step: "quiz", isRetest: true });
    try {
      const res = await fetch(`/api/learners/${learnerId}/topics/${topicId}/retest`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate retest");
      setQuiz(data);
    } catch (e) {
      setQuizError((e as Error).message);
    } finally {
      setQuizLoading(false);
    }
  }

  async function handleQuizComplete(topicId: string, answers: AnswerRecord[], isRetest = false) {
    setSubmitting(true);
    try {
      const endpoint = isRetest
        ? `/api/learners/${learnerId}/topics/${topicId}/retest-submit`
        : `/api/learners/${learnerId}/topics/${topicId}/submit`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      setLearner(data.learner);
      setLessons(data.lessons);
      setOutcome(data);
      setScreen({ view: "learn", topicId, step: "result", isRetest });
    } finally {
      setSubmitting(false);
    }
  }

  function resetDemo() {
    localStorage.removeItem("thinkbig.learnerId");
    const nextId = getLearnerId();
    setLearnerId(nextId);
    setScreen({ view: "domains" });
    setOutcome(null);
    setQuiz(null);
  }

  async function retryLesson(lessonId: string) {
    const res = await fetch(`/api/learners/${learnerId}/lessons/${lessonId}/retry`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setLessons(data.lessons);
    }
  }

  const activeDomain = screen.view === "topics" ? catalog.find((d) => d.id === screen.domainId) : null;
  const activeLesson = screen.view === "remedial" ? lessons.find((l) => l.id === screen.lessonId) : null;
  const bodmasNotPassed = learner?.topics.bodmas?.status !== "passed";
  const hasReadyRemedial = lessons.some((l) => l.status === "ready");

  const remedialCues = useMemo(
    () => (activeLesson?.timeline ? timelineToCues(activeLesson.timeline as SceneTimeline) : []),
    [activeLesson],
  );
  usePlayerVoice(basePlayerRef, BASE_BODMAS_CUES, voiceEnabled && screen.view === "learn" && screen.step === "video", voiceURI);
  usePlayerVoice(remedialPlayerRef, remedialCues, voiceEnabled && screen.view === "remedial", voiceURI);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setScreen({ view: "domains" })}>
          Think Big with AI
        </button>
        <div className="topbar-actions">
          <span className="muted small">Learner {learnerId.slice(0, 8)}</span>
          <button className="ghost-btn" onClick={() => setVoiceEnabled((v) => !v)}>
            {voiceEnabled ? "🔊 Voice: On" : "🔇 Voice: Off"}
          </button>
          {voiceEnabled && availableVoices.length > 0 && (
            <select
              className="voice-select"
              aria-label="Select voice"
              value={voiceURI}
              onChange={(e) => setVoiceURI(e.target.value)}
            >
              <option value="">Auto Voice</option>
              {availableVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          )}
          <button className="ghost-btn" onClick={() => setInspectorOpen((v) => !v)}>
            {inspectorOpen ? "Hide Inspector" : "Agent Inspector"}
          </button>
          <button className="ghost-btn" onClick={resetDemo}>
            Reset Demo
          </button>
        </div>
      </header>

      <main className="main-content">
        {screen.view === "domains" && (
          <section>
            <h1 className="page-title">Choose a Domain</h1>
            <p className="muted">Pick a subject to start learning. Adaptive lessons appear here when ready.</p>

            {lessons.length > 0 && (
              <div className="card lessons-banner">
                <h3>Your Personalized Lessons</h3>
                <div className="lesson-list">
                  {lessons.map((l) => (
                    <div key={l.id} className="lesson-item">
                      <span>
                        Fix for <strong>{l.misconceptionTag.replace(/_/g, " ")}</strong>
                      </span>
                      <div className="lesson-actions">
                        <span className={`status-pill ${l.status}`}>{l.status}</span>
                        {l.status === "ready" && (
                          <button
                            className="primary-btn small-btn"
                            onClick={() => setScreen({ view: "remedial", lessonId: l.id })}
                          >
                            Watch Lesson →
                          </button>
                        )}
                        {l.status === "failed" && (
                          <button className="ghost-btn" onClick={() => retryLesson(l.id)}>
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {bodmasNotPassed && hasReadyRemedial && (
                  <div className="stage-footer">
                    <span className="muted small">Finished watching your personalized lesson(s)?</span>
                    <button className="primary-btn" onClick={() => startRetest("bodmas")}>
                      Take Retest →
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="card-grid">
              {catalog.map((d) => (
                <button
                  key={d.id}
                  className={`domain-card ${d.placeholder ? "locked" : ""}`}
                  disabled={d.placeholder}
                  onClick={() => setScreen({ view: "topics", domainId: d.id })}
                >
                  <div className="card-head">
                    <span className="card-title">{d.title}</span>
                    <span>{d.placeholder ? "🔒" : "→"}</span>
                  </div>
                  <span className="muted small">
                    {d.placeholder ? "Coming soon" : `${d.topics.length} topics`}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {screen.view === "topics" && activeDomain && (
          <section>
            <button className="back-link" onClick={() => setScreen({ view: "domains" })}>
              ← Back to Domains
            </button>
            <h1 className="page-title">{activeDomain.title}</h1>

            <div className="topic-list">
              {activeDomain.topics.map((t) => {
                const progress = learner?.topics[t.id];
                const status = progress?.status ?? "locked";
                const locked = t.placeholder || status === "locked";

                return (
                  <div key={t.id} className={`card topic-card ${locked ? "locked" : ""}`}>
                    <div>
                      <div className="card-title">{t.title}</div>
                      <span className={`status-pill ${status}`}>
                        {status === "passed" ? "✓ Mastered" : locked ? "🔒 Locked" : "Ready"}
                      </span>
                    </div>
                    {!locked && (
                      <button className="primary-btn" onClick={() => startTopic(t.id)}>
                        {status === "passed" ? "Review Lesson" : "Let's start learning"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {screen.view === "learn" && (
          <section>
            <button className="back-link" onClick={() => setScreen({ view: "topics", domainId: "maths" })}>
              ← Back to Topics
            </button>

            {screen.step === "video" && (
              <div className="video-stage">
                <Player
                  ref={basePlayerRef}
                  component={BaseBodmas}
                  durationInFrames={BASE_BODMAS_DURATION}
                  fps={BASE_BODMAS_FPS}
                  compositionWidth={960}
                  compositionHeight={540}
                  controls
                  autoPlay
                  style={{ width: "100%", borderRadius: 16, overflow: "hidden" }}
                />
                <div className="stage-footer">
                  <span className="muted small">
                    {quizLoading
                      ? "Preparing your diagnostic check..."
                      : quizError
                        ? `Quiz error: ${quizError}`
                        : "Quiz ready when you are."}
                  </span>
                  {quizError ? (
                    <button className="primary-btn" onClick={() => loadQuiz(screen.topicId)}>
                      Retry Quiz Generation
                    </button>
                  ) : (
                    <button
                      className="primary-btn"
                      disabled={quizLoading || !quiz}
                      onClick={() => setScreen({ ...screen, step: "quiz" })}
                    >
                      {quizLoading ? "Loading Quiz..." : "Start Check (4 Questions) →"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {screen.step === "quiz" && (
              quizLoading ? (
                <div className="card">Generating fresh retest questions for your misconceptions...</div>
              ) : quizError ? (
                <div className="card">
                  <p>Retest error: {quizError}</p>
                  <button className="primary-btn" onClick={() => startRetest(screen.topicId)}>
                    Retry Retest
                  </button>
                </div>
              ) : quiz ? (
                <QuizFlow
                  quiz={quiz}
                  submitting={submitting}
                  onComplete={(ans) => handleQuizComplete(screen.topicId, ans, screen.isRetest)}
                />
              ) : null
            )}

            {screen.step === "result" && outcome && (
              <div className="card result-card">
                <h2>{outcome.passed ? "Topic Mastered! 🎉" : "Misconceptions Detected"}</h2>
                <p className="score-line">
                  Score: <strong>{outcome.score}</strong> / {outcome.total} (100% required to unlock next topic)
                </p>

                {outcome.passed ? (
                  <>
                    <div className="video-stage" style={{ margin: "16px 0" }}>
                      <Player
                        component={TopicUnlock}
                        inputProps={{
                          completedTitle: "BODMAS: Order of Operations",
                          nextTitle: "Fractions",
                        }}
                        durationInFrames={TOPIC_UNLOCK_DURATION}
                        fps={TOPIC_UNLOCK_FPS}
                        compositionWidth={960}
                        compositionHeight={540}
                        autoPlay
                        style={{ width: "100%", borderRadius: 16, overflow: "hidden" }}
                      />
                    </div>
                    <div className="banner ok">
                      <div>
                        You resolved every check with zero confirmed misconceptions.{" "}
                        {outcome.unlockedTopicId && <strong>Next topic unlocked!</strong>}
                      </div>
                      <button
                        className="primary-btn"
                        onClick={() => setScreen({ view: "topics", domainId: "maths" })}
                      >
                        Continue →
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="misconception-list">
                      {outcome.confirmed.map((m) => (
                        <div key={m.tag} className="banner warn">
                          <div>
                            <strong>{m.tag.replace(/_/g, " ")}:</strong> {m.description}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="muted">
                      Our AI agents are building {outcome.lessonsCreated.length} targeted lesson(s) for your
                      specific misconceptions. They will appear on your home screen shortly.
                    </p>
                    <button className="primary-btn" onClick={() => setScreen({ view: "domains" })}>
                      Go to Home Screen
                    </button>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {screen.view === "remedial" && activeLesson?.timeline != null && (
          <section>
            <button className="back-link" onClick={() => setScreen({ view: "domains" })}>
              ← Back to Home
            </button>
            <h1 className="page-title">{(activeLesson.timeline as SceneTimeline).title}</h1>
            <p className="muted">
              Personalized lesson for <strong>{activeLesson.misconceptionTag.replace(/_/g, " ")}</strong>
            </p>
            <div className="video-stage">
              <Player
                ref={remedialPlayerRef}
                component={SceneRenderer}
                inputProps={{ timeline: activeLesson.timeline as SceneTimeline }}
                durationInFrames={totalTimelineFrames(activeLesson.timeline as SceneTimeline)}
                fps={30}
                compositionWidth={960}
                compositionHeight={540}
                controls
                autoPlay
                style={{ width: "100%", borderRadius: 16, overflow: "hidden" }}
              />
            </div>
            {bodmasNotPassed && (
              <div className="stage-footer">
                <span className="muted small">Ready to prove you've got this?</span>
                <button className="primary-btn" onClick={() => startRetest(activeLesson.topicId)}>
                  Take Retest →
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      <InspectorDrawer
        learnerId={learnerId}
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
      />
    </div>
  );
}
