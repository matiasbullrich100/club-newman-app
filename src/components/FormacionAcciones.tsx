"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { publicarFormacion } from "@/lib/match/actions";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";
import type { EstadoSubida } from "@/lib/match/estadoFormaciones";

const botonBase: React.CSSProperties = {
  fontSize: "0.62rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  padding: "5px 9px",
  borderRadius: 7,
  border: "1px solid rgba(226,197,120,.4)",
  color: DORADO_SUAVE,
  background: "transparent",
  whiteSpace: "nowrap",
  cursor: "pointer",
  textDecoration: "none",
  lineHeight: 1,
};

export default function FormacionAcciones({
  partidoId,
  estado,
}: {
  partidoId: string;
  estado: EstadoSubida;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // "Publicar" solo tiene sentido si hay una formación cargada y todavía en borrador.
  const puedePublicar = estado === "borrador";

  function publicar() {
    setError(null);
    startTransition(async () => {
      try {
        await publicarFormacion(partidoId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo publicar");
      }
    });
  }

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flex: "0 0 auto" }}>
      <Link href={`/partido/${partidoId}`} style={botonBase}>
        Subir
      </Link>
      <button
        type="button"
        onClick={publicar}
        disabled={!puedePublicar || isPending}
        style={{
          ...botonBase,
          opacity: puedePublicar && !isPending ? 1 : 0.4,
          cursor: puedePublicar && !isPending ? "pointer" : "default",
          ...(puedePublicar ? { borderColor: DORADO, color: DORADO } : {}),
        }}
        title={puedePublicar ? "Publicar esta formación" : "No hay una formación en borrador"}
      >
        {isPending ? "…" : "Publicar"}
      </button>
      {error && <span style={{ fontSize: "0.6rem", color: "#f3caca" }}>{error}</span>}
    </div>
  );
}
