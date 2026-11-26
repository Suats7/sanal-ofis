let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioCtx) {
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    audioCtx = new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startOffsetSec: number,
  durationSec: number,
  type: OscillatorType = 'sine',
  peakGain = 0.05,
): void {
  const now = ctx.currentTime + startOffsetSec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationSec + 0.02);
}

export function playCeoLaunchSound(enabled: boolean): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 261.63, 0, 0.14, 'triangle', 0.05);
    playTone(ctx, 392.0, 0.1, 0.2, 'triangle', 0.055);
  } catch {
    // Ignore blocked audio contexts
  }
}

export function playAgentCompleteSound(enabled: boolean, isSecurity = false): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (isSecurity) {
      playTone(ctx, 440, 0, 0.09, 'sine', 0.045);
      playTone(ctx, 660, 0.07, 0.09, 'sine', 0.045);
      playTone(ctx, 880, 0.14, 0.16, 'triangle', 0.04);
    } else {
      playTone(ctx, 523.25, 0, 0.1, 'sine', 0.045);
      playTone(ctx, 659.25, 0.08, 0.16, 'sine', 0.05);
    }
  } catch {
    // Ignore
  }
}

export function playLevelUpSound(enabled: boolean): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 523.25, 0, 0.11, 'triangle', 0.05);
    playTone(ctx, 659.25, 0.08, 0.11, 'triangle', 0.05);
    playTone(ctx, 783.99, 0.16, 0.12, 'triangle', 0.055);
    playTone(ctx, 1046.5, 0.25, 0.26, 'triangle', 0.06);
  } catch {
    // Ignore
  }
}

export function playThemeSwitchSound(enabled: boolean): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 340, 0, 0.045, 'sine', 0.035);
  } catch {
    // Ignore
  }
}
