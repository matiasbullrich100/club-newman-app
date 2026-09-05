"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPateadorHabitual } from "@/lib/match/actions";
import type { RosterJugador } from "./types";
import { botonOpcion, botonPrimario, botonSecundario, listaOpciones } from "./estilos";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

// Se puede elegir ANTES de que arranque el partido (ver PanelDesignado / PartidoProgramadoPanel)
// para no perder el 1er minuto de juego. Una vez elegido queda a la vista (arriba de los cambios)
// con un boton "Cambiar" para corregirlo. `pateadorHabitualId`: undefined = todavia sin elegir,
// null = "sin pateador fijo", string = jugadorId elegido. Firestore avisa via onSnapshot en
// PartidoLive, sin router.refresh.
export default function PateadorHabitual({
  partidoId,
  plantel,
  sugeridoId,
  pateadorHabitualId,
  onElegido,
}: {
  partidoId: string;
  plantel: RosterJugador[];
  sugeridoId?: string | null;
  pateadorHabitualId?: string | null;
  // Solo la usa PateadorGate.tsx -- avisa que se confirmo una eleccion en ESTA visita (aunque haya
  // sido la misma que ya estaba guardada), para poder destapar el resto del panel.
  onElegido?: () => void;
}) {
  const [eligiendoOtro, setEligiendoOtro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const sugerido = sugeridoId ? plantel.find((j) => j.jugadorId === sugeridoId) : undefined;
  const yaElegido = pateadorHabitualId !== undefined;
  const elegidoJugador = pateadorHabitualId ? plantel.find((j) => j.jugadorId === pateadorHabitualId) : undefined;

  function elegir(jugadorId: string | null) {
    setError(null);
    startTransition(async () => {
      try {
        await setPateadorHabitual(partidoId, jugadorId);
        setEligiendoOtro(false);
        onElegido?.();
        // En vivo el onSnapshot de PartidoLive ya refresca el prop; antes de arrancar (vista
        // estatica de PartidoProgramadoPanel) hace falta pedirlo a mano.
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: "1rem" }}>
      <h3 style={{ fontSize: "1rem", margin: "0 0 0.5rem", color: DORADO, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Pateador preseleccionado
      </h3>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {yaElegido && !eligiendoOtro ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontSize: "0.95rem" }}>
            {pateadorHabitualId === null
              ? "Sin pateador fijo"
              : elegidoJugador
                ? `${elegidoJugador.dorsal} — ${elegidoJugador.nombre}`
                : "Elegido (no está en la formación cargada)"}
          </span>
          <button
            style={{ ...botonSecundario, flex: "0 0 auto", fontSize: "0.8rem", padding: "8px 14px" }}
            disabled={isPending}
            onClick={() => setEligiendoOtro(true)}
          >
            Cambiar
          </button>
        </div>
      ) : eligiendoOtro ? (
        <div style={listaOpciones}>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>¿Quién patea habitualmente?</p>
          {plantel.length === 0 && <p style={{ margin: 0, fontSize: "0.85rem", color: DORADO_SUAVE }}>Todavía no hay formación cargada.</p>}
          {plantel.map((j) => (
            <button key={j.jugadorId} style={botonOpcion} disabled={isPending} onClick={() => elegir(j.jugadorId)}>
              {j.dorsal} — {j.nombre}
            </button>
          ))}
          <button style={{ ...botonSecundario, fontSize: "0.78rem" }} disabled={isPending} onClick={() => elegir(null)}>
            Sin pateador fijo
          </button>
          <button style={botonSecundario} disabled={isPending} onClick={() => setEligiendoOtro(false)}>
            Cancelar
          </button>
        </div>
      ) : sugerido ? (
        <div style={listaOpciones}>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>
            ¿{sugerido.nombre} es el pateador habitual de este partido? Así no hay que buscarlo cada vez que
            convierte un try o patea un penal.
          </p>
          {/* Esta pregunta aparece en la vista estatica de "antes de arrancar", debajo de una
              formacion larga -- BarraAccionFija (pensada para cuando una lista se achica DURANTE
              una jugada en curso, ver su propio comentario) quedaba fija abajo de la pantalla,
              tapando Formaciones y separada de esta pregunta (bug real reportado: se veian los
              botones "Si"/"No" sin la pregunta a la vista). Botones en linea, sin fijar. */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={botonPrimario} disabled={isPending} onClick={() => elegir(sugerido.jugadorId)}>
              Sí
            </button>
            <button style={botonSecundario} disabled={isPending} onClick={() => setEligiendoOtro(true)}>
              No, otro jugador
            </button>
          </div>
          <button
            style={{ ...botonSecundario, fontSize: "0.78rem", marginTop: 8 }}
            disabled={isPending}
            onClick={() => elegir(null)}
          >
            Sin pateador fijo
          </button>
        </div>
      ) : (
        <div style={listaOpciones}>
          <p style={{ margin: 0, fontSize: "0.92rem", color: DORADO_SUAVE }}>
            Elegí quién patea habitualmente para no tener que buscarlo cada vez que convierte un try o patea un
            penal (opcional).
          </p>
          <button style={botonSecundario} disabled={isPending} onClick={() => setEligiendoOtro(true)}>
            Elegir jugador
          </button>
          <button
            style={{ ...botonSecundario, fontSize: "0.78rem" }}
            disabled={isPending}
            onClick={() => elegir(null)}
          >
            Sin pateador fijo
          </button>
        </div>
      )}
    </div>
  );
}
