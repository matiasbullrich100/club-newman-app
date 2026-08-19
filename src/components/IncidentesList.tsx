"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Incidente } from "@/types/firestore";
import { describirIncidente, ETIQUETAS_INCIDENTE, FAMILIA_PUNTOS, FAMILIA_TARJETA, ordenarIncidentes, requierePlayerSelection } from "@/lib/incidentes";
import { corregirJugadorCambio, corregirJugadorIncidente, corregirTipoIncidente, eliminarIncidente } from "@/lib/match/actions";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

const ICONOS: Partial<Record<Incidente["tipo"], string>> = {
  tarjeta_amarilla: "🟨",
  tarjeta_doble_amarilla: "🟨🟨",
  tarjeta_roja: "🟥",
  tarjeta_roja_20: "🟥20",
  tarjeta_azul: "🟦",
  try: "🏉",
  try_scrum: "🏉",
  try_penal: "🏉",
  interrupcion_medica: "🏥",
  interrupcion_clima: "⛈️",
  walkover: "🚫",
};

const SIN_EQUIPO: Incidente["tipo"][] = ["fin_1t", "fin_2t", "fin_partido", "interrupcion_medica", "interrupcion_clima"];

function familiaDe(tipo: Incidente["tipo"]): Incidente["tipo"][] | null {
  if (FAMILIA_PUNTOS.includes(tipo)) return FAMILIA_PUNTOS;
  if (FAMILIA_TARJETA.includes(tipo)) return FAMILIA_TARJETA;
  return null;
}

