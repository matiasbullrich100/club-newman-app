"use client";

import { useState, useTransition } from "react";
import {
  cortar1T,
  iniciar2T,
  iniciarPartido,
  reanudar,
  suspender,
  terminarPartido,
} from "@/lib/match/actions";
import type { LiveState, Partido } from "@/types/firestore";
import type { RosterJugador } from "./types";
import CargaIncidencia from "./CargaIncidencia";
import CargaCambio from "./CargaCambio";

export default function PanelDesignado({
  partidoId,
  partido,
  plantel,
  periodo,
}: {
  partidoId: string;
  partido: Partido;
  plantel: RosterJugador[];
  periodo: LiveState["periodo"];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function ejecutar(accion: (id: string) => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await accion(partidoId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error");
      }
    });
  }

  return (
    <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: "1rem", marginTop: "1rem" }}>
      <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Panel del Designado</h2>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {partido.estado === "programado" && (
          <button disabled={isPending} onClick={() => ejecutar(iniciarPartido)}>
            Iniciar partido
          </button>
        )}
        {partido.estado === "en_juego" && (
          <>
            <button disabled={isPending} onClick={() => ejecutar(suspender)}>
              Suspender
            </button>
            {periodo === "1T" && (
              <button disabled={isPending} onClick={() => ejecutar(cortar1T)}>
                Cortar 1er tiempo
              </button>
            )}
            <button disabled={isPending} onClick={() => ejecutar(terminarPartido)}>
              Terminar partido
            </button>
          </>
        )}
        {partido.estado === "entretiempo" && (
          <button disabled={isPending} onClick={() => ejecutar(iniciar2T)}>
            Iniciar 2do tiempo
          </button>
        )}
        {partido.estado === "suspendido" && (
          <button disabled={isPending} onClick={() => ejecutar(reanudar)}>
            Reanudar
          </button>
        )}
        {partido.estado === "terminado" && <p>Partido terminado.</p>}
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {partido.estado === "en_juego" && (
        <div style={{ display: "grid", gap: "1rem" }}>
          <CargaIncidencia partidoId={partidoId} plantel={plantel} enCanchaIds={partido.enCanchaIds} />
          <CargaCambio partidoId={partidoId} plantel={plantel} enCanchaIds={partido.enCanchaIds} />
        </div>
      )}
    </div>
  );
}
