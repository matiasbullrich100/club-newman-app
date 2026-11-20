import LiveBanner from "./LiveBanner";
import ProximaFechaRow from "./ProximaFechaRow";
import { PanelFormacion } from "./ProgramaSemifinales";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";
import type { PartidoTorneoM19 } from "@/lib/match/torneoM19";

// "Sábado 21/11" a partir de un ISO yyyy-mm-dd (sin depender de la zona horaria del servidor).
function diaLargo(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dia = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("es-AR", { weekday: "long", timeZone: "UTC" });
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${d}/${m}`;
}

// Torneo de M19 (Veco Villegas): cada partido con su fila (programado, en vivo o terminado) y, abajo, la formacion
// publicada. Va en el inicio debajo de la final del Nacional de Clubes.
export default function TorneoM19({ partidos }: { partidos: PartidoTorneoM19[] }) {
  if (partidos.length === 0) return null;
  const { torneo, fecha, cancha } = partidos[0];
  return (
    <section style={{ margin: "0 0 14px" }}>
      <h2 style={{ fontSize: "1.5rem", textAlign: "center", color: DORADO, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 8px" }}>{torneo}</h2>
      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: DORADO_SUAVE, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 5px" }}>
        M19 · {diaLargo(fecha)}
        {cancha && ` · en ${cancha}`}
      </div>
      {partidos.map((p) => (
        <div key={p.partidoId}>
          {p.estado === "programado" ? (
            <ProximaFechaRow
              partidoId={p.partidoId}
              categoriaNombre="M19"
              proxima={{ numeroFecha: 0, fecha: p.fecha, esLocal: p.esLocal, rival: p.rival, hora: p.hora, cancha: p.cancha, numeroCancha: p.numeroCancha }}
              sinSede
            />
          ) : (
            <LiveBanner
              partidoId={p.partidoId}
              categoriaNombre="M19"
              inicial={{ esLocal: p.esLocal, rival: p.rival, estado: p.estado, resultado: p.resultado, numeroCancha: p.numeroCancha }}
            />
          )}
          {p.formacion && <PanelFormacion cancha={p.cancha} numeroCancha={p.numeroCancha} hora={p.hora} formacion={p.formacion} />}
        </div>
      ))}
    </section>
  );
}
