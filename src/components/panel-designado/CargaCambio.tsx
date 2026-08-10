"use client";

import { useState, useTransition } from "react";
import { publicarCambio } from "@/lib/match/actions";
import type { RosterJugador } from "./types";
import { botonOpcion, botonPrimario, botonSecundario, listaOpciones } from "./estilos";
import { DORADO } from "@/lib/colors";

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
    <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: "1rem" }}>
      <h3 style={{ fontSize: "1rem", margin: "0 0 0.75rem", color: DORADO, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Cambio
      </h3>

      {paso === "sale" && (
        <div style={listaOpciones}>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>¿Quién sale?</p>
          {enCancha.map((j) => (
            <button key={j.jugadorId} style={botonOpcion} onClick={() => { setSaleId(j.jugadorId); setPaso("entra"); }}>
              {j.dorsal} — {j.nombre}
            </button>
          ))}
        </div>
      )}

      {paso === "entra" && (
        <div style={listaOpciones}>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>¿Quién entra?</p>
          {banco.map((j) => (
            <button key={j.jugadorId} style={botonOpcion} onClick={() => { setEntraId(j.jugadorId); setPaso("confirmar"); }}>
              {j.dorsal} — {j.nombre}
            </button>
          ))}
          <button style={botonSecundario} onClick={reset}>
            Cancelar
          </button>
        </div>
      )}

      {paso === "confirmar" && (
        <div>
          <p style={{ fontSize: "1.02rem" }}>
            Confirmar: sale <strong>{sale?.nombre}</strong>, entra <strong>{entra?.nombre}</strong>
          </p>
          {error && <p style={{ color: "crimson" }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={botonPrimario} disabled={isPending} onClick={confirmar}>
              {isPending ? "Publicando…" : "Publicar"}
            </button>
            <button style={botonSecundario} disabled={isPending} onClick={reset}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
