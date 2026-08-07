"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import Cronometro from "./Cronometro";
import PanelDesignado from "./panel-designado/PanelDesignado";
import type { LiveState, Partido } from "@/types/firestore";
import type { SessionPayload } from "@/lib/auth/session";
import type { RosterJugador } from "./panel-designado/types";

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

  const local = partido.esLocal ? "Newman" : partido.rival;
  const visitante = partido.esLocal ? partido.rival : "Newman";
  const golLocal = partido.esLocal ? partido.resultado.newman : partido.resultado.rival;
  const golVisitante = partido.esLocal ? partido.resultado.rival : partido.resultado.newman;

  const puedeOperar =
    !!session && (session.rol === "manager" || (session.rol === "designado" && session.categoriaId === partido.categoriaId));

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "1.5rem",
          fontWeight: 700,
          padding: "0.75rem 0",
        }}
      >
        <span>{local}</span>
        <span>
          {golLocal} - {golVisitante}
        </span>
        <span>{visitante}</span>
      </div>
      <p style={{ textAlign: "center", color: "#666", fontSize: "0.85rem" }}>{partido.estado}</p>

      <div style={{ textAlign: "center", margin: "1rem 0" }}>
        <Cronometro partidoId={partidoId} />
      </div>

      {puedeOperar && (
        <PanelDesignado partidoId={partidoId} partido={partido} plantel={plantel} periodo={periodo} />
      )}
    </div>
  );
}
