import { useEffect, useState } from "react";
import type { AgentEvent } from "../shared/types";

const AGENT_LABELS: Record<AgentEvent["agent"], string> = {
  evaluator: "Agent 5 · Evaluator",
  content_generator: "Agent 1 · Generator",
  judge: "Agent 2 · Judge",
  director: "Agent 3 · Director",
  engineer: "Agent 4 · Engineer",
};

interface InspectorDrawerProps {
  learnerId: string;
  open: boolean;
  onClose: () => void;
}

export function InspectorDrawer({ learnerId, open, onClose }: InspectorDrawerProps) {
  const [events, setEvents] = useState<AgentEvent[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;

    const load = () => {
      fetch(`/api/learners/${learnerId}/events`)
        .then((r) => r.json())
        .then((d) => {
          if (active) setEvents(d.events ?? []);
        })
        .catch(() => {});
    };

    load();
    const timer = setInterval(load, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [open, learnerId]);

  if (!open) return null;

  return (
    <aside className="inspector-drawer" aria-label="Agent Inspector">
      <div className="inspector-head">
        <div>
          <strong>Live Agent Inspector</strong>
          <div className="muted small">Real-time multi-agent pipeline &amp; Judge log</div>
        </div>
        <button className="ghost-btn" onClick={onClose}>
          Close ✕
        </button>
      </div>

      <div className="inspector-body">
        {events.length === 0 ? (
          <p className="muted small">No agent events yet. Start a topic or submit a quiz.</p>
        ) : (
          [...events].reverse().map((ev) => (
            <div key={ev.id} className="event-card">
              <div className="event-top">
                <span className={`agent-pill ${ev.agent}`}>{AGENT_LABELS[ev.agent]}</span>
                <span className="muted small">{new Date(ev.at).toLocaleTimeString()}</span>
              </div>
              <div className="event-msg">{ev.message}</div>
              {ev.data !== undefined && (
                <details className="event-data">
                  <summary className="muted small">JSON payload</summary>
                  <pre>{JSON.stringify(ev.data, null, 2)}</pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
