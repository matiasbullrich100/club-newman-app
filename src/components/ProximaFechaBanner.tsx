import { DORADO, DORADO_SUAVE } from "@/lib/colors";
import { formatFechaCorta } from "@/lib/fecha";
import { MatchupText } from "./FixtureRow";
import type { ProximaFecha } from "@/lib/match/resumenSeccion";

// Banner "Proxima Fecha" en /superior de viernes a sabado, en vez de la grilla de resultados de
// la fecha pasada (ya vieja para entonces) -- ver esViernesOSabadoEnArgentina en lib/fecha.ts.
export default function ProximaFechaBanner({ proxima }: { proxima: ProximaFecha }) {
  return (
    <div
      style={{
        background: "linear-gradient(160deg, rgba(0,0,0,.3), rgba(0,0,0,.15))",
        border: `1px solid ${DORADO}`,
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 12,
        textAlign: "center",
      }}
    >
      <div style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: "0.62rem", color: DORADO, fontWeight: 700 }}>
        Próxima Fecha
      </div>
      {proxima.notaEspecial ? (
        <div style={{ fontSize: "0.85rem", marginTop: 4 }}>{proxima.notaEspecial}</div>
      ) : (
        <>
          <div style={{ fontSize: "0.9rem", marginTop: 4 }}>
            <MatchupText esLocal={proxima.esLocal} rival={proxima.rival} jugado={false} resultado={{ newman: 0, rival: 0 }} />
          </div>
          <div style={{ fontSize: "0.7rem", color: DORADO_SUAVE, opacity: 0.8, marginTop: 2 }}>
            {proxima.fecha && formatFechaCorta(proxima.fecha)}
            {!proxima.esLocal && proxima.cancha && ` · en ${proxima.cancha}`}
          </div>
        </>
      )}
    </div>
  );
}
