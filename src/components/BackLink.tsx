"use client";

import { useRouter } from "next/navigation";
import { DORADO } from "@/lib/colors";

// "Atrás" retrocede UN paso en el historial real del navegador (asi Primera -> Tabla de
// posiciones -> Atrás vuelve a Primera, no al listado de Plantel Superior) -- pedido explicito
// del club, valido para todas las pantallas. `href` es solo el fallback para cuando esta pagina
// es la primera de la pestaña (llegada por link externo/directo), sin nada antes en el historial.
export default function BackLink({ href }: { href: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(href);
        }
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontWeight: 700,
        fontSize: "0.78rem",
        letterSpacing: 1,
        textTransform: "uppercase",
        color: DORADO,
        position: "fixed",
        top: 12,
        left: 12,
        zIndex: 100,
        background: "rgba(53,9,22,.92)",
        border: `2px solid ${DORADO}`,
        padding: "5px 10px",
        borderRadius: 20,
        width: "fit-content",
      }}
    >
      ← Atrás
    </button>
  );
}
