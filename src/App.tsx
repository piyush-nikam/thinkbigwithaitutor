import { useEffect, useState } from "react";
import { Player } from "@remotion/player";
import { Hello } from "../remotion/Hello";

// Setup smoke test: confirms the API is reachable and Remotion plays in the browser.
export function App() {
  const [api, setApi] = useState<string>("checking...");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setApi(`ok (gemini key ${d.geminiKeyConfigured ? "set" : "missing"})`))
      .catch(() => setApi("unreachable"));
  }, []);

  return (
    <main className="shell">
      <h1>Think Big with AI</h1>
      <p>API: {api}</p>
      <Player
        component={Hello}
        durationInFrames={90}
        fps={30}
        compositionWidth={960}
        compositionHeight={540}
        controls
        style={{ width: "100%", maxWidth: 720 }}
      />
    </main>
  );
}
