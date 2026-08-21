import type { Partido } from "@/types/firestore";
import PartidoHistorico from "./PartidoHistorico";
import PublicarFormacionButton from "./PublicarFormacionButton";
import PanelDesignado from "./panel-designado/PanelDesignado";
import EditarFormacion from "./panel-designado/EditarFormacion";
import ResetDemoButton from "./ResetDemoButton";
import ReiniciarPartidoButton from "./ReiniciarPartidoButton";
import type { RosterJugador } from "./panel-designado/types";
import type { datosPartidoProgramado } from "@/lib/match/datosPartidoProgramado";

// Todo lo que se ve para un partido "programado": formacion (PartidoHistorico) +, si quien mira
// puede operar esa categoria, el panel para publicar formacion/iniciar el partido/cargar cambios.
// Usado tanto en /partido/[partidoId] como en /categoria/[categoriaId] (que muestra el proximo
// partido directo, en la misma pantalla, sin un link aparte a "ver partido completo").
export default function PartidoProgramadoPanel({
  partidoId,
  partido,
  datos,
  posicionesHref,
  posicionesActualizado,
}: {
  partidoId: string;
  partido: Partido;
  datos: Awaited<ReturnType<typeof datosPartidoProgramado>>;
  posicionesHref?: string;
  posicionesActualizado?: Date | null;
}) {
  const { plantel, plantelCompleto, partidoParaCliente, puedeOperar, puedeReiniciar, esPartidoDePrueba, mostrarReset, formacionPublicada, ocultarFormacion } =
    datos;

  return (
    <>
      <PartidoHistorico
        partido={partido}
        plantel={plantel}
        incidentes={[]}
        posicionesHref={posicionesHref}
        posicionesActualizado={posicionesActualizado}
        formacionPendientePublicar={ocultarFormacion}
      />
      {puedeOperar && !formacionPublicada && plantel.length > 0 && <PublicarFormacionButton partidoId={partidoId} />}
      {puedeOperar && (
        <PanelDesignado
          partidoId={partidoId}
          partido={partidoParaCliente}
          plantel={plantel.map((j) => ({ jugadorId: j.jugadorId, nombre: j.nombre, dorsal: j.dorsal, titular: j.titular }) satisfies RosterJugador)}
          periodo={null}
        />
      )}
      {puedeOperar && plantel.length > 0 && (
        <EditarFormacion
          partidoId={partidoId}
          plantel={plantel.map((j) => ({ jugadorId: j.jugadorId, nombre: j.nombre, dorsal: j.dorsal, titular: j.titular }) satisfies RosterJugador)}
          plantelCompleto={plantelCompleto}
        />
      )}
      {mostrarReset && <ResetDemoButton partidoId={partidoId} />}
      {puedeReiniciar && !esPartidoDePrueba && <ReiniciarPartidoButton partidoId={partidoId} />}
    </>
  );
}
