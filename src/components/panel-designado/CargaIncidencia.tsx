"use client";

import { useState, useTransition } from "react";
import { publicarIncidente, type PublicarIncidenteInput } from "@/lib/match/actions";
import type { Equipo, TipoIncidente } from "@/types/firestore";
import type { RosterJugador } from "./types";

const TIPOS: { tipo: Exclude<TipoIncidente, "cambio">; label: string }[] = [
  { tipo: "try", label: "Try (+5)" },
  { tipo: "conversion", label: "Conversión (+2)" },
  { tipo: "penal", label: "Penal (+3)" },
  { tipo: "drop", label: "Drop (+3)" },
  { tipo: "try_penal", label: "Try Penal (+7)" },
  { tipo: "tarjeta_amarilla", label: "Tarjeta amarilla" },
  { tipo: "tarjeta_roja", label: "Tarjeta roja" },
  { tipo: "tarjeta_azul", label: "Tarjeta azul" },
  { tipo: "lesion", label: "Lesión" },
];

type Paso = "tipo" | "equipo" | "jugador" | "confirmar";

export default function CargaIncidencia({
  partidoId,
  plantel,
  enCanchaIds,
}: {
  partidoId: string;
  plantel: RosterJugador[];
  enCanchaIds: string[];
}) {
  const [paso, setPaso] = useState<Paso>("tipo");
  const [tipo, setTipo] = useState<Exclude<TipoIncidente, "cambio"> | null>(null);
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [jugadorId, setJugadorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const enCancha = plantel.filter((j) => enCanchaIds.includes(j.jugadorId));
  const requiereJugador = equipo === "newman";
  const jugador = plantel.find((j) => j.jugadorId === jugadorId);

  function reset() {
    setPaso("tipo");
    setTipo(null);
    setEquipo(null);
    setJugadorId(null);
    setError(null);
  }

  function elegirTipo(t: Exclude<TipoIncidente, "cambio">) {
    setTipo(t);
    if (t === "lesion") {
      setEquipo("newman");
      setPaso("jugador");
    } else {
      setPaso("equipo");
    }
  }

  function elegirEquipo(e: Equipo) {
    setEquipo(e);
    setPaso(e === "newman" ? "jugador" : "confirmar");
  }

  function confirmar() {
    if (!tipo || !equipo) return;
    setError(null);
    const input: PublicarIncidenteInput = { tipo, equipo, jugadorId: jugadorId ?? undefined };
    startTransition(async () => {
      try {
        await publicarIncidente(partidoId, input);
        reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo publicar");
      }
    });
  }

  return (
    <div style={{ borderTop: "1px solid #eee", paddingTop: "0.75rem" }}>
      <h3 style={{ fontSize: "0.9rem", margin: "0 0 0.5rem" }}>Cargar jugada</h3>

      {paso === "tipo" && (
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {TIPOS.map(({ tipo: t, label }) => (
            <button key={t} onClick={() => elegirTipo(t)}>
              {label}
            </button>
          ))}
        </div>
      )}

      {paso === "equipo" && (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => elegirEquipo("newman")}>Newman</button>
          <button onClick={() => elegirEquipo("rival")}>Rival</button>
          <button onClick={reset}>Cancelar</button>
        </div>
      )}

      {paso === "jugador" && requiereJugador && (
        <div style={{ display: "grid", gap: "0.4rem" }}>
          {enCancha.length === 0 && <p>No hay jugadores en cancha.</p>}
          {enCancha.map((j) => (
            <button key={j.jugadorId} onClick={() => { setJugadorId(j.jugadorId); setPaso("confirmar"); }}>
              {j.dorsal} — {j.nombre}
            </button>
          ))}
          <button onClick={reset}>Cancelar</button>
        </div>
      )}

      {paso === "confirmar" && tipo && equipo && (
        <div>
          <p>
            Confirmar: <strong>{TIPOS.find((t) => t.tipo === tipo)?.label}</strong> —{" "}
            {equipo === "newman" ? jugador?.nombre ?? "" : "Rival"}
          </p>
          {error && <p style={{ color: "crimson" }}>{error}</p>}
          <button disabled={isPending} onClick={confirmar}>
            {isPending ? "Publicando…" : "Publicar"}
          </button>{" "}
          <button disabled={isPending} onClick={reset}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
