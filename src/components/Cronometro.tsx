"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { elapsedSeconds, formatMMSS } from "@/lib/match/clock";
import type { EstadoPartido, LiveState } from "@/types/firestore";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

export default function Cronometro({
  partidoId,
  estado,
  compact = false,
}: {
  partidoId: string;
  estado: EstadoPartido;
  // compact: reloj y sub-label en una sola linea (para el resumen de LiveBanner, donde se
  // juntan con "En juego" y hay que dejar libre la fila del marcador). Sin compact, el
  // sub-label va debajo del reloj -- como en la ficha del partido (PartidoLive).
  compact?: boolean;
}) {
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
    return <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: 1, opacity: 0.75, color: DORADO_SUAVE }}>—</span>;
  }

  const motivoLabel = liveState.motivoInterrupcion === "medico" ? "Médico" : liveState.motivoInterrupcion === "clima" ? "Clima" : null;
  // cortar1T() deja liveState.periodo en "1T" (solo iniciar2T lo pasa a "2T") -- sin este chequeo
  // del estado del partido, el entretiempo se mostraba como "1T · Detenido", igual que un partido
  // interrumpido sin motivo.
  const subLabel =
    estado === "entretiempo" ? "FINAL 1 T. - R. Parcial" : motivoLabel ? `Partido interrumpido · ${motivoLabel}` : liveState.periodo;

  if (compact) {
    return (
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ fontVariantNumeric: "tabular-nums", fontSize: "1.05rem", letterSpacing: 1, color: DORADO }}>
          {formatMMSS(elapsedSeconds(liveState))}
        </span>
        <span style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: 1, opacity: 0.75, color: DORADO_SUAVE }}>
          {subLabel}
        </span>
      </span>
    );
  }

  return (
    <div style={{ fontVariantNumeric: "tabular-nums", fontSize: "1.15rem", letterSpacing: 1, color: DORADO }}>
      {formatMMSS(elapsedSeconds(liveState))}
      <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: 1, opacity: 0.75, color: DORADO_SUAVE }}>
        {subLabel}
      </div>
    </div>
  );
}
