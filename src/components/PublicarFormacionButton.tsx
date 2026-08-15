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

  // Fijo abajo del todo (bottom:12, igual que BackLink arriba con top:12) -- el manager suele
  // revisar toda la formacion antes de publicar, y sin esto el boton se perdia scrolleando la
  // lista. right:95 en vez de 0 para no pisar el control de tamaño de letra, tambien fijo pero
  // en la esquina inferior derecha (ver FontSizeControl.tsx).
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 95,
        bottom: 12,
        zIndex: 100,
        display: "flex",
        justifyContent: "center",
        padding: "0 16px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          background: "rgba(53,9,22,.92)",
          border: `2px solid ${DORADO}`,
          borderRadius: 20,
          padding: confirmando ? "10px 16px" : 4,
          maxWidth: 480,
        }}
      >
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
              borderRadius: 16,
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
        {error && <p style={{ color: "#f3caca", fontSize: "0.8rem", margin: "4px 0 0" }}>{error}</p>}
      </div>
    </div>
  );
}
