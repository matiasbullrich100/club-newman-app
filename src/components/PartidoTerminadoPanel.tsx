import type { Partido } from "@/types/firestore";
import PartidoHistorico from "./PartidoHistorico";
import CargaIncidencia from "./panel-designado/CargaIncidencia";
import CargaCambio from "./panel-designado/CargaCambio";
import ResetDemoButton from "./ResetDemoButton";
import ReiniciarPartidoButton from "./ReiniciarPartidoButton";
import { DORADO } from "@/lib/colors";
import type { datosPartidoTerminado } from "@/lib/match/datosPartidoTerminado";

// Todo lo que se ve para un partido "terminado": formacion + incidencias (PartidoHistorico) y, si
// quien mira puede operar esa categoria, el bloque para corregir una jugada/cambio que falto
// cargar. Usado tanto en /partido/[partidoId] como en /categoria/[categoriaId] (que muestra el
// ultimo partido jugado directo cuando esta "fresco", en la misma pantalla).
export default function PartidoTerminadoPanel({
  partidoId,
  partido,
  datos,
  posicionesHref,
  posicionesActualizado,
}: {
  partidoId: string;
  partido: Partido;
  datos: Awaited<ReturnType<typeof datosPartidoTerminado>>;
  posicionesHref?: string;
  posicionesActualizado?: Date | null;
}) {
  const { plantel, plantelCompleto, incidentes, puedeOperar, puedeReiniciar, esPartidoDePrueba, mostrarReset } = datos;

  return (
    <>
      <PartidoHistorico
        partido={partido}
        plantel={plantel}
        incidentes={incidentes}
        partidoId={partidoId}
        puedeEditar={puedeOperar}
        posicionesHref={posicionesHref}
        posicionesActualizado={posicionesActualizado}
      />
      {puedeOperar && (
        <div
          style={{
            background: "rgba(255,255,255,.045)",
            border: "1px solid rgba(226,197,120,.2)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 14,
          }}
        >
          <h2 style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: "0.85rem", color: DORADO, marginTop: 0, marginBottom: 4 }}>
            Corregir el partido
          </h2>
          <p style={{ fontSize: "0.8rem", opacity: 0.75, marginTop: 0, marginBottom: 10 }}>
            Para agregar una jugada o un cambio que faltó cargar. El minuto queda aproximado.
          </p>
          <CargaIncidencia
            partidoId={partidoId}
            plantel={plantel.map((j) => ({ jugadorId: j.jugadorId, nombre: j.nombre, dorsal: j.dorsal, titular: j.titular }))}
            enCanchaIds={partido.enCanchaIds}
            soloEnCancha={false}
          />
          <CargaCambio
            partidoId={partidoId}
            plantel={plantel.map((j) => ({ jugadorId: j.jugadorId, nombre: j.nombre, dorsal: j.dorsal, titular: j.titular }))}
            plantelCompleto={plantelCompleto}
            enCanchaIds={partido.enCanchaIds}
            soloEnCancha={false}
          />
        </div>
      )}
      {mostrarReset && <ResetDemoButton partidoId={partidoId} />}
      {puedeReiniciar && !esPartidoDePrueba && <ReiniciarPartidoButton partidoId={partidoId} />}
    </>
  );
}
