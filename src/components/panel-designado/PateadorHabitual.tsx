"use client";

import { useState, useTransition } from "react";
import { setPateadorHabitual } from "@/lib/match/actions";
import type { RosterJugador } from "./types";
import { botonOpcion, botonPrimario, botonSecundario, listaOpciones } from "./estilos";
import BarraAccionFija from "./BarraAccionFija";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

// Se pregunta una sola vez, apenas arranca el partido (mientras partido.pateadorHabitualId siga
// undefined -- ver PanelDesignado.tsx) -- despues, elegir "Sí" o "Sin pateador fijo" lo guarda y
// este bloque desaparece solo (Firestore avisa via onSnapshot en PartidoLive, sin router.refresh).
export default function PateadorHabitual({
  partidoId,
  plantel,
  sugeridoId,
}: {
  partidoId: string;
  plantel: RosterJugador[];
  sugeridoId?: string | null;
}) {
  const [eligiendoOtro, setEligiendoOtro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sugerido = sugeridoId ? plantel.find((j) => j.jugadorId === sugeridoId) : undefined;

  function elegir(jugadorId: string | null) {
    setError(null);
    startTransition(async () => {
      try {
        await setPateadorHabitual(partidoId, jugadorId);
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
      {eligiendoOtro ? (
        <div style={listaOpciones}>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>¿Quién patea habitualmente?</p>
          {plantel.map((j) => (
            <button key={j.jugadorId} style={botonOpcion} disabled={isPending} onClick={() => elegir(j.jugadorId)}>
              {j.dorsal} — {j.nombre}
            </button>
          ))}
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
          <BarraAccionFija>
            <button style={botonPrimario} disabled={isPending} onClick={() => elegir(sugerido.jugadorId)}>
              Sí
            </button>
            <button style={botonSecundario} disabled={isPending} onClick={() => setEligiendoOtro(true)}>
              No, otro jugador
            </button>
          </BarraAccionFija>
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
