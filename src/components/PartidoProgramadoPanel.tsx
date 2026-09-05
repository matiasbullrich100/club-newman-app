import type { Partido } from "@/types/firestore";
import PartidoHistorico from "./PartidoHistorico";
import PublicarFormacionButton from "./PublicarFormacionButton";
import PanelDesignado from "./panel-designado/PanelDesignado";
import EditarFormacion from "./panel-designado/EditarFormacion";
import PateadorGate from "./panel-designado/PateadorGate";
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
  fixtureNewmanHref,
  fixtureDivisionHref,
}: {
  partidoId: string;
  partido: Partido;
  datos: Awaited<ReturnType<typeof datosPartidoProgramado>>;
  posicionesHref?: string;
  posicionesActualizado?: Date | null;
  // Solo se pasan en /partido/[id] -- ver mismo comentario en PartidoTerminadoPanel.
  fixtureNewmanHref?: string;
  fixtureDivisionHref?: string;
}) {
  const {
    plantel,
    plantelCompleto,
    partidoParaCliente,
    puedeOperar,
    puedeReiniciar,
    esPartidoDePrueba,
    mostrarReset,
    formacionPublicada,
    ocultarFormacion,
    sugeridoPateadorId,
  } = datos;

  const plantelRoster: RosterJugador[] = plantel.map(
    (j) => ({ jugadorId: j.jugadorId, nombre: j.nombre, dorsal: j.dorsal, titular: j.titular }) satisfies RosterJugador
  );

  const panel = (
    <>
      <PartidoHistorico
        partido={partido}
        plantel={plantel}
        incidentes={[]}
        posicionesHref={posicionesHref}
        posicionesActualizado={posicionesActualizado}
        fixtureNewmanHref={fixtureNewmanHref}
        fixtureDivisionHref={fixtureDivisionHref}
        formacionPendientePublicar={ocultarFormacion}
      />
      {puedeOperar && !formacionPublicada && plantel.length > 0 && <PublicarFormacionButton partidoId={partidoId} />}
      {puedeOperar && (
        <PanelDesignado
          partidoId={partidoId}
          partido={partidoParaCliente}
          plantel={plantelRoster}
          periodo={null}
          sugeridoPateadorId={sugeridoPateadorId}
        />
      )}
      {puedeOperar && plantel.length > 0 && <EditarFormacion partidoId={partidoId} plantel={plantelRoster} plantelCompleto={plantelCompleto} />}
      {mostrarReset && <ResetDemoButton partidoId={partidoId} />}
      {puedeReiniciar && !esPartidoDePrueba && <ReiniciarPartidoButton partidoId={partidoId} />}
    </>
  );

  // Pedido explicito del club: cada vez que alguien ENTRA a un partido que puede operar (no
  // arrancado todavia, con formacion cargada) se tapa todo lo demas -- Formaciones, Iniciar
  // Partido, Editar Formacion -- hasta que contesta la pregunta del pateador EN ESTA VISITA, sin
  // importar si ya habia una eleccion guardada de antes (ver PateadorGate.tsx: el dato viejo no se
  // toca, solo se vuelve a preguntar). Si no puede operar o no hay plantel, no tiene sentido tapar
  // nada -- se muestra el panel directo.
  if (!puedeOperar || plantel.length === 0) return panel;

  return (
    <PateadorGate partidoId={partidoId} plantel={plantelRoster} sugeridoId={sugeridoPateadorId}>
      {panel}
    </PateadorGate>
  );
}
