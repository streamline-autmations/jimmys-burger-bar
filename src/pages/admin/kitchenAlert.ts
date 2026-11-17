// Foreground alert for the kitchen screen. Browsers keep audio locked until a
// tap on the page, so the screen asks for one ("Enable sound") and asks again
// whenever the browser suspends it (a reload, a phone that slept). Generated
// tones, so there is no audio file to cache or fail to load.

let context: AudioContext | null = null;

export const soundReady = (): boolean => context?.state === 'running';

/** Call from a tap. Resolves true once the browser lets the page make sound. */
export async function enableSound(): Promise<boolean> {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return false;
  context ??= new Ctx();
  try {
    await context.resume();
  } catch {
    // Still locked: the button stays on "Enable sound".
  }
  return soundReady();
}

/** Three rising beeps, square wave so they cut through extraction fans. */
export function chime(): void {
  navigator.vibrate?.([250, 120, 250]);
  if (!context || !soundReady()) return;
  const start = context.currentTime + 0.02;
  [660, 880, 1175].forEach((frequency, index) => {
    const at = start + index * 0.22;
    const tone = context!.createOscillator();
    const gain = context!.createGain();
    tone.type = 'square';
    tone.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
    tone.connect(gain).connect(context!.destination);
    tone.start(at);
    tone.stop(at + 0.21);
  });
}
