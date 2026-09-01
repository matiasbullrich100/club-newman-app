"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import type { EstadoPartido, Resultado } from "@/types/firestore";
import { DORADO, DORADO_SUAVE, NEGRO_JUGADA } from "@/lib/colors";
import { MatchupText } from "./FixtureRow";
import Cronometro from "./Cronometro";

const ESTADOS_EN_VIVO = new Set<EstadoPartido>(["en_juego", "entretiempo", "suspendido"]);

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
  // Mismo criterio que FixtureRow -- ya jugado (terminado) o Fecha libre van con fondo negro,
  // igual que en el fixture completo, para distinguirlos de un vistazo del que esta en vivo.
  const jugada = !enVivo && (partido.estado === "terminado" || !!partido.notaEspecial);

  return (
    <div
      style={{
        background: jugada ? NEGRO_JUGADA : "linear-gradient(160deg, rgba(0,0,0,.3), rgba(0,0,0,.15))",
        border: `1px solid ${jugada ? "rgba(255,255,255,.06)" : DORADO}`,
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
            {categoriaNombre}
          </span>
          {/* La fila del marcador es SOLO categoria + "Newman - Rival", y puede envolver a 2
              lineas: con la letra agrandada, antes "En juego" y el reloj apretaban el marcador
              hasta cortar contra quien juega Newman. El estado y el reloj van en su fila de abajo. */}
          <span style={{ flex: 1, minWidth: 0, fontSize: "0.85rem", textAlign: "center", lineHeight: 1.2 }}>
            {esPrueba && <b style={{ color: DORADO }}>PRUEBA </b>}
            {partido.notaEspecial ?? (
              <MatchupText esLocal={partido.esLocal} rival={partido.rival} jugado resultado={partido.resultado} nombreNewman={nombreNewman} />
            )}
          </span>
        </div>
        {!partido.notaEspecial && (
          <div
            style={{
              marginTop: 4,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              justifyContent: "center",
              columnGap: 8,
              rowGap: 2,
            }}
          >
            <span style={{ textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.6rem", color: DORADO }}>
              {enVivo ? "● En juego" : "Final"}
            </span>
            {enVivo && <Cronometro partidoId={partidoId} estado={partido.estado} compact />}
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
              Fixt. Newm.
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
