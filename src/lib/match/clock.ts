import type { LiveState } from "@/types/firestore";

function toMillis(value: LiveState["clockAnchor"]): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  // FirebaseFirestore.Timestamp (admin) and firebase/firestore Timestamp (client) both have toMillis().
  return (value as { toMillis: () => number }).toMillis();
}

/** Shared formula: used both for client-side display and server-side minute authority. */
export function elapsedSeconds(liveState: LiveState, nowMs: number = Date.now()): number {
  if (!liveState.clockRunning || !liveState.clockAnchor) {
    return liveState.accumulatedSeconds;
  }
  return liveState.accumulatedSeconds + (nowMs - toMillis(liveState.clockAnchor)) / 1000;
}

export function minutoActual(liveState: LiveState, nowMs: number = Date.now()): number {
  return Math.floor(elapsedSeconds(liveState, nowMs) / 60) + 1;
}

export function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}
