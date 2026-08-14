"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publicarFormacion } from "@/lib/match/actions";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

export default function PublicarFormacionButton({ partidoId }: { partidoId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function confirmar() {
    setError(null);
    startTransition(async () => {
      try {
        await publicarFormacion(partidoId);
        setConfirmando(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo publicar");
      }
    });
  }

  return (
    <div style={{ textAlign: "center", margin: "10px 0" }}>
      {confirmando ? (
        <>
          <span style={{ color: DORADO_SUAVE, fontSize: "0.8rem", marginRight: 8 }}>
            ¿Publicar la formación? Va a quedar visible para todos.
          </span>
          <button disabled={isPending} onClick={confirmar}>
            {isPending ? "Publicando…" : "Confirmar"}
          </button>{" "}
          <button disabled={isPending} onClick={() => setConfirmando(false)}>
            Cancelar
          </button>
        </>
      ) : (
        <button
          style={{
            fontSize: "0.85rem",
            padding: "10px 18px",
            borderRadius: 8,
            background: DORADO,
            border: "none",
            color: "#3a0f1c",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            cursor: "pointer",
          }}
          onClick={() => setConfirmando(true)}
        >
          Publicar formación
        </button>
      )}
      {error && <p style={{ color: "#f3caca", fontSize: "0.8rem" }}>{error}</p>}
    </div>
  );
}
