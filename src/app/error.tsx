"use client";

import { useEffect } from "react";
import { DORADO, CREMA } from "@/lib/colors";

// Boundary genérico para cualquier ruta bajo app/ (la del partido tiene la suya propia). Mismo
// criterio: el error más común es un desajuste de versión tras un deploy con la página abierta
// ("Minified React error #4xx") -> se recarga solo UNA vez por sesión y deja un botón manual.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    try {
      if (!sessionStorage.getItem("appAutoReload")) {
        sessionStorage.setItem("appAutoReload", "1");
        window.location.reload();
      }
    } catch {
      /* sessionStorage bloqueado: queda el botón manual */
    }
  }, []);

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "80px 16px", textAlign: "center", color: CREMA }}>
      <p style={{ fontSize: "1rem", lineHeight: 1.5, marginBottom: 22 }}>
        Algo falló al cargar esta pantalla. Suele arreglarse recargando.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "14px 28px",
            borderRadius: 10,
            border: "none",
            background: DORADO,
            color: "#451526",
            fontWeight: 700,
            fontSize: "1rem",
            textTransform: "uppercase",
            letterSpacing: 1,
            cursor: "pointer",
          }}
        >
          Recargar
        </button>
        <button
          onClick={() => reset()}
          style={{
            padding: "14px 22px",
            borderRadius: 10,
            border: `1px solid ${DORADO}`,
            background: "transparent",
            color: CREMA,
            fontWeight: 700,
            fontSize: "0.85rem",
            textTransform: "uppercase",
            letterSpacing: 1,
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
