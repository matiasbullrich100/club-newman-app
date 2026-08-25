import type { LiveState, Periodo } from "@/types/firestore";

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

/**
 * Segundos reales de juego transcurridos desde que se cargo una incidencia (ej. una tarjeta) --
 * si el partido ya paso de tiempo, el entretiempo no cuenta (el reloj tampoco corre ahi): se suma
 * lo que quedaba del 1T en el momento de la incidencia mas lo que ya lleva el 2T. `segundoAbsoluto`
 * es relativo al periodo en el que se cargo la incidencia (se resetea a 0 en cada iniciar2T), asi
 * que restarlo directo contra elapsedSeconds() del liveState actual da un numero sin sentido en
 * cuanto cambia el periodo -- por eso hace falta esta funcion en vez de la resta directa.
 */
export function segundosDesdeIncidente(
  incPeriodo: Periodo,
  incSegundoAbsoluto: number,
  liveState: LiveState,
  nowMs: number = Date.now()
): number {
  const ahora = elapsedSeconds(liveState, nowMs);
  if (incPeriodo === liveState.periodo) return ahora - incSegundoAbsoluto;
  // Unico salto posible: la incidencia se cargo en el 1T y el reloj ya esta en el 2T.
  const restante1T = (liveState.period1DurationSeconds ?? incSegundoAbsoluto) - incSegundoAbsoluto;
  return restante1T + ahora;
}

export function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}
