"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reiniciarPartido } from "@/lib/match/actions";
import { DORADO_SUAVE } from "@/lib/colors";

export default function ReiniciarPartidoButton({ partidoId }: { partidoId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function confirmar() {
    setError(null);
    startTransition(async () => {
      try {
        await reiniciarPartido(partidoId);
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
            ¿Reiniciar este partido? Se borra el resultado y todas las incidencias cargadas.
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
          Reiniciar partido
        </button>
      )}
      {error && <p style={{ color: "#f3caca", fontSize: "0.8rem" }}>{error}</p>}
    </div>
  );
}
