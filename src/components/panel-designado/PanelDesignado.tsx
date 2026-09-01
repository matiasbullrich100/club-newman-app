"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cortar1T,
  iniciar2T,
  iniciarPartido,
  reanudar,
  registrarWalkover,
  retomar1T,
  suspender,
  terminarPartido,
} from "@/lib/match/actions";
import type { LiveState, Partido } from "@/types/firestore";
import type { JugadorBusqueda, RosterJugador } from "./types";
import CargaIncidencia from "./CargaIncidencia";
import CargaCambio from "./CargaCambio";
import SancionesActivas from "./SancionesActivas";
import PateadorHabitual from "./PateadorHabitual";
import Formaciones from "@/components/Formaciones";
import IncidentesFeed from "@/components/IncidentesFeed";
import { botonSecundario } from "./estilos";
import { nombreNewmanDe } from "@/lib/categorias";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

const btnStyle: React.CSSProperties = {
  fontSize: "0.92rem",
  padding: "14px 20px",
  minHeight: 50,
  borderRadius: 10,
  border: "none",
  background: DORADO,
  color: "#451526",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1,
};

// Estas dos cierran una etapa del partido que no se puede deshacer (el reloj de ese tiempo
// no vuelve a correr) -- piden confirmacion, igual que publicar una incidencia.
type AccionConfirmable = "cortar1T" | "terminarPartido" | "retomar1T";

const ACCIONES_CONFIRMABLES: Record<AccionConfirmable, (id: string) => Promise<void>> = {
  cortar1T,
  terminarPartido,
  retomar1T,
};

const PREGUNTAS_CONFIRMACION: Record<AccionConfirmable, string> = {
  cortar1T: "¿Final del 1er tiempo?",
  terminarPartido: "¿Terminar el partido?",
  retomar1T: "¿Volver al 1er tiempo? (el 1er tiempo no había terminado)",
};

