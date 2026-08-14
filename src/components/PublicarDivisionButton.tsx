"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publicarFormacionesGrupo } from "@/lib/match/actions";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

const botonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: 1,
  fontSize: "0.82rem",
  fontWeight: 700,
  padding: "14px 10px",
  borderRadius: 10,
  border: "none",
  color: "#3a0f1c",
  background: DORADO,
  cursor: "pointer",
};

export default function PublicarDivisionButton({ grupo, label }: { grupo: string; label: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function confirmar() {
    setError(null);
    startTransition(async () => {
      try {
        const { publicados } = await publicarFormacionesGrupo(grupo);
        setConfirmando(false);
        setMensaje(publicados > 0 ? `${publicados} formación(es) publicada(s).` : "No había formaciones pendientes.");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo publicar");
      }
    });
  }

  if (confirmando) {
    return (
      <div style={{ textAlign: "center", fontSize: "0.75rem", color: DORADO_SUAVE }}>
        ¿Publicar todas las formaciones pendientes de {label}?
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 6 }}>
          <button disabled={isPending} onClick={confirmar}>
            {isPending ? "Publicando…" : "Confirmar"}
          </button>
          <button disabled={isPending} onClick={() => setConfirmando(false)}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        style={botonStyle}
        onClick={() => {
          setMensaje(null);
          setConfirmando(true);
        }}
      >
        Subir {label}
      </button>
      {mensaje && <p style={{ fontSize: "0.7rem", color: DORADO_SUAVE, textAlign: "center", margin: "4px 0 0" }}>{mensaje}</p>}
      {error && <p style={{ fontSize: "0.7rem", color: "#f3caca", textAlign: "center", margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}
