"use client";

import { useEffect } from "react";

// Último recurso: error dentro del layout raíz (tiene que traer su propio <html>/<body>). Casi
// siempre es un deploy nuevo con la pestaña abierta -> recarga sola una vez.
export default function GlobalError() {
  useEffect(() => {
    try {
      if (!sessionStorage.getItem("globalAutoReload")) {
        sessionStorage.setItem("globalAutoReload", "1");
        window.location.reload();
      }
    } catch {
      /* sessionStorage bloqueado: queda el botón manual */
    }
  }, []);

  return (
    <html lang="es-AR">
      <body style={{ margin: 0, background: "#451526", color: "#f7f1e4", fontFamily: "Arial, sans-serif" }}>
        <main style={{ maxWidth: 480, margin: "0 auto", padding: "80px 16px", textAlign: "center" }}>
          <p style={{ fontSize: "1rem", marginBottom: 20 }}>Se actualizó la app. Recargando…</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "14px 28px",
              borderRadius: 10,
              border: "none",
              background: "#e2c578",
              color: "#451526",
              fontWeight: 700,
              fontSize: "1rem",
              textTransform: "uppercase",
              letterSpacing: 1,
              cursor: "pointer",
            }}
          >
            Recargar ahora
          </button>
        </main>
      </body>
    </html>
  );
}
