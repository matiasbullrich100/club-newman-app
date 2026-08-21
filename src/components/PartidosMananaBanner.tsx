import Link from "next/link";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";
import { MatchupText } from "./FixtureRow";
import type { PartidoDeFecha } from "@/lib/match/resumenSeccion";

const NOMBRES_CORTOS: Record<string, string> = { Intermedia: "Inter" };

// Resumen de los partidos de MAÑANA, uno por categoria -- mismo formato de tarjeta que
// ProximaFechaRow/LiveBanner (el que ya se usa en /juveniles), pero mostrando el horario en vez
// de la fecha (ya se sabe que es "mañana"). Cada tarjeta lleva a /categoria/[categoriaId] (mismo
// destino que el boton de esa categoria mas abajo) donde ya se ve la formacion completa.
export default function PartidosMananaBanner({ partidos }: { partidos: { categoriaId: string; categoriaNombre: string; partido: PartidoDeFecha }[] }) {
  return (
    <>
      {partidos.map(({ categoriaId, categoriaNombre, partido }) => (
        <Link
          key={categoriaId}
          href={`/categoria/${categoriaId}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "linear-gradient(160deg, rgba(0,0,0,.3), rgba(0,0,0,.15))",
            border: "1px solid rgba(226,197,120,.35)",
            borderRadius: 10,
            padding: "8px 12px",
            marginBottom: 8,
          }}
        >
          <span style={{ flex: "0 0 auto", maxWidth: "22%", textTransform: "uppercase", letterSpacing: 0.3, fontSize: "0.62rem", color: DORADO_SUAVE }}>
            {NOMBRES_CORTOS[categoriaNombre] ?? categoriaNombre}
          </span>
          <span style={{ flex: 1, minWidth: 0, fontSize: "0.85rem", textAlign: "center" }}>
            {partido.notaEspecial ?? <MatchupText esLocal={partido.esLocal} rival={partido.rival} jugado={false} resultado={{ newman: 0, rival: 0 }} />}
          </span>
          <span style={{ flex: "0 0 auto", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.6rem", color: DORADO, textAlign: "right" }}>
            {partido.hora}
          </span>
        </Link>
      ))}
    </>
  );
}
