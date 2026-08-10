"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetearPartidoDemo } from "@/lib/match/actions";
import { DORADO_SUAVE } from "@/lib/colors";

export default function ResetDemoButton({ partidoId, label }: { partidoId: string; label?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function confirmar() {
    setError(null);
    startTransition(async () => {
      try {
        await resetearPartidoDemo(partidoId);
        setConfirmando(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo resetear");
      }
    });
  }

  return (
    <div style={{ textAlign: "center", margin: "10px 0" }}>
      {confirmando ? (
        <>
          <span style={{ color: DORADO_SUAVE, fontSize: "0.8rem", marginRight: 8 }}>¿Resetear el partido de prueba a 0-0?</span>
          <button disabled={isPending} onClick={confirmar}>
            {isPending ? "Reseteando…" : "Confirmar"}
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
          Resetear {label ?? "partido de prueba"}
        </button>
      )}
      {error && <p style={{ color: "#f3caca", fontSize: "0.8rem" }}>{error}</p>}
    </div>
  );
}
