"use client";

import { useState, useTransition } from "react";
import { setNumeroCancha } from "@/lib/match/actions";
import { CANTIDAD_CANCHAS } from "./ElegirCancha";
import { botonSecundario } from "./estilos";
import { BORDO_OSC, CREMA, DORADO } from "@/lib/colors";

// Desplegable de la pastilla "Cancha" del menu de jugadas (CargaIncidencia, junto al +60"): para el
// designado que arranco el partido sin saber la cancha ("Todavia no se" en ElegirCancha) o que se
// equivoco. 5 pastillas (1-5); tocar una la guarda y cierra. Escribe el mismo `numeroCancha` que
// el paso previo (se ve en el resumen y en el detalle, en vivo via onSnapshot). "Quitar cancha"
// la borra. `actual` es el valor en vivo del partido.
export default function CanchaEnVivo({
  partidoId,
  actual,
  onListo,
}: {
  partidoId: string;
  actual?: string | null;
  onListo: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function elegir(numero: string | null) {
    setError(null);
    startTransition(async () => {
      try {
        await setNumeroCancha(partidoId, numero);
        onListo();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  return (
    <div style={{ marginTop: 10 }}>
      <p style={{ margin: "0 0 8px", fontSize: "0.92rem" }}>¿En qué cancha se juega?</p>
      {error && <p style={{ color: "crimson", margin: "0 0 8px" }}>{error}</p>}
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
                fontSize: "1.4rem",
                fontWeight: 800,
                minHeight: 58,
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
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {actual && (
          <button style={{ ...botonSecundario, fontSize: "0.78rem" }} disabled={isPending} onClick={() => elegir(null)}>
            Quitar cancha
          </button>
        )}
        <button style={{ ...botonSecundario, fontSize: "0.78rem" }} disabled={isPending} onClick={onListo}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
