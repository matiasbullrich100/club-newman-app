"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setNumeroCancha } from "@/lib/match/actions";
import { botonSecundario } from "./estilos";
import { BORDO_OSC, CREMA, DORADO, DORADO_SUAVE } from "@/lib/colors";

export const CANTIDAD_CANCHAS = 5;

// Paso "cancha" de PateadorGate: 5 pastillas grandes (1 a 5). Al tocar una se guarda en
// `numeroCancha` del partido (el mismo dato que carga el manager desde /programar) y de ahi sale
// en el resumen de la fecha y en el detalle del partido. `actual` = lo que ya hay guardado (lo
// carga el club con anticipacion, ej. Primera = 1): viene marcada pero igual hay que tocarla para
// confirmar. "Todavia no se" BORRA la cancha (si habia una cargada, deja de mostrarse en todos lados)
// y no frena el partido.
export default function ElegirCancha({
  partidoId,
  actual,
  onElegida,
}: {
  partidoId: string;
  actual?: string | null;
  onElegida: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function elegir(numero: string | null) {
    setError(null);
    startTransition(async () => {
      try {
        await setNumeroCancha(partidoId, numero);
        onElegida();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: "1rem" }}>
      <h3 style={{ fontSize: "1rem", margin: "0 0 0.5rem", color: DORADO, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Cancha
      </h3>
      <p style={{ margin: "0 0 12px", fontSize: "0.92rem" }}>¿En qué cancha se juega?</p>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${CANTIDAD_CANCHAS}, 1fr)`, gap: 8 }}>
        {Array.from({ length: CANTIDAD_CANCHAS }, (_, i) => String(i + 1)).map((n) => {
          const marcada = actual === n;
          return (
            <button
              key={n}
              disabled={isPending}
              onClick={() => elegir(n)}
              aria-pressed={marcada}
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                minHeight: 64,
                borderRadius: 14,
                color: marcada ? BORDO_OSC : CREMA,
                background: marcada ? DORADO : "rgba(255,255,255,.06)",
                border: `1px solid ${marcada ? DORADO : "rgba(226,197,120,.35)"}`,
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      <button
        style={{ ...botonSecundario, fontSize: "0.78rem", marginTop: 12 }}
        disabled={isPending}
        onClick={() => elegir(null)}
      >
        Todavía no sé
      </button>
      {actual && (
        <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: DORADO_SUAVE }}>Cargada hasta ahora: cancha {actual}.</p>
      )}
    </div>
  );
}
