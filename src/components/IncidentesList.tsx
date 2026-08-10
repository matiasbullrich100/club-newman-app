"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Incidente } from "@/types/firestore";
import { describirIncidente, ETIQUETAS_INCIDENTE, FAMILIA_PUNTOS, FAMILIA_TARJETA, ordenarIncidentes } from "@/lib/incidentes";
import { corregirTipoIncidente } from "@/lib/match/actions";
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
};

const SIN_EQUIPO: Incidente["tipo"][] = ["fin_1t", "fin_2t", "interrupcion_medica", "interrupcion_clima"];

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
}: {
  incidentes: (Incidente & { id: string })[];
  rivalNombre?: string;
  partidoId?: string;
  puedeEditar?: boolean;
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
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

  return (
    <div>
      {ordenadas.map((inc, i) => {
        const cambioDePeriodo = i > 0 && ordenadas[i - 1].periodo !== inc.periodo;
        const esFinDeTiempo = SIN_EQUIPO.includes(inc.tipo);
        const familia = familiaDe(inc.tipo);
        const editable = puedeEditar && partidoId && familia;
        const editando = editandoId === inc.id;
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
              <div style={{ color: DORADO, minWidth: 34, fontSize: "0.8rem" }}>
                {inc.periodo} {inc.minuto}&apos;
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
                {describirIncidente(inc, rivalNombre)}
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
            {editable && editando && (
              <div style={{ padding: "6px 4px 12px 44px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "0.78rem", opacity: 0.75, width: "100%" }}>Cambiar por:</span>
                {familia!
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
          </div>
        );
      })}
    </div>
  );
}
