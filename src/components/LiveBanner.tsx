"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import type { EstadoPartido, Resultado } from "@/types/firestore";
import { BORDO, BORDO_OSC, DORADO, DORADO_SUAVE, NEGRO_JUGADA } from "@/lib/colors";
import { MatchupText } from "./FixtureRow";
import Cronometro from "./Cronometro";

const ESTADOS_EN_VIVO = new Set<EstadoPartido>(["en_juego", "entretiempo", "suspendido"]);

// Solo para achicar el nombre en este banner angosto -- en el resto de la app (grillas,
// encabezados) se sigue mostrando el nombre completo de categorias.ts.
const NOMBRES_CORTOS: Record<string, string> = { Intermedia: "Inter" };

const botonChico: React.CSSProperties = {
  flex: "0 0 auto",
  fontSize: "0.55rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.3,
  color: DORADO_SUAVE,
  border: "1px solid rgba(226,197,120,.4)",
  borderRadius: 6,
  padding: "3px 5px",
};

interface EstadoPartidoLive {
  esLocal: boolean;
  rival: string;
  estado: EstadoPartido;
  resultado: Resultado;
  notaEspecial?: string;
}

export default function LiveBanner({
  partidoId,
  categoriaNombre,
  inicial,
  nombreNewman,
  esPrueba,
  posicionesHref,
  fixtureNewmanHref,
  fixtureDivisionHref,
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
  // Siempre presente -- lleva directo al fixture del propio equipo (/categoria/{id} o
  // /juveniles/.../equipo/{id}).
  fixtureNewmanHref?: string;
  // Solo si la categoria tiene Fixture Division cargado (ver tieneFixtureDivision en
  // lib/fixtureDivision.ts) -- hoy solo Plantel Superior.
  fixtureDivisionHref?: string;
}) {
  const [partido, setPartido] = useState<EstadoPartidoLive>(inicial);

  useEffect(() => {
    return onSnapshot(doc(db, "partidos", partidoId), (snap) => {
      if (snap.exists()) setPartido(snap.data() as EstadoPartidoLive);
    });
  }, [partidoId]);

  const enVivo = ESTADOS_EN_VIVO.has(partido.estado);
  // Fecha libre (sin resultado que mostrar) va con fondo negro, igual que en el fixture completo.
  // Un partido en vivo o ya jugado (con resultado real) lleva el degrade bordo bien visible --
  // mismo tratamiento que usa el club en sus graficas de Instagram para el resultado.
  const esBye = !enVivo && !!partido.notaEspecial;

  return (
    <div
      style={{
        background: esBye ? NEGRO_JUGADA : `linear-gradient(180deg, rgba(245,168,0,.4), ${BORDO} 50%, ${BORDO_OSC})`,
        border: `1px solid ${esBye ? "rgba(255,255,255,.06)" : DORADO}`,
        borderRadius: 10,
        padding: "8px 12px",
        marginBottom: 8,
      }}
    >
      {/* Todo el bloque (fila de texto + cronometro) es UN solo Link -- si el cronometro quedara
          afuera, en un partido en vivo esa es la parte mas grande y mas tentadora para tocar, y
          antes no llevaba a ningun lado (un designado real no podia entrar al partido desde el
          resumen por esto). */}
      <Link href={`/partido/${partidoId}`} style={{ display: "block" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              flex: "0 0 auto",
              maxWidth: "22%",
              textTransform: "uppercase",
              letterSpacing: 0.3,
              fontSize: "0.62rem",
              color: DORADO_SUAVE,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {NOMBRES_CORTOS[categoriaNombre] ?? categoriaNombre}
          </span>
          <span style={{ flex: 1, minWidth: 0, fontSize: "0.85rem", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {esPrueba && <b style={{ color: DORADO }}>PRUEBA </b>}
            {partido.notaEspecial ?? (
              <MatchupText esLocal={partido.esLocal} rival={partido.rival} jugado resultado={partido.resultado} nombreNewman={nombreNewman} />
            )}
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
            {partido.notaEspecial ? "" : enVivo ? "● En juego" : "Final"}
          </span>
        </div>
        {enVivo && (
          <div style={{ marginTop: 4, textAlign: "center" }}>
            <Cronometro partidoId={partidoId} estado={partido.estado} />
          </div>
        )}
      </Link>
      {(posicionesHref || fixtureNewmanHref || fixtureDivisionHref) && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 6 }}>
          {posicionesHref && (
            <Link href={posicionesHref} style={botonChico}>
              Tabla
            </Link>
          )}
          {fixtureNewmanHref && (
            <Link href={fixtureNewmanHref} style={botonChico}>
              Fixt. New.
            </Link>
          )}
          {fixtureDivisionHref && (
            <Link href={fixtureDivisionHref} style={botonChico}>
              Fixt Divis.
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
