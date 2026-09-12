"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retomar2T } from "@/lib/match/actions";
import { DORADO_SUAVE } from "@/lib/colors";

// Para cuando se aprieta "Terminar partido" por error estando todavia en el 2do tiempo (ver
// retomar2T() en lib/match/actions.ts) -- vuelve el partido a "en_juego" en el 2do tiempo, con el
// reloj retomando desde donde se corto.
export default function Retomar2TButton({ partidoId }: { partidoId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function confirmar() {
    setError(null);
    startTransition(async () => {
      try {
        await retomar2T(partidoId);
        setConfirmando(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo reiniciar");
      }
    });
  }

  return (
    <div style={{ textAlign: "center", margin: "10px 0" }}>
      {confirmando ? (
        <>
          <span style={{ color: DORADO_SUAVE, fontSize: "0.8rem", marginRight: 8 }}>
            ¿Reiniciar el 2do tiempo? (no había terminado)
          </span>
          <button disabled={isPending} onClick={confirmar}>
            {isPending ? "Reiniciando…" : "Confirmar"}
          </button>{" "}
          <button disabled={isPending} onClick={() => setConfirmando(false)}>
            Cancelar
          </button>
        </>
      ) : (
        <button
          style={{
            fontSize: "0.72rem",
            padding: "6px 12px",
            borderRadius: 20,
            background: "transparent",
            border: "1px solid rgba(226,197,120,.35)",
            color: DORADO_SUAVE,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
          onClick={() => setConfirmando(true)}
        >
          Reiniciar 2do tiempo
        </button>
      )}
      {error && <p style={{ color: "#f3caca", fontSize: "0.8rem" }}>{error}</p>}
    </div>
  );
}
