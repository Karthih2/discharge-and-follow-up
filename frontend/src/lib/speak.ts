import type { Lang } from "./types";

const VOICE: Record<Lang, string> = { en: "en-IN", ta: "ta-IN", hi: "hi-IN", te: "te-IN", kn: "kn-IN", ml: "ml-IN" };

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** True when this browser has a voice for the language. Without one it falls back to a default voice. */
export const hasVoice = (lang: Lang) => canSpeak() && window.speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith(lang));

export function stopSpeaking() {
  player?.pause();
  player = null;
  if (canSpeak()) window.speechSynthesis.cancel();
}

let player: HTMLAudioElement | null = null;

/** Speak with the ElevenLabs voice first. If it is not set up or fails, read the same sentences with the browser voice. */
export async function speakBest(ask: () => Promise<string>, lines: () => Promise<string[]>, lang: Lang, onEnd: () => void) {
  stopSpeaking();
  try {
    const url = await ask();
    player = new Audio(url);
    player.onended = player.onerror = () => onEnd();
    await player.play();
  } catch {
    try {
      speak(await lines(), lang, onEnd);
    } catch {
      onEnd();
    }
  }
}

/** Speak lines one after another, slowly. Calls onEnd when done or stopped. Only already approved text goes in. */
export function speak(lines: string[], lang: Lang, onEnd?: () => void) {
  if (!canSpeak() || lines.length === 0) return onEnd?.();
  stopSpeaking();
  lines.forEach((text, i) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = VOICE[lang];
    u.rate = 0.9;
    if (i === lines.length - 1) u.onend = u.onerror = () => onEnd?.();
    window.speechSynthesis.speak(u);
  });
}
