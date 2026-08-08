"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import IncidentesFeed from "@/components/IncidentesFeed";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

const btnStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  background: DORADO,
  color: "#451526",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 1,
};

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

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {partido.estado === "programado" && (
          <button style={btnStyle} disabled={isPending} onClick={() => ejecutar(iniciarPartido)}>
            Iniciar partido
          </button>
        )}
        {partido.estado === "en_juego" && (
          <>
            <button style={btnStyle} disabled={isPending} onClick={() => ejecutar(suspender)}>
              Suspender
            </button>
            {periodo === "1T" && (
              <button style={btnStyle} disabled={isPending} onClick={() => ejecutar(cortar1T)}>
                Cortar 1er tiempo
              </button>
            )}
            <button style={btnStyle} disabled={isPending} onClick={() => ejecutar(terminarPartido)}>
              Terminar partido
            </button>
          </>
        )}
        {partido.estado === "entretiempo" && (
          <button style={btnStyle} disabled={isPending} onClick={() => ejecutar(iniciar2T)}>
            Iniciar 2do tiempo
          </button>
        )}
        {partido.estado === "suspendido" && (
          <button style={btnStyle} disabled={isPending} onClick={() => ejecutar(reanudar)}>
            Reanudar
          </button>
        )}
        {partido.estado === "terminado" && <p style={{ color: DORADO_SUAVE, fontSize: "0.85rem" }}>Partido terminado.</p>}
      </div>

      {error && <p style={{ color: "#f3caca" }}>{error}</p>}

      {partido.estado === "en_juego" && (
        <div style={{ display: "grid", gap: "1rem" }}>
          <CargaIncidencia partidoId={partidoId} plantel={plantel} enCanchaIds={partido.enCanchaIds} />
          {/* Mas jugadas que cambios -- el feed va entremedio para no tener que scrollear
              pasando el bloque de cambios (que se usa menos) para verlo. */}
          <IncidentesFeed partidoId={partidoId} />
          <CargaCambio partidoId={partidoId} plantel={plantel} enCanchaIds={partido.enCanchaIds} />
        </div>
      )}
    </div>
  );
}
