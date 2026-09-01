import Link from "next/link";
import { DORADO, DORADO_SUAVE, NEGRO_JUGADA } from "@/lib/colors";
import { formatFechaCorta } from "@/lib/fecha";
import { MatchupText } from "./FixtureRow";
import type { ProximaFecha } from "@/lib/match/resumenSeccion";

// Sublinea del resumen de Proxima Fecha: horario (si el manager lo cargo desde /programar, sea
// Newman local o visitante) + cancha ("Cancha 3" si ya se sabe, "Cancha —" hasta que se
// confirme). Fecha libre no lleva nada.
function textoHorarioCancha(proxima: ProximaFecha): string | null {
  if (proxima.notaEspecial) return null;
  const cancha = proxima.numeroCancha ? `Cancha ${proxima.numeroCancha}` : "Cancha —";
  return proxima.hora ? `${proxima.hora} hs · ${cancha}` : cancha;
}

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

// Version "sin jugar" de LiveBanner -- misma pinta, pero estatica (no escucha en vivo, porque un
// partido "programado" todavia no tiene nada que escuchar) y muestra rival+fecha en vez de
// resultado. Usada en /juveniles de jueves a la noche a domingo, cuando el resultado de la fecha
// pasada ya esta viejo y todavia no arranco el partido de esta semana (ver
// debeMostrarProximaFechaEnArgentina en lib/fecha.ts).
export default function ProximaFechaRow({
  partidoId,
  categoriaNombre,
  proxima,
  nombreNewman,
  posicionesHref,
  fixtureHref,
  fixtureDivisionHref,
}: {
  partidoId: string;
  categoriaNombre: string;
  proxima: ProximaFecha;
  nombreNewman?: string;
  posicionesHref?: string;
  fixtureHref?: string;
  // Solo si la categoria tiene Fixture Division cargado (ver tieneFixtureDivision en
  // lib/fixtureDivision.ts) -- mismo botón que ya tiene LiveBanner.
  fixtureDivisionHref?: string;
}) {
  // Fecha libre (u otra nota especial) -- mismo fondo negro que un partido ya jugado, no hay nada
  // que "esperar" en esa fila.
  const jugada = !!proxima.notaEspecial;

  return (
    <div
      style={{
        background: jugada ? NEGRO_JUGADA : "linear-gradient(160deg, rgba(0,0,0,.3), rgba(0,0,0,.15))",
        border: `1px solid ${jugada ? "rgba(255,255,255,.06)" : "rgba(226,197,120,.35)"}`,
        borderRadius: 10,
        padding: "8px 12px",
        marginBottom: 8,
      }}
    >
      {/* Mismo layout que LiveBanner: la fila de texto es UN Link, y los botones van en una
          segunda fila abajo -- meterlos en la misma linea aplastaba "Newman - Hindu" en el celular. */}
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
          <span style={{ flex: 1, minWidth: 0, fontSize: "0.85rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <span style={{ maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {proxima.notaEspecial ?? (
                <MatchupText esLocal={proxima.esLocal} rival={proxima.rival} jugado={false} resultado={{ newman: 0, rival: 0 }} nombreNewman={nombreNewman} />
              )}
            </span>
            {textoHorarioCancha(proxima) && (
              <span style={{ fontSize: "0.58rem", letterSpacing: 0.4, color: DORADO_SUAVE, opacity: 0.75, textTransform: "uppercase" }}>
                {textoHorarioCancha(proxima)}
              </span>
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
            {proxima.fecha && formatFechaCorta(proxima.fecha)}
          </span>
        </div>
      </Link>
      {(posicionesHref || fixtureHref || fixtureDivisionHref) && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 6 }}>
          {posicionesHref && (
            <Link href={posicionesHref} style={botonChico}>
              Tabla
            </Link>
          )}
          {fixtureHref && (
            <Link href={fixtureHref} style={botonChico}>
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
