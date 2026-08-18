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

// Solo para achicar el nombre en este banner angosto -- en el resto de la app (grillas,
// encabezados) se sigue mostrando el nombre completo de categorias.ts.
const NOMBRES_CORTOS: Record<string, string> = { Intermedia: "Inter" };

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
  posicionesHref,
}: {
  partidoId: string;
  categoriaNombre: string;
  inicial: EstadoPartidoLive;
  nombreNewman?: string;
  // Partido de PARTIDOS_DEMO_IDS -- algunas categorias de prueba (ej. "pre-a", "m-22") coinciden
  // con categorias reales, asi que sin esta marca un partido de prueba en vivo podria confundirse
  // con uno real en este mismo banner.
  esPrueba?: boolean;
  // Solo si la categoria tiene torneo de URBA asignado (ver TORNEOS_URBA) -- si no hay, no hay
  // tabla de posiciones para mostrar.
  posicionesHref?: string;
}) {
  const [partido, setPartido] = useState<EstadoPartidoLive>(inicial);

  useEffect(() => {
    return onSnapshot(doc(db, "partidos", partidoId), (snap) => {
      if (snap.exists()) setPartido(snap.data() as EstadoPartidoLive);
    });
  }, [partidoId]);

  const enVivo = ESTADOS_EN_VIVO.has(partido.estado);

  return (
    <div
      style={{
        background: "linear-gradient(160deg, rgba(0,0,0,.3), rgba(0,0,0,.15))",
        border: `1px solid ${DORADO}`,
        borderRadius: 10,
        padding: "8px 12px",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Link href={`/partido/${partidoId}`} style={{ display: "flex", flex: 1, minWidth: 0, alignItems: "center", gap: 8 }}>
          <span
            style={{
              flex: "0 0 auto",
              maxWidth: "22%",
              textTransform: "uppercase",
              letterSpacing: 0.3,
              fontSize: "0.62rem",
              color: DORADO_SUAVE,
            }}
          >
            {NOMBRES_CORTOS[categoriaNombre] ?? categoriaNombre}
          </span>
          <span style={{ flex: 1, minWidth: 0, fontSize: "0.85rem", textAlign: "center" }}>
            {esPrueba && <b style={{ color: DORADO }}>PRUEBA </b>}
            <MatchupText esLocal={partido.esLocal} rival={partido.rival} jugado resultado={partido.resultado} nombreNewman={nombreNewman} />
          </span>
          <span
            style={{
              flex: "0 0 auto",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              fontSize: "0.6rem",
              color: DORADO,
              textAlign: "right",
            }}
          >
            {enVivo ? "● En juego" : "Terminado"}
          </span>
        </Link>
        {posicionesHref && (
          <Link
            href={posicionesHref}
            style={{
              flex: "0 0 auto",
              fontSize: "0.55rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.3,
              color: DORADO_SUAVE,
              border: "1px solid rgba(226,197,120,.4)",
              borderRadius: 6,
              padding: "3px 5px",
            }}
          >
            Pos
          </Link>
        )}
      </div>
      {enVivo && (
        <div style={{ marginTop: 4, textAlign: "center" }}>
          <Cronometro partidoId={partidoId} estado={partido.estado} />
        </div>
      )}
    </div>
  );
}