export default function IncidentesList({
  incidentes,
  rivalNombre,
  partidoId,
  puedeEditar,
  nombreNewman,
  plantel = [],
}: {
  incidentes: (Incidente & { id: string })[];
  rivalNombre?: string;
  partidoId?: string;
  puedeEditar?: boolean;
  nombreNewman?: string;
  // Para "Cambiar jugador" -- solo hace falta jugadorId/nombre/dorsal, asi sirve tanto el roster
  // de un partido en vivo como el historico (formas ligeramente distintas, mismos 3 campos).
  plantel?: { jugadorId: string; nombre: string; dorsal: string }[];
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [confirmandoEliminarId, setConfirmandoEliminarId] = useState<string | null>(null);
  const [cambiandoJugadorId, setCambiandoJugadorId] = useState<string | null>(null);
  const [corrigiendoCambio, setCorrigiendoCambio] = useState<{ id: string; lado: "sale" | "entra" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (incidentes.length === 0) {
    return <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem" }}>Sin incidencias todavía.</p>;
  }

  // Lo mas reciente arriba del todo.
  const ordenadas = ordenarIncidentes(incidentes).reverse();

  function corregir(incidenteId: string, nuevoTipo: Incidente["tipo"]) {
    if (!partidoId) return;
    setError(null);
    startTransition(async () => {
      try {
        await corregirTipoIncidente(partidoId, incidenteId, nuevoTipo);
        setEditandoId(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo corregir");
      }
    });
  }

  function cambiarJugador(incidenteId: string, nuevoJugadorId: string) {
    if (!partidoId) return;
    setError(null);
    startTransition(async () => {
      try {
        await corregirJugadorIncidente(partidoId, incidenteId, nuevoJugadorId);
        setCambiandoJugadorId(null);
        setEditandoId(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo cambiar el jugador");
      }
    });
  }

  function corregirCambio(incidenteId: string, lado: "sale" | "entra", nuevoJugadorId: string) {
    if (!partidoId) return;
    setError(null);
    startTransition(async () => {
      try {
        await corregirJugadorCambio(partidoId, incidenteId, lado, nuevoJugadorId);
        setCorrigiendoCambio(null);
        setEditandoId(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo corregir");
      }
    });
  }

  function eliminar(incidenteId: string) {
    if (!partidoId) return;
    setError(null);
    startTransition(async () => {
      try {
        await eliminarIncidente(partidoId, incidenteId);
        setConfirmandoEliminarId(null);
        setEditandoId(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar");
      }
    });
  }

  return (
    <div>
      {ordenadas.map((inc, i) => {
        // El entretiempo forma su propio grupo (aunque comparta periodo "1T" con las jugadas de
        // antes del entretiempo) -- si no, la linea punteada solo aparece arriba del bloque de
        // Entretiempo y no abajo, porque el periodo no cambia entre el ultimo cambio y "Final 1er
        // tiempo".
        const grupoDe = (x: Incidente) => (x.enEntretiempo ? "entretiempo" : x.periodo);
        const cambioDePeriodo = i > 0 && grupoDe(ordenadas[i - 1]) !== grupoDe(inc);
        const esFinDeTiempo = SIN_EQUIPO.includes(inc.tipo);
        const familia = familiaDe(inc.tipo);
        const esCambio = inc.tipo === "cambio";
        const editable = puedeEditar && partidoId && (familia || esCambio);
        const editando = editandoId === inc.id;
        const puedeCambiarJugador = editable && !esCambio && inc.equipo === "newman" && requierePlayerSelection(inc.tipo) && plantel.length > 0;
        const cambiandoJugador = cambiandoJugadorId === inc.id;
        const corrigiendoEsteCambio = esCambio && corrigiendoCambio?.id === inc.id ? corrigiendoCambio.lado : null;
        return (
          <div key={inc.id}>
            {cambioDePeriodo && (
              <div
                style={{
                  borderTop: "3px dashed rgba(242,169,0,.5)",
                  margin: "6px 0",
                }}
              />
            )}
            <div
              style={{
                display: "flex",
                gap: 10,
                padding: "8px 4px",
                fontSize: "0.85rem",
                borderBottom: "1px dashed rgba(255,255,255,.08)",
                alignItems: "center",
              }}
            >
              <div style={{ color: DORADO, minWidth: inc.enEntretiempo ? 76 : 34, fontSize: "0.8rem" }}>
                {inc.enEntretiempo ? "Entretiempo" : (
                  <>
                    {inc.periodo} {inc.minuto}&apos;
                  </>
                )}
              </div>
              <div style={{ minWidth: 20, textAlign: "center" }}>{ICONOS[inc.tipo] ?? ""}</div>
              <div
                style={{
                  flex: 1,
                  color: DORADO_SUAVE,
                  textTransform: esFinDeTiempo ? "uppercase" : "none",
                  fontWeight: esFinDeTiempo ? 700 : 400,
                }}
              >
                {describirIncidente(inc, rivalNombre, nombreNewman)}
              </div>
              {editable && !editando && (
                <button
                  onClick={() => { setEditandoId(inc.id); setError(null); }}
                  style={{
                    fontSize: "0.72rem",
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid rgba(226,197,120,.35)",
                    color: DORADO_SUAVE,
                  }}
                >
                  Corregir
                </button>
              )}
            </div>
            {editable && editando && confirmandoEliminarId !== inc.id && !cambiandoJugador && !corrigiendoEsteCambio && (
              <div style={{ padding: "6px 4px 12px 44px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {familia && (
                  <>
                    <span style={{ fontSize: "0.78rem", opacity: 0.75, width: "100%" }}>Cambiar por:</span>
                    {familia
                      .filter((t) => t !== inc.tipo)
                      .map((t) => (
                        <button
                          key={t}
                          disabled={isPending}
                          onClick={() => corregir(inc.id, t)}
                          style={{
                            fontSize: "0.78rem",
                            padding: "8px 12px",
                            borderRadius: 8,
                            background: "rgba(255,255,255,.06)",
                            border: "1px solid rgba(226,197,120,.35)",
                            color: "#f7f1e4",
                          }}
                        >
                          {ETIQUETAS_INCIDENTE[t]}
                        </button>
                      ))}
                  </>
                )}
                {puedeCambiarJugador && (
                  <button
                    disabled={isPending}
                    onClick={() => setCambiandoJugadorId(inc.id)}
                    style={{
                      fontSize: "0.78rem",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,.06)",
                      border: "1px solid rgba(226,197,120,.35)",
                      color: "#f7f1e4",
                    }}
                  >
                    Cambiar jugador
                  </button>
                )}
                {esCambio && plantel.length > 0 && inc.jugadorSaleId && (
                  <button
                    disabled={isPending}
                    onClick={() => setCorrigiendoCambio({ id: inc.id, lado: "sale" })}
                    style={{
                      fontSize: "0.78rem",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,.06)",
                      border: "1px solid rgba(226,197,120,.35)",
                      color: "#f7f1e4",
                    }}
                  >
                    Cambiar quién salió
                  </button>
                )}
                {esCambio && plantel.length > 0 && inc.jugadorEntraId && (
                  <button
                    disabled={isPending}
                    onClick={() => setCorrigiendoCambio({ id: inc.id, lado: "entra" })}
                    style={{
                      fontSize: "0.78rem",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,.06)",
                      border: "1px solid rgba(226,197,120,.35)",
                      color: "#f7f1e4",
                    }}
                  >
                    Cambiar quién entró
                  </button>
                )}
                <button
                  disabled={isPending}
                  onClick={() => setConfirmandoEliminarId(inc.id)}
                  style={{
                    fontSize: "0.78rem",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(194,59,59,.12)",
                    border: "1px solid rgba(194,59,59,.5)",
                    color: "#f3caca",
                  }}
                >
                  Eliminar jugada
                </button>
                <button
                  disabled={isPending}
                  onClick={() => setEditandoId(null)}
                  style={{
                    fontSize: "0.78rem",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid rgba(226,197,120,.2)",
                    color: DORADO_SUAVE,
                  }}
                >
                  Cancelar
                </button>
                {error && <p style={{ color: "#f3caca", fontSize: "0.78rem", width: "100%", margin: 0 }}>{error}</p>}
              </div>
            )}
            {editable && confirmandoEliminarId === inc.id && (
              <div style={{ padding: "6px 4px 12px 44px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "0.78rem", width: "100%", color: "#f3caca" }}>
                  {esCambio
                    ? "¿Eliminar este cambio? Quien salió vuelve a estar en cancha, quien entró deja de estarlo, y se recalculan los minutos jugados."
                    : "¿Eliminar esta jugada? Se descuenta del resultado o de las tarjetas."}
                </span>
                <button
                  disabled={isPending}
                  onClick={() => eliminar(inc.id)}
                  style={{
                    fontSize: "0.78rem",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "#c23b3b",
                    border: "none",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  {isPending ? "Eliminando…" : "Sí, eliminar"}
                </button>
                <button
                  disabled={isPending}
                  onClick={() => setConfirmandoEliminarId(null)}
                  style={{
                    fontSize: "0.78rem",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid rgba(226,197,120,.2)",
                    color: DORADO_SUAVE,
                  }}
                >
                  Cancelar
                </button>
                {error && <p style={{ color: "#f3caca", fontSize: "0.78rem", width: "100%", margin: 0 }}>{error}</p>}
              </div>
            )}
            {puedeCambiarJugador && cambiandoJugador && (
              <div style={{ padding: "6px 4px 12px 44px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "0.78rem", opacity: 0.75, width: "100%" }}>¿Quién fue?</span>
                {plantel.map((j) => (
                  <button
                    key={j.jugadorId}
                    disabled={isPending}
                    onClick={() => cambiarJugador(inc.id, j.jugadorId)}
                    style={{
                      fontSize: "0.78rem",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,.06)",
                      border: "1px solid rgba(226,197,120,.35)",
                      color: "#f7f1e4",
                    }}
                  >
                    {j.dorsal} — {j.nombre}
                  </button>
                ))}
                <button
                  disabled={isPending}
                  onClick={() => setCambiandoJugadorId(null)}
                  style={{
                    fontSize: "0.78rem",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid rgba(226,197,120,.2)",
                    color: DORADO_SUAVE,
                  }}
                >
                  Cancelar
                </button>
                {error && <p style={{ color: "#f3caca", fontSize: "0.78rem", width: "100%", margin: 0 }}>{error}</p>}
              </div>
            )}
            {corrigiendoEsteCambio && (
              <div style={{ padding: "6px 4px 12px 44px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "0.78rem", opacity: 0.75, width: "100%" }}>
                  ¿Quién {corrigiendoEsteCambio === "sale" ? "salió" : "entró"} en realidad?
                </span>
                {plantel.map((j) => (
                  <button
                    key={j.jugadorId}
                    disabled={isPending}
                    onClick={() => corregirCambio(inc.id, corrigiendoEsteCambio, j.jugadorId)}
                    style={{
                      fontSize: "0.78rem",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,.06)",
                      border: "1px solid rgba(226,197,120,.35)",
                      color: "#f7f1e4",
                    }}
                  >
                    {j.dorsal} — {j.nombre}
                  </button>
                ))}
                <button
                  disabled={isPending}
                  onClick={() => setCorrigiendoCambio(null)}
                  style={{
                    fontSize: "0.78rem",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid rgba(226,197,120,.2)",
                    color: DORADO_SUAVE,
                  }}
                >
                  Cancelar
                </button>
                {error && <p style={{ color: "#f3caca", fontSize: "0.78rem", width: "100%", margin: 0 }}>{error}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
