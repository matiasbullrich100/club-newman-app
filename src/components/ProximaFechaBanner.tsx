import { DORADO, DORADO_SUAVE } from "@/lib/colors";
import { formatFechaCorta } from "@/lib/fecha";
import { MatchupText } from "./FixtureRow";
import type { ProximaFecha } from "@/lib/match/resumenSeccion";

// Banner "Proxima Fecha" en /superior de viernes a sabado, en vez de la grilla de resultados de
// la fecha pasada (ya vieja para entonces) -- ver esViernesOSabadoEnArgentina en lib/fecha.ts.
// Muestra las proximas `proximas` fechas de Primera (pedido explicito: no solo la que viene, las
// 3 siguientes), una debajo de la otra dentro del mismo cartel.
export default function ProximaFechaBanner({ proximas }: { proximas: ProximaFecha[] }) {
  return (
    <div
      style={{
        background: "linear-gradient(160deg, rgba(0,0,0,.3), rgba(0,0,0,.15))",
        border: `1px solid ${DORADO}`,
        borderRadius: 10,
        padding: "6px 12px",
        marginBottom: 8,
        textAlign: "center",
      }}
    >
      <div style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: "0.56rem", color: DORADO, fontWeight: 700 }}>
        Próximas Fechas
      </div>
      {proximas.map((proxima, i) => (
        <div key={proxima.numeroFecha} style={{ marginTop: i === 0 ? 2 : 4, paddingTop: i === 0 ? 0 : 4, borderTop: i === 0 ? undefined : "1px solid rgba(226,197,120,.15)" }}>
          {proxima.notaEspecial ? (
            <div style={{ fontSize: "0.78rem" }}>
              #{proxima.numeroFecha} · {proxima.notaEspecial}
            </div>
          ) : (
            <div style={{ fontSize: "0.78rem", display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, flexWrap: "wrap" }}>
              <MatchupText esLocal={proxima.esLocal} rival={proxima.rival} jugado={false} resultado={{ newman: 0, rival: 0 }} />
              <span style={{ fontSize: "0.62rem", color: DORADO_SUAVE, opacity: 0.8 }}>
                {proxima.fecha && `· ${formatFechaCorta(proxima.fecha)}`}
                {/* "en Champa", no "en Champagnat" -- el rival ya viene abreviado (ver normalizarNombreEquipo),
                    a diferencia de `cancha` que guarda el nombre completo del club. */}
                {!proxima.esLocal && ` · en ${proxima.rival}`}
                {/* Horario -- lo carga el manager desde /programar, sea Newman local o visitante. */}
                {proxima.hora && ` · ${proxima.hora} hs`}
                {/* Cancha -- solo cuando el club confirma el numero; hasta entonces no se muestra nada. */}
                {proxima.numeroCancha && ` · Cancha ${proxima.numeroCancha}`}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
