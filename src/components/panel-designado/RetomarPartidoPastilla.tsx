"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retomarPartido } from "@/lib/match/actions";
import { botonOpcion, botonPrimario, botonSecundario } from "./estilos";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

// Pastilla "Reiniciar partido" del menu de jugadas de "Corregir el partido": para cuando se aprieta "Terminar
// partido" por error (ver retomarPartido() en lib/match/actions.ts) -- el partido vuelve a donde estaba (1er
// tiempo, entretiempo o 2do tiempo) y el reloj retoma desde donde se corto. Pide confirmacion antes.
export default function RetomarPartidoPastilla({ partidoId }: { partidoId: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function confirmar() {
    setError(null);
    startTransition(async () => {
      try {
        await retomarPartido(partidoId);
        setConfirmando(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo reiniciar el partido");
      }
    });
  }

  return (
    <>
      <button
        style={{ ...botonOpcion, textAlign: "center", ...(confirmando ? { borderColor: DORADO } : {}) }}
        aria-expanded={confirmando}
        onClick={() => setConfirmando((v) => !v)}
      >
        Reiniciar partido
      </button>
      {confirmando && (
        <div style={{ gridColumn: "1 / -1", display: "grid", gap: 8 }}>
          <p style={{ margin: 0, color: DORADO_SUAVE, fontSize: "0.9rem" }}>
            ¿Retomar el partido donde quedó? (se había terminado por error)
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={botonPrimario} disabled={isPending} onClick={confirmar}>
              {isPending ? "Reiniciando…" : "Confirmar"}
            </button>
            <button style={botonSecundario} disabled={isPending} onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
          </div>
          {error && <p style={{ margin: 0, color: "crimson" }}>{error}</p>}
        </div>
      )}
    </>
  );
}
