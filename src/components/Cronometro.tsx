"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { elapsedSeconds, formatMMSS } from "@/lib/match/clock";
import type { EstadoPartido, LiveState } from "@/types/firestore";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

export default function Cronometro({ partidoId, estado }: { partidoId: string; estado: EstadoPartido }) {
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    const ref = doc(db, "partidos", partidoId, "liveState", "state");
    return onSnapshot(ref, (snap) => {
      setLiveState(snap.exists() ? (snap.data() as LiveState) : null);
    });
  }, [partidoId]);

  // Solo fuerza un re-render por segundo — nunca vuelve a leer Firestore.
  useEffect(() => {
    const interval = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!liveState || !liveState.periodo) {
    return <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: 1, opacity: 0.75, color: DORADO_SUAVE }}>—</div>;
  }

  const motivoLabel = liveState.motivoInterrupcion === "medico" ? "Médico" : liveState.motivoInterrupcion === "clima" ? "Clima" : null;
  // cortar1T() deja liveState.periodo en "1T" (solo iniciar2T lo pasa a "2T") -- sin este chequeo
  // del estado del partido, el entretiempo se mostraba como "1T · Detenido", igual que un partido
  // interrumpido sin motivo.
  const subLabel =
    estado === "entretiempo" ? "FINAL 1 T. - R. Parcial" : motivoLabel ? `Partido interrumpido · ${motivoLabel}` : liveState.periodo;

  return (
    <div style={{ fontVariantNumeric: "tabular-nums", fontSize: "1.15rem", letterSpacing: 1, color: DORADO }}>
      {formatMMSS(elapsedSeconds(liveState))}
      <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: 1, opacity: 0.75, color: DORADO_SUAVE }}>
        {subLabel}
      </div>
    </div>
  );
}
