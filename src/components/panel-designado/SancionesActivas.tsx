"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { collection, doc, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { reingresarSancion, resolverSancionRival } from "@/lib/match/actions";
import { elapsedSeconds, formatMMSS } from "@/lib/match/clock";
import { DURACION_SANCION_SEGUNDOS, ETIQUETAS_INCIDENTE } from "@/lib/incidentes";
import { norm } from "@/lib/players";
import type { Incidente, LiveState } from "@/types/firestore";
import type { JugadorBusqueda, RosterJugador } from "./types";
import { botonOpcion, botonPrimario, botonSecundario, listaOpciones } from "./estilos";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

/**
 * Panel de tarjetas amarillas/roja de 20 con la sancion todavia sin resolver (el jugador salio de
 * la cancha con la tarjeta -- ver DURACION_SANCION_SEGUNDOS en match/actions.ts -- y nadie ocupo
 * ese puesto todavia). Muestra la cuenta regresiva como referencia, pero no bloquea el reingreso
 * antes de tiempo -- el arbitro decide en la cancha, no el reloj de este panel.
 */
export default function SancionesActivas({
  partidoId,
  enCanchaIds,
  plantel,
  plantelCompleto,
  rivalNombre,
}: {
  partidoId: string;
  enCanchaIds: string[];
  plantel: RosterJugador[];
  plantelCompleto: JugadorBusqueda[];
  rivalNombre?: string;
}) {
  const [incidentes, setIncidentes] = useState<(Incidente & { id: string })[]>([]);
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [, tick] = useState(0);
  const [eligiendoPara, setEligiendoPara] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorRivalId, setErrorRivalId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isPendingRival, startTransitionRival] = useTransition();
  // Sanciones ya avisadas automaticamente (ver mas abajo) -- para no forzar el picker de nuevo si
  // el designado lo cancela a mano despues de que se cumplio el tiempo.
  const avisadasRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const q = query(collection(db, "partidos", partidoId, "incidentes"));
    return onSnapshot(q, (snap) => setIncidentes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Incidente) }))));
  }, [partidoId]);

  useEffect(() => {
    const ref = doc(db, "partidos", partidoId, "liveState", "state");
    return onSnapshot(ref, (snap) => setLiveState(snap.exists() ? (snap.data() as LiveState) : null));
  }, [partidoId]);

  useEffect(() => {
    const interval = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const ahora = liveState ? elapsedSeconds(liveState) : 0;

  // Sigue "activa" mientras el jugador no vuelva a estar en cancha -- no importa si fue el mismo
  // u otro quien cubrio el puesto, en ambos casos enCanchaIds vuelve a incluirlo/completarse y
  // deja de aparecer aca.
  const sanciones = incidentes.filter(
    (inc) =>
      DURACION_SANCION_SEGUNDOS[inc.tipo] !== undefined &&
      inc.equipo === "newman" &&
      inc.jugadorId &&
      !enCanchaIds.includes(inc.jugadorId)
  );

  // Del rival no llevamos plantel (no hay "quien entra" que elegir) -- sigue "activa" hasta que el
  // designado la marca resuelta a mano con el boton "Reingresó" (ver resolverSancionRival), sea
  // antes o despues de que se cumpla la cuenta regresiva.
  const sancionesRival = incidentes.filter(
    (inc) => DURACION_SANCION_SEGUNDOS[inc.tipo] !== undefined && inc.equipo === "rival" && !inc.sancionResuelta
  );

  // Avisa solo -- no bloquea nada, el arbitro decide en la cancha. Se abre el picker de reingreso
  // automaticamente apenas se cumple la cuenta regresiva de Newman, en vez de esperar a que el
  // designado se acuerde de tocar "Reingresar".
  useEffect(() => {
    for (const s of sanciones) {
      const duracion = DURACION_SANCION_SEGUNDOS[s.tipo]!;
      const cumplida = duracion - (ahora - s.segundoAbsoluto) <= 0;
      if (cumplida && !avisadasRef.current.has(s.id)) {
        avisadasRef.current.add(s.id);
        setEligiendoPara(s.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ahora, sanciones.map((s) => s.id).join(",")]);

  if ((sanciones.length === 0 && sancionesRival.length === 0) || !liveState) return null;

  const sancionadosIds = new Set(sanciones.map((s) => s.jugadorId));
  const banco = plantel.filter((j) => !enCanchaIds.includes(j.jugadorId) && !sancionadosIds.has(j.jugadorId));
  const idsPlantel = new Set(plantel.map((j) => j.jugadorId));
  const resultadosBusqueda =
    busqueda.trim().length >= 2
      ? plantelCompleto.filter((j) => !idsPlantel.has(j.jugadorId) && norm(j.nombre).includes(norm(busqueda.trim()))).slice(0, 8)
      : [];

  function cerrarEleccion() {
    setEligiendoPara(null);
    setBuscando(false);
    setBusqueda("");
    setError(null);
  }

  function elegirEntra(jugadorId: string, nombre: string, esNuevo: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        await reingresarSancion(partidoId, { jugadorEntraId: jugadorId, ...(esNuevo ? { jugadorEntraNombre: nombre } : {}) });
        cerrarEleccion();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo reingresar");
      }
    });
  }

  function resolverRival(incidenteId: string) {
    setErrorRivalId(null);
    startTransitionRival(async () => {
      try {
        await resolverSancionRival(partidoId, incidenteId);
      } catch (e) {
        setErrorRivalId(incidenteId);
        setError(e instanceof Error ? e.message : "No se pudo marcar el reingreso");
      }
    });
  }

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: "1rem" }}>
      <h3 style={{ fontSize: "1rem", margin: "0 0 0.75rem", color: DORADO, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Sanción en curso
      </h3>
      {sanciones.length > 0 && (
      <div style={{ display: "grid", gap: 10 }}>
        {sanciones.map((s) => {
          const duracion = DURACION_SANCION_SEGUNDOS[s.tipo]!;
          const restante = Math.max(0, duracion - (ahora - s.segundoAbsoluto));
          const cumplida = restante <= 0;
          const eligiendo = eligiendoPara === s.id;
          return (
            <div
              key={s.id}
              style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(226,197,120,.25)", borderRadius: 10, padding: 12 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  {s.dorsal ? `${s.dorsal} — ` : ""}
                  {s.jugadorNombre}
                </span>
                <span
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 700,
                    color: cumplida ? DORADO : DORADO_SUAVE,
                  }}
                >
                  {cumplida ? "Cumplida" : formatMMSS(restante)}
                </span>
              </div>

              {!eligiendo ? (
                <button
                  style={{ ...botonSecundario, marginTop: 8 }}
                  disabled={isPending}
                  onClick={() => {
                    setError(null);
                    setEligiendoPara(s.id);
                  }}
                >
                  Reingresar
                </button>
              ) : (
                <div style={{ ...listaOpciones, marginTop: 8 }}>
                  <button style={botonPrimario} disabled={isPending} onClick={() => elegirEntra(s.jugadorId!, s.jugadorNombre!, false)}>
                    Vuelve {s.jugadorNombre}
                  </button>
                  {banco.map((j) => (
                    <button key={j.jugadorId} style={botonOpcion} disabled={isPending} onClick={() => elegirEntra(j.jugadorId, j.nombre, false)}>
                      {j.dorsal} — {j.nombre}
                    </button>
                  ))}

                  {!buscando ? (
                    <button style={botonSecundario} onClick={() => setBuscando(true)}>
                      Buscar otro jugador
                    </button>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      <input
                        autoFocus
                        type="text"
                        placeholder="Apellido del jugador..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 10,
                          border: "1px solid rgba(226,197,120,.35)",
                          background: "rgba(0,0,0,.25)",
                          color: "#f7f1e4",
                          fontSize: "0.95rem",
                        }}
                      />
                      {busqueda.trim().length >= 2 && resultadosBusqueda.length === 0 && (
                        <p style={{ margin: 0, fontSize: "0.82rem", color: DORADO_SUAVE, opacity: 0.75 }}>Sin resultados.</p>
                      )}
                      {resultadosBusqueda.map((j) => (
                        <button key={j.jugadorId} style={botonOpcion} onClick={() => elegirEntra(j.jugadorId, j.nombre, true)}>
                          {j.nombre}
                        </button>
                      ))}
                    </div>
                  )}

                  <button style={botonSecundario} disabled={isPending} onClick={cerrarEleccion}>
                    Cancelar
                  </button>
                  {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {sancionesRival.length > 0 && (
        <div style={{ display: "grid", gap: 10, marginTop: sanciones.length > 0 ? 10 : 0 }}>
          {sancionesRival.map((s) => {
            const duracion = DURACION_SANCION_SEGUNDOS[s.tipo]!;
            const restante = Math.max(0, duracion - (ahora - s.segundoAbsoluto));
            const cumplida = restante <= 0;
            return (
              <div
                key={s.id}
                style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(226,197,120,.25)", borderRadius: 10, padding: 12 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>
                    {ETIQUETAS_INCIDENTE[s.tipo]} — {rivalNombre ?? "Rival"}
                  </span>
                  <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: cumplida ? DORADO : DORADO_SUAVE }}>
                    {cumplida ? "Cumplida" : formatMMSS(restante)}
                  </span>
                </div>
                <button
                  style={{ ...botonSecundario, marginTop: 8 }}
                  disabled={isPendingRival}
                  onClick={() => resolverRival(s.id)}
                >
                  Reingresó
                </button>
                {errorRivalId === s.id && error && <p style={{ color: "crimson", margin: "6px 0 0" }}>{error}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
