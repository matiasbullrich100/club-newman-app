import type { Partido } from "@/types/firestore";
import PartidoHistorico from "./PartidoHistorico";
import PublicarFormacionButton from "./PublicarFormacionButton";
import PanelDesignado from "./panel-designado/PanelDesignado";
import EditarFormacion from "./panel-designado/EditarFormacion";
import PateadorHabitual from "./panel-designado/PateadorHabitual";
import ResetDemoButton from "./ResetDemoButton";
import ReiniciarPartidoButton from "./ReiniciarPartidoButton";
import type { RosterJugador } from "./panel-designado/types";
import type { datosPartidoProgramado } from "@/lib/match/datosPartidoProgramado";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

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

  // Pedido explicito del club: antes de arrancar, el designado tiene que elegir el pateador (o
  // "Sin pateador fijo") sin que le quede otra -- no alcanza con que la pregunta este mas abajo
  // de Formaciones/Iniciar Partido, porque en la practica nadie scrolleaba hasta ahi y quedaba sin
  // contestar. Mientras no haya una decision tomada (pateadorHabitualId sigue "undefined" -- ver
  // el mismo chequeo en datosPartidoProgramado.ts), se tapa TODO lo demas (formacion, Iniciar
  // Partido, editar formacion) y esto es lo unico que se ve. Apenas elige algo (aunque sea "Sin
  // pateador fijo"), PateadorHabitual llama a router.refresh() y esta pantalla desaparece sola.
  const debeElegirPateador = puedeOperar && plantel.length > 0 && partido.pateadorHabitualId === undefined;

  if (debeElegirPateador) {
    return (
      <div
        style={{
          background: "rgba(255,255,255,.045)",
          border: "1px solid rgba(226,197,120,.2)",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <h2 style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: "0.85rem", color: DORADO, marginTop: 0, marginBottom: 4 }}>
          Antes de arrancar
        </h2>
        <p style={{ margin: "0 0 14px", fontSize: "0.85rem", color: DORADO_SUAVE }}>
          Elegí el pateador para poder iniciar el partido.
        </p>
        <PateadorHabitual
          partidoId={partidoId}
          plantel={plantel.map((j) => ({ jugadorId: j.jugadorId, nombre: j.nombre, dorsal: j.dorsal, titular: j.titular }) satisfies RosterJugador)}
          sugeridoId={sugeridoPateadorId}
          pateadorHabitualId={partido.pateadorHabitualId}
        />
      </div>
    );
  }

  return (
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
          plantel={plantel.map((j) => ({ jugadorId: j.jugadorId, nombre: j.nombre, dorsal: j.dorsal, titular: j.titular }) satisfies RosterJugador)}
          periodo={null}
          sugeridoPateadorId={sugeridoPateadorId}
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
