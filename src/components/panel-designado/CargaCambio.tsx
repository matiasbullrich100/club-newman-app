"use client";

import { useState, useTransition } from "react";
import { publicarCambio } from "@/lib/match/actions";
import type { RosterJugador } from "./types";

type Paso = "sale" | "entra" | "confirmar";

export default function CargaCambio({
  partidoId,
  plantel,
  enCanchaIds,
}: {
  partidoId: string;
  plantel: RosterJugador[];
  enCanchaIds: string[];
}) {
  const [paso, setPaso] = useState<Paso>("sale");
  const [saleId, setSaleId] = useState<string | null>(null);
  const [entraId, setEntraId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const enCancha = plantel.filter((j) => enCanchaIds.includes(j.jugadorId));
  const banco = plantel.filter((j) => !enCanchaIds.includes(j.jugadorId));
  const sale = plantel.find((j) => j.jugadorId === saleId);
  const entra = plantel.find((j) => j.jugadorId === entraId);

  function reset() {
    setPaso("sale");
    setSaleId(null);
    setEntraId(null);
    setError(null);
  }

  function confirmar() {
    if (!saleId || !entraId) return;
    setError(null);
    startTransition(async () => {
      try {
        await publicarCambio(partidoId, { jugadorSaleId: saleId, jugadorEntraId: entraId });
        reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo publicar el cambio");
      }
    });
  }

  return (
    <div style={{ borderTop: "1px solid #eee", paddingTop: "0.75rem" }}>
      <h3 style={{ fontSize: "0.9rem", margin: "0 0 0.5rem" }}>Cambio</h3>

      {paso === "sale" && (
        <div style={{ display: "grid", gap: "0.4rem" }}>
          <p style={{ margin: 0, fontSize: "0.85rem" }}>¿Quién sale?</p>
          {enCancha.map((j) => (
            <button key={j.jugadorId} onClick={() => { setSaleId(j.jugadorId); setPaso("entra"); }}>
              {j.dorsal} — {j.nombre}
            </button>
          ))}
        </div>
      )}

      {paso === "entra" && (
        <div style={{ display: "grid", gap: "0.4rem" }}>
          <p style={{ margin: 0, fontSize: "0.85rem" }}>¿Quién entra?</p>
          {banco.map((j) => (
            <button key={j.jugadorId} onClick={() => { setEntraId(j.jugadorId); setPaso("confirmar"); }}>
              {j.dorsal} — {j.nombre}
            </button>
          ))}
          <button onClick={reset}>Cancelar</button>
        </div>
      )}

      {paso === "confirmar" && (
        <div>
          <p>
            Confirmar: sale <strong>{sale?.nombre}</strong>, entra <strong>{entra?.nombre}</strong>
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
