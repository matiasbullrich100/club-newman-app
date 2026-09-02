"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

// Barra horizontal para saltar de un equipo a otro sin volver atrás (ej. M15 A -> M15 B -> M15 C).
// La actual queda resaltada y se centra sola; en compu, las flechas ←/→ mueven al anterior/siguiente.
// `equipos` ya viene con el href armado (props de un Server Component no pueden ser funciones).
export default function TiraEquipos({
  equipos,
  actualId,
}: {
  equipos: { id: string; nombre: string; href: string }[];
  actualId: string;
}) {
  const router = useRouter();
  const activoRef = useRef<HTMLAnchorElement | null>(null);

  // Centrar el chip activo (puede estar fuera de pantalla si la lista es larga).
  useEffect(() => {
    activoRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [actualId]);

  // Flechas del teclado (compu) -- salvo que se esté escribiendo en un campo.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const i = equipos.findIndex((eq) => eq.id === actualId);
      if (i === -1) return;
      const j = e.key === "ArrowLeft" ? i - 1 : i + 1;
      if (j < 0 || j >= equipos.length) return;
      e.preventDefault();
      router.push(equipos[j].href);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [equipos, actualId, router]);

  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        margin: "10px 0 4px",
        paddingBottom: 2,
      }}
    >
      {equipos.map((eq) => {
        const activo = eq.id === actualId;
        return (
          <Link
            key={eq.id}
            ref={activo ? activoRef : undefined}
            href={eq.href}
            replace
            aria-current={activo ? "page" : undefined}
            style={{
              flex: "0 0 auto",
              padding: "7px 14px",
              borderRadius: 999,
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              whiteSpace: "nowrap",
              border: `1px solid ${activo ? DORADO : "rgba(226,197,120,.4)"}`,
              background: activo ? DORADO : "transparent",
              color: activo ? "#451526" : DORADO_SUAVE,
            }}
          >
            {eq.nombre}
          </Link>
        );
      })}
    </div>
  );
}
