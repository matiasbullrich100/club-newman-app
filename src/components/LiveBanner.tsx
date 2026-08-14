"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import type { EstadoPartido, Resultado } from "@/types/firestore";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";
import { MatchupText } from "./FixtureRow";
import Cronometro from "./Cronometro";

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
  nombreNewman,
  esPrueba,
}: {
  partidoId: string;
  categoriaNombre: string;
  inicial: EstadoPartidoLive;
  nombreNewman?: string;
  // Partido de PARTIDOS_DEMO_IDS -- algunas categorias de prueba (ej. "pre-a", "m-22") coinciden
  // con categorias reales, asi que sin esta marca un partido de prueba en vivo podria confundirse
  // con uno real en este mismo banner.
  esPrueba?: boolean;
}) {
  const [partido, setPartido] = useState<EstadoPartidoLive>(inicial);

  useEffect(() => {
    return onSnapshot(doc(db, "partidos", partidoId), (snap) => {
      if (snap.exists()) setPartido(snap.data() as EstadoPartidoLive);
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
        {esPrueba && <b style={{ color: DORADO }}>PRUEBA </b>}
        <MatchupText esLocal={partido.esLocal} rival={partido.rival} jugado resultado={partido.resultado} nombreNewman={nombreNewman} />
      </p>
      {enVivo && (
        <div style={{ marginTop: 8, textAlign: "center" }}>
          <Cronometro partidoId={partidoId} estado={partido.estado} />
        </div>
      )}
    </Link>
  );
}
