"use client";

import { useRouter } from "next/navigation";
import { DORADO } from "@/lib/colors";

const pastilla: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontWeight: 700,
  fontSize: "0.78rem",
  letterSpacing: 1,
  textTransform: "uppercase",
  color: DORADO,
  background: "rgba(53,9,22,.92)",
  border: `2px solid ${DORADO}`,
  padding: "5px 10px",
  borderRadius: 20,
};

// "Atrás" retrocede UN paso en el historial real del navegador (asi Primera -> Tabla de
// posiciones -> Atrás vuelve a Primera, no al listado de Plantel Superior) -- pedido explicito
// del club, valido para todas las pantallas. `href` es solo el fallback para cuando esta pagina
// es la primera de la pestaña (llegada por link externo/directo), sin nada antes en el historial.
//
// "Inicio" va arriba de "Atrás" (apiladas), para no tener que apretar "Atrás" muchas veces cuando
// querés cambiar de division (ej. de la tabla de M15 B a Pre A).
export default function BackLink({ href }: { href: string }) {
  const router = useRouter();

  return (
    <div style={{ position: "fixed", top: 12, left: 12, zIndex: 100, display: "flex", flexDirection: "column", gap: 6 }}>
      <button onClick={() => router.push("/")} style={pastilla}>
        Inicio
      </button>
      <button
        onClick={() => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
          } else {
            router.push(href);
          }
        }}
        style={pastilla}
      >
        ← Atrás
      </button>
    </div>
  );
}
