import Link from "next/link";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";
import { MatchupText } from "./FixtureRow";
import type { PartidoDeFecha } from "@/lib/match/resumenSeccion";

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

interface PartidoManana {
  categoriaId: string;
  categoriaNombre: string;
  partido: PartidoDeFecha;
  posicionesHref?: string;
  fixtureNewmanHref: string;
  fixtureDivisionHref?: string;
}

// Resumen de los partidos de MAÑANA, uno por categoria -- mismo formato de tarjeta (y mismos
// botones Tabla/Fixt. New./Fixt Divis.) que LiveBanner, ya usado en /juveniles y en el resto de
// /superior. La fila principal lleva a /categoria/[categoriaId] (mismo destino que el boton de esa
// categoria mas abajo) y muestra el horario en vez de la fecha (ya se sabe que es "mañana").
export default function PartidosMananaBanner({ partidos }: { partidos: PartidoManana[] }) {
  return (
    <>
      {partidos.map(({ categoriaId, categoriaNombre, partido, posicionesHref, fixtureNewmanHref, fixtureDivisionHref }) => (
        <div
          key={categoriaId}
          style={{
            background: "linear-gradient(160deg, rgba(0,0,0,.3), rgba(0,0,0,.15))",
            border: "1px solid rgba(226,197,120,.35)",
            borderRadius: 10,
            padding: "8px 12px",
            marginBottom: 8,
          }}
        >
          <Link href={`/categoria/${categoriaId}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ flex: "0 0 auto", maxWidth: "22%" }}>
              <span
                style={{
                  display: "block",
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
              {!partido.notaEspecial && !partido.jugado && (
                <span style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, color: DORADO_SUAVE, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  Cancha{partido.numeroCancha ? ` ${partido.numeroCancha}` : ""}
                </span>
              )}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: "0.85rem", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {partido.notaEspecial ?? (
                <MatchupText esLocal={partido.esLocal} rival={partido.rival} jugado={partido.jugado} resultado={partido.resultado} />
              )}
            </span>
            <span style={{ flex: "0 0 auto", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.6rem", color: DORADO, textAlign: "right" }}>
              {partido.notaEspecial ? "" : partido.jugado ? "Final" : partido.hora}
            </span>
          </Link>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 6 }}>
            {posicionesHref && (
              <Link href={posicionesHref} style={botonChico}>
                Tabla
              </Link>
            )}
            <Link href={fixtureNewmanHref} style={botonChico}>
              Fixt. New.
            </Link>
            {fixtureDivisionHref && (
              <Link href={fixtureDivisionHref} style={botonChico}>
                Fixt Divis.
              </Link>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
