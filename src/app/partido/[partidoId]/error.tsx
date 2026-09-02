"use client";

import { useEffect } from "react";
import { DORADO, CREMA } from "@/lib/colors";

// Casi siempre este error es un desajuste de versión: se publicó una versión nueva de la app
// mientras la página del partido estaba abierta, y el `router.refresh()` de después de cargar una
// incidencia trae un árbol que el código viejo del celular ya no puede reconciliar (el famoso
// "Minified React error #441"). Recargar una vez toma los archivos nuevos y sigue todo normal.
// El Designado no debería quedarse mirando un error críptico a mitad de partido -> se recarga solo
// (una vez cada 20s como mucho, por si fuera un error de verdad y no queremos un loop).
export default function ErrorPartido({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    try {
      const ultima = Number(sessionStorage.getItem("partidoAutoReload") ?? 0);
      if (Date.now() - ultima > 20000) {
        sessionStorage.setItem("partidoAutoReload", String(Date.now()));
        window.location.reload();
      }
    } catch {
      /* sessionStorage bloqueado (modo privado): no pasa nada, queda el botón manual */
    }
  }, []);

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "80px 16px", textAlign: "center", color: CREMA }}>
      <p style={{ fontSize: "1rem", lineHeight: 1.5, marginBottom: 22 }}>
        Hubo un problema al actualizar la pantalla del partido.
        <br />
        Suele pasar cuando se publicó una versión nueva. Recargá para seguir.
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
      <p style={{ marginTop: 18, fontSize: "0.75rem", opacity: 0.6 }}>
        Si sigue apareciendo, cerrá la pestaña y volvé a entrar desde el link.
      </p>
    </main>
  );
}
