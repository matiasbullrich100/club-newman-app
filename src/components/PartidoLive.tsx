"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import Cronometro from "./Cronometro";
import PanelDesignado from "./panel-designado/PanelDesignado";
import type { EstadoPartido, LiveState, Partido } from "@/types/firestore";
import type { SessionPayload } from "@/lib/auth/session";
import type { RosterJugador } from "./panel-designado/types";
import { CREMA, DORADO, DORADO_SUAVE } from "@/lib/colors";

const ESTADO_BADGE: Record<EstadoPartido, { label: string; bg: string; color: string }> = {
  programado: { label: "No iniciado", bg: "rgba(255,255,255,.1)", color: "#ccc" },
  en_juego: { label: "En juego", bg: "#245c2c", color: "#c6f0cc" },
  entretiempo: { label: "Entretiempo", bg: "#5c4a15", color: DORADO_SUAVE },
  suspendido: { label: "Suspendido", bg: "#5c1515", color: "#f3caca" },
  terminado: { label: "Terminado", bg: "#3a3a3a", color: "#ddd" },
};

export default function PartidoLive({
  partidoId,
  inicial,
  session,
  plantel,
}: {
  partidoId: string;
  inicial: Partido;
  session: SessionPayload | null;
  plantel: RosterJugador[];
}) {
  const [partido, setPartido] = useState<Partido>(inicial);
  const [periodo, setPeriodo] = useState<LiveState["periodo"]>(null);

  useEffect(() => {
    const ref = doc(db, "partidos", partidoId);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) setPartido(snap.data() as Partido);
    });
  }, [partidoId]);

  useEffect(() => {
    const ref = doc(db, "partidos", partidoId, "liveState", "state");
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) setPeriodo((snap.data() as LiveState).periodo);
    });
  }, [partidoId]);

  const puedeOperar =
    !!session && (session.rol === "manager" || (session.rol === "designado" && session.categoriaId === partido.categoriaId));
  const badge = ESTADO_BADGE[partido.estado];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(160deg, rgba(0,0,0,.3), rgba(0,0,0,.15))",
          border: `1px solid ${DORADO}`,
          borderRadius: 14,
          padding: "16px 14px",
          marginBottom: 14,
        }}
      >
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: 1, color: DORADO_SUAVE }}>Newman</div>
          <div style={{ fontWeight: 700, fontSize: "2.4rem", color: CREMA, lineHeight: 1.1 }}>{partido.resultado.newman}</div>
        </div>
        <div style={{ textAlign: "center", padding: "0 8px" }}>
          <Cronometro partidoId={partidoId} />
          <div>
            <span
              style={{
                display: "inline-block",
                marginTop: 6,
                fontSize: "0.62rem",
                textTransform: "uppercase",
                letterSpacing: 1,
                padding: "3px 9px",
                borderRadius: 20,
                background: badge.bg,
                color: badge.color,
              }}
            >
              {badge.label}
            </span>
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: 1, color: DORADO_SUAVE }}>{partido.rival}</div>
          <div style={{ fontWeight: 700, fontSize: "2.4rem", color: CREMA, lineHeight: 1.1 }}>{partido.resultado.rival}</div>
        </div>
      </div>

      {puedeOperar && (
        <PanelDesignado partidoId={partidoId} partido={partido} plantel={plantel} periodo={periodo} />
      )}
    </div>
  );
}
