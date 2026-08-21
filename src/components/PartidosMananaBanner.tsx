import Link from "next/link";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";
import { MatchupText } from "./FixtureRow";
import type { PartidoDeFecha } from "@/lib/match/resumenSeccion";

const NOMBRES_CORTOS: Record<string, string> = { Intermedia: "Inter" };

// Resumen de los partidos de MAÑANA, uno por categoria -- para verlos todos de un vistazo el dia
// antes sin entrar categoria por categoria. Cada fila lleva a /categoria/[categoriaId] (mismo
// destino que el boton de esa categoria mas abajo) donde ya se ve la formacion completa.
export default function PartidosMananaBanner({ partidos }: { partidos: { categoriaId: string; categoriaNombre: string; partido: PartidoDeFecha }[] }) {
  if (partidos.length === 0) return null;

  return (
    <div
      style={{
        background: "linear-gradient(160deg, rgba(0,0,0,.3), rgba(0,0,0,.15))",
        border: `1px solid ${DORADO}`,
        borderRadius: 10,
        padding: "6px 12px",
        marginBottom: 8,
      }}
    >
      <div style={{ textAlign: "center", textTransform: "uppercase", letterSpacing: 1, fontSize: "0.56rem", color: DORADO, fontWeight: 700 }}>
        Partidos de Mañana
      </div>
      {partidos.map(({ categoriaId, categoriaNombre, partido }, i) => (
        <Link
          key={categoriaId}
          href={`/categoria/${categoriaId}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: i === 0 ? 4 : 2,
            paddingTop: i === 0 ? 0 : 2,
          }}
        >
          <span style={{ flex: "0 0 auto", maxWidth: "20%", textTransform: "uppercase", letterSpacing: 0.3, fontSize: "0.6rem", color: DORADO_SUAVE }}>
            {NOMBRES_CORTOS[categoriaNombre] ?? categoriaNombre}
          </span>
          <span style={{ flex: 1, minWidth: 0, fontSize: "0.75rem", textAlign: "center" }}>
            {partido.notaEspecial ?? <MatchupText esLocal={partido.esLocal} rival={partido.rival} jugado={false} resultado={{ newman: 0, rival: 0 }} />}
          </span>
          <span style={{ flex: "0 0 auto", fontSize: "0.62rem", color: DORADO_SUAVE, opacity: 0.85 }}>{partido.hora}</span>
        </Link>
      ))}
    </div>
  );
}
