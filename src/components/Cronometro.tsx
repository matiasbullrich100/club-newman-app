"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { elapsedSeconds, formatMMSS } from "@/lib/match/clock";
import type { LiveState } from "@/types/firestore";

export default function Cronometro({ partidoId }: { partidoId: string }) {
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
    return <div style={{ fontSize: "1.1rem", color: "#666" }}>Partido no iniciado</div>;
  }

  return (
    <div style={{ fontVariantNumeric: "tabular-nums", fontSize: "1.75rem", fontWeight: 700 }}>
      {liveState.periodo} · {formatMMSS(elapsedSeconds(liveState))}
      {!liveState.clockRunning && (
        <span style={{ fontSize: "1rem", fontWeight: 400, color: "#666" }}> (detenido)</span>
      )}
    </div>
  );
}
