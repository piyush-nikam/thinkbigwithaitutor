import { useEffect, useRef, useState, type RefObject } from "react";
import type { PlayerRef } from "@remotion/player";

export interface VoiceCue {
  fromFrame: number;
  text: string;
}

function pickDefaultVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return (
    voices.find((v) => v.lang === "en-IN") ??
    voices.find((v) => v.lang.startsWith("en") && /natural|google|microsoft/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null
  );
}

/** Returns English voices available in the browser, updating when voices load. */
export function useAvailableVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth) return;

    const refresh = () => {
      const all = synth.getVoices().filter((v) => v.lang.startsWith("en"));
      setVoices(all);
    };

    refresh();
    synth.addEventListener("voiceschanged", refresh);
    return () => synth.removeEventListener("voiceschanged", refresh);
  }, []);

  return voices;
}

/**
 * Speaks scene captions in sync with a Remotion <Player /> using the browser's
 * built-in Web Speech API (zero server cost or dependencies).
 */
export function usePlayerVoice(
  playerRef: RefObject<PlayerRef | null>,
  cues: VoiceCue[],
  enabled: boolean,
  voiceURI?: string,
) {
  const lastCueIdx = useRef<number>(-1);

  useEffect(() => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth) return;

    if (!enabled) {
      synth.cancel();
      lastCueIdx.current = -1;
      return;
    }

    const player = playerRef.current;
    if (!player) return;

    const speakCue = (idx: number) => {
      const cue = cues[idx];
      if (!cue) return;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(cue.text);
      const all = synth.getVoices();
      const chosen = (voiceURI && all.find((v) => v.voiceURI === voiceURI)) || pickDefaultVoice(all);
      if (chosen) utter.voice = chosen;
      utter.rate = 1.02;
      synth.speak(utter);
    };

    const cueIndexFor = (frame: number) => {
      let idx = 0;
      for (let i = 0; i < cues.length; i++) {
        if (frame >= cues[i].fromFrame) idx = i;
      }
      return idx;
    };

    const onFrame = (e: { detail: { frame: number } }) => {
      if (!player.isPlaying()) return;
      const idx = cueIndexFor(e.detail.frame);
      if (idx !== lastCueIdx.current) {
        lastCueIdx.current = idx;
        speakCue(idx);
      }
    };

    const onPlay = () => {
      const idx = cueIndexFor(player.getCurrentFrame());
      lastCueIdx.current = idx;
      speakCue(idx);
    };

    const onStop = () => {
      synth.cancel();
      lastCueIdx.current = -1;
    };

    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onStop);
    player.addEventListener("ended", onStop);

    if (player.isPlaying()) onPlay();

    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onStop);
      player.removeEventListener("ended", onStop);
      synth.cancel();
      lastCueIdx.current = -1;
    };
  }, [playerRef, cues, enabled, voiceURI]);
}
