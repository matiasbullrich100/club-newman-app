"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import type { EstadoPartido, Incidente, Resultado } from "@/types/firestore";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";
import { MatchupText } from "./FixtureRow";
import IncidentesList from "./IncidentesList";

const ESTADOS_EN_VIVO = new Set<EstadoPartido>(["en_juego", "entretiempo", "suspendido"]);

interface EstadoPartidoLive {
  esLocal: boolean;
  rival: string;
  estado: EstadoPartido;
  resultado: Resultado;
}

export default function LiveBanner({
  partidoId,
  categoriaNombre,
  inicial,
}: {
  partidoId: string;
  categoriaNombre: string;
  inicial: EstadoPartidoLive;
}) {
  const [partido, setPartido] = useState<EstadoPartidoLive>(inicial);
  const [incidentes, setIncidentes] = useState<(Incidente & { id: string })[]>([]);

  useEffect(() => {
    return onSnapshot(doc(db, "partidos", partidoId), (snap) => {
      if (snap.exists()) setPartido(snap.data() as EstadoPartidoLive);
    });
  }, [partidoId]);

  useEffect(() => {
    return onSnapshot(collection(db, "partidos", partidoId, "incidentes"), (snap) => {
      setIncidentes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Incidente) })));
    });
  }, [partidoId]);

  const enVivo = ESTADOS_EN_VIVO.has(partido.estado);

  return (
    <Link
      href={`/partido/${partidoId}`}
      style={{
        display: "block",
        background: "linear-gradient(160deg, rgba(0,0,0,.3), rgba(0,0,0,.15))",
        border: `1px solid ${DORADO}`,
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: "0.72rem", color: DORADO }}>
          {enVivo ? "● Partido en juego" : "Partido terminado"}
        </span>
        <span style={{ textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.72rem", color: DORADO_SUAVE }}>
          {categoriaNombre}
        </span>
      </div>
      <p style={{ fontSize: "1.15rem", textAlign: "center", margin: "8px 0 0" }}>
        <MatchupText esLocal={partido.esLocal} rival={partido.rival} jugado resultado={partido.resultado} />
      </p>
      {enVivo && (
        <div style={{ marginTop: 10 }}>
          <IncidentesList incidentes={incidentes} />
        </div>
      )}
    </Link>
  );
}
