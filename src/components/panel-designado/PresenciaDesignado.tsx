"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { registrarPresencia, borrarPresencia } from "@/lib/match/actions";
import { DORADO, CREMA } from "@/lib/colors";

// Aviso "ya hay alguien operando este partido". La decisión se toma UNA sola vez, al entrar al
// panel en vivo: si al llegar ya había otra sesión con presencia fresca, el que entró segundo ve
// un cartel grande que tapa todo y no se va hasta que toca "OK". El primero nunca ve nada.
// La presencia se guarda en partidos/{id}/presencia/{cuentaId} vía Server Action (todas las
// escrituras son server-side, ver firestore.rules) y se renueva cada 25s.

const FRESCO_MS = 70_000;
const HEARTBEAT_MS = 25_000;

export default function PresenciaDesignado({
  partidoId,
  cuentaId,
}: {
  partidoId: string;
  // El nombre a mostrar sale del server (session.username en registrarPresencia), no de acá.
  cuentaId: string;
}) {
  const [otros, setOtros] = useState<string[]>([]);
  const [aceptado, setAceptado] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelado = false;

    (async () => {
      // 1) ¿Ya había alguien (fresco) ANTES de marcar mi presencia?
      try {
        const snap = await getDocs(collection(db, "partidos", partidoId, "presencia"));
        const ahora = Date.now();
        const previos = snap.docs
          .filter((d) => d.id !== cuentaId)
          .map((d) => d.data() as { username?: string; actualizadoEn?: { toMillis?: () => number } })
          .filter((x) => ahora - (x.actualizadoEn?.toMillis?.() ?? ahora) < FRESCO_MS)
          .map((x) => x.username || "otra persona");
        if (!cancelado && previos.length > 0) setOtros(previos);
      } catch {
        /* si falla la lectura, no bloqueamos a nadie */
      }
      // 2) Marco mi presencia y la renuevo mientras el panel esté abierto.
      registrarPresencia(partidoId).catch(() => {});
      interval = setInterval(() => registrarPresencia(partidoId).catch(() => {}), HEARTBEAT_MS);
    })();

    return () => {
      cancelado = true;
      if (interval) clearInterval(interval);
      borrarPresencia(partidoId).catch(() => {});
    };
  }, [partidoId, cuentaId]);

  if (otros.length === 0 || aceptado) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(20,4,10,.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          background: "#451526",
          border: `2px solid ${DORADO}`,
          borderRadius: 16,
          padding: "26px 22px",
          textAlign: "center",
          color: CREMA,
        }}
      >
        <div style={{ fontSize: "2.4rem", marginBottom: 8 }}>⚠️</div>
        <h2 style={{ fontSize: "1.15rem", color: DORADO, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>
          Ya hay alguien operando este partido
        </h2>
        <p style={{ fontSize: "0.95rem", lineHeight: 1.5, margin: "0 0 8px" }}>
          {otros.length === 1 ? `Está ${otros[0]}.` : `Están: ${otros.join(", ")}.`}
        </p>
        <p style={{ fontSize: "0.95rem", lineHeight: 1.5, margin: "0 0 22px" }}>
          Pónganse de acuerdo: que cargue las incidencias <strong>una sola persona</strong>. Si cargan los
          dos, se duplican los tries y las tarjetas.
        </p>
        <button
          type="button"
          onClick={() => setAceptado(true)}
          style={{
            padding: "14px 40px",
            borderRadius: 10,
            border: "none",
            background: DORADO,
            color: "#451526",
            fontWeight: 700,
            fontSize: "1rem",
            textTransform: "uppercase",
            letterSpacing: 1,
            cursor: "pointer",
          }}
        >
          OK, entendido
        </button>
      </div>
    </div>
  );
}