export default function PanelDesignado({
  partidoId,
  partido,
  plantel,
  plantelCompleto = [],
  periodo,
  apellidosAmbiguos,
  sugeridoPateadorId,
}: {
  partidoId: string;
  partido: Partido;
  plantel: RosterJugador[];
  plantelCompleto?: JugadorBusqueda[];
  periodo: LiveState["periodo"];
  apellidosAmbiguos?: string[];
  sugeridoPateadorId?: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<AccionConfirmable | null>(null);
  const [eligiendoMotivo, setEligiendoMotivo] = useState(false);
  const [eligiendoWalkover, setEligiendoWalkover] = useState(false);
  // true mientras hay un try de Newman esperando que se elija el jugador que lo hizo -- se bloquea
  // el resto del panel para que el designado no se olvide de cerrarlo (y el try quede sin publicar).
  const [bloqueoTry, setBloqueoTry] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function ejecutar(accion: (id: string) => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await accion(partidoId);
        // La pagina del partido bifurca server-side segun estado (programado -> vista estatica,
        // en_juego -> motor en vivo) -- sin esto, arrancar/terminar un partido no cambiaria de
        // vista hasta recargar a mano.
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error");
      }
    });
  }

  function pedirConfirmacion(accion: AccionConfirmable) {
    setError(null);
    setPendiente(accion);
  }

  function confirmarPendiente() {
    if (!pendiente) return;
    ejecutar(ACCIONES_CONFIRMABLES[pendiente]);
    setPendiente(null);
  }

  function interrumpirPor(motivo: "medico" | "clima") {
    setEligiendoMotivo(false);
    ejecutar((id) => suspender(id, motivo));
  }

  function walkoverDe(equipo: "newman" | "rival") {
    setEligiendoWalkover(false);
    ejecutar((id) => registrarWalkover(id, equipo));
  }

  const nombreNewman = nombreNewmanDe(partido.categoriaId);

  return (
    <div
      style={{
        background: "rgba(255,255,255,.045)",
        border: "1px solid rgba(226,197,120,.2)",
        borderRadius: 12,
        padding: 16,
        marginTop: 14,
      }}
    >
      <h2 style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: "0.85rem", color: DORADO, marginTop: 0, marginBottom: 10 }}>
        Panel del Designado
      </h2>

      {bloqueoTry ? (
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ color: DORADO, fontWeight: 700 }}>
            Terminá de cargar el try — elegí abajo quién lo hizo (o cancelá si fue error). El resto del
            panel queda bloqueado hasta entonces.
          </p>
        </div>
      ) : eligiendoMotivo ? (
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ color: DORADO_SUAVE }}>¿Por qué se interrumpe el partido?</p>
          {error && <p style={{ color: "#f3caca" }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={btnStyle} disabled={isPending} onClick={() => interrumpirPor("medico")}>
              Médico
            </button>
            <button style={btnStyle} disabled={isPending} onClick={() => interrumpirPor("clima")}>
              Clima
            </button>
            <button style={botonSecundario} disabled={isPending} onClick={() => setEligiendoMotivo(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : eligiendoWalkover ? (
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ color: DORADO_SUAVE }}>¿Quién no presentó primera línea (pilar, hooker, pilar)?</p>
          {error && <p style={{ color: "#f3caca" }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={btnStyle} disabled={isPending} onClick={() => walkoverDe("newman")}>
              {nombreNewman}
            </button>
            <button style={btnStyle} disabled={isPending} onClick={() => walkoverDe("rival")}>
              {partido.rival}
            </button>
            <button style={botonSecundario} disabled={isPending} onClick={() => setEligiendoWalkover(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : pendiente ? (
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ color: DORADO_SUAVE }}>
            Confirmar: <strong>{PREGUNTAS_CONFIRMACION[pendiente]}</strong>
          </p>
          {error && <p style={{ color: "#f3caca" }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={btnStyle} disabled={isPending} onClick={confirmarPendiente}>
              {isPending ? "Confirmando…" : "Confirmar"}
            </button>
            <button style={botonSecundario} disabled={isPending} onClick={() => setPendiente(null)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {partido.estado === "programado" && (
            <button style={btnStyle} disabled={isPending} onClick={() => ejecutar(iniciarPartido)}>
              Iniciar partido
            </button>
          )}
          {partido.estado === "en_juego" && (
            <>
              <button style={btnStyle} disabled={isPending} onClick={() => { setError(null); setEligiendoMotivo(true); }}>
                Interrumpir
              </button>
              {periodo === "1T" && (
                <button style={btnStyle} disabled={isPending} onClick={() => pedirConfirmacion("cortar1T")}>
                  Final 1er tiempo
                </button>
              )}
              <button style={btnStyle} disabled={isPending} onClick={() => pedirConfirmacion("terminarPartido")}>
                Terminar partido
              </button>
            </>
          )}
          {partido.estado === "entretiempo" && (
            <>
              <button style={btnStyle} disabled={isPending} onClick={() => ejecutar(iniciar2T)}>
                Iniciar 2do tiempo
              </button>
              {/* Por si se corto el 1er tiempo por error y todavia se estaba jugando. */}
              <button style={botonSecundario} disabled={isPending} onClick={() => pedirConfirmacion("retomar1T")}>
                Volver al 1er tiempo
              </button>
            </>
          )}
          {partido.estado === "suspendido" && (
            <button style={btnStyle} disabled={isPending} onClick={() => ejecutar(reanudar)}>
              Reanudar
            </button>
          )}
          {partido.estado === "terminado" ? (
            <p style={{ color: DORADO_SUAVE, fontSize: "0.85rem" }}>Partido terminado.</p>
          ) : (
            <button style={botonSecundario} disabled={isPending} onClick={() => { setError(null); setEligiendoWalkover(true); }}>
              W.O.
            </button>
          )}
        </div>
      )}

      {!pendiente && !eligiendoMotivo && !eligiendoWalkover && error && <p style={{ color: "#f3caca" }}>{error}</p>}

      {/* El pateador preseleccionado se puede elegir YA, antes de arrancar, asi el designado no
          pierde el 1er minuto de juego. En vivo queda a la vista arriba de "Cargar jugada". */}
      {partido.estado === "programado" && (
        <PateadorHabitual
          partidoId={partidoId}
          plantel={plantel}
          sugeridoId={sugeridoPateadorId}
          pateadorHabitualId={partido.pateadorHabitualId}
        />
      )}

      {(partido.estado === "en_juego" || partido.estado === "entretiempo") && (
        <div style={{ display: "grid", gap: "1rem" }}>
          {/* Pateador preseleccionado: abajo de los botones de estado, arriba de "Cargar jugada",
              a la vista con "Cambiar". */}
          {!bloqueoTry && (
            <PateadorHabitual
              partidoId={partidoId}
              plantel={plantel}
              sugeridoId={sugeridoPateadorId}
              pateadorHabitualId={partido.pateadorHabitualId}
            />
          )}
          {/* Try/tarjeta solo tienen sentido con la pelota en juego -- en el entretiempo el
              reloj esta frenado, no hay jugadas nuevas, pero si se hacen cambios tacticos. */}
          {partido.estado === "en_juego" && (
            <CargaIncidencia
              partidoId={partidoId}
              plantel={plantel}
              enCanchaIds={partido.enCanchaIds}
              pateadorHabitualId={partido.pateadorHabitualId}
              onBloqueoChange={setBloqueoTry}
            />
          )}
          {/* Formaciones para el Designado -- debajo de "Cargar jugada", no arriba de todo. */}
          {plantel.length > 0 && !bloqueoTry && (
            <div
              style={{
                background: "rgba(255,255,255,.045)",
                border: "1px solid rgba(226,197,120,.2)",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <h3 style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: "0.85rem", color: DORADO, marginTop: 0, marginBottom: 10 }}>
                Formaciones
              </h3>
              <Formaciones plantel={plantel} />
            </div>
          )}
          <SancionesActivas
            partidoId={partidoId}
            enCanchaIds={partido.enCanchaIds}
            plantel={plantel}
            plantelCompleto={plantelCompleto}
            rivalNombre={partido.rival}
          />
          {/* Mas jugadas que cambios -- el feed va entremedio para no tener que scrollear
              pasando el bloque de cambios (que se usa menos) para verlo. */}
          <IncidentesFeed
            partidoId={partidoId}
            rivalNombre={partido.rival}
            puedeEditar
            nombreNewman={nombreNewman}
            esLocal={partido.esLocal}
            plantel={plantel}
            apellidosAmbiguos={apellidosAmbiguos}
          />
          {!bloqueoTry && (
            <CargaCambio partidoId={partidoId} plantel={plantel} plantelCompleto={plantelCompleto} enCanchaIds={partido.enCanchaIds} />
          )}
        </div>
      )}
    </div>
  );
}
