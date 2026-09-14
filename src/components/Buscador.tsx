"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIAS, EDADES } from "@/lib/categorias";
import { DORADO, DORADO_SUAVE, TINTA } from "@/lib/colors";

interface Resultado {
  label: string;
  detalle: string;
  href: string;
}

// Indice estatico (categorias/edades no cambian en runtime) -- Plantel Superior (11 categorias),
// Juveniles por edad (M15/M16/M17/M19, lleva a /juveniles/[edad]) y Juveniles por equipo
// (M15 A, M15 B, ... lleva directo a /juveniles/[edad]/equipo/[id]). Asi buscar "m15" desde
// cualquier pantalla (ej. estando en Pre B) lleva directo, sin tener que ir a /juveniles primero.
const INDICE: Resultado[] = [
  ...CATEGORIAS.filter((c) => c.grupo === "superior").map((c) => ({
    label: c.nombre,
    detalle: "Plantel Superior",
    href: `/categoria/${c.id}`,
  })),
  ...EDADES.map((e) => ({ label: e.nombre, detalle: "Juveniles", href: `/juveniles/${e.id}` })),
  ...CATEGORIAS.filter((c) => c.grupo === "juveniles").map((c) => ({
    label: c.nombre,
    detalle: `Juveniles ${EDADES.find((e) => e.id === c.edadId)?.nombre ?? ""}`,
    href: `/juveniles/${c.edadId}/equipo/${c.id}`,
  })),
];

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

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

// `flotante`: la pastilla se posiciona sola (fixed, mismo lugar que el stack Inicio/Atrás) --
// para paginas sin BackLink (ej. Home). En el resto, va apilada adentro del `<div position:fixed>`
// que ya arma BackLink, asi que no necesita posicionarse por su cuenta.
export default function Buscador({ flotante = false }: { flotante?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const resultados = useMemo(() => {
    const q = normalizar(query);
    if (!q) return [];
    return INDICE.filter((r) => normalizar(r.label).includes(q) || normalizar(r.detalle).includes(q)).slice(0, 8);
  }, [query]);

  function ir(href: string) {
    setAbierto(false);
    setQuery("");
    router.push(href);
  }

  function abrir() {
    setAbierto(true);
    // El input todavia no esta montado en este mismo tick -- un frame despues ya esta.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <>
      {flotante ? (
        <div style={{ position: "fixed", top: 12, left: 12, zIndex: 100 }}>
          <button onClick={abrir} style={pastilla} aria-label="Buscar">
            🔍 Buscar
          </button>
        </div>
      ) : (
        <button onClick={abrir} style={pastilla} aria-label="Buscar">
          🔍 Buscar
        </button>
      )}

      {abierto && (
        <div
          onClick={() => setAbierto(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,.6)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "60px 16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 10 }}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setAbierto(false);
                if (e.key === "Enter" && resultados[0]) ir(resultados[0].href);
              }}
              placeholder="Buscar categoría o equipo (ej. M15, Pre B)..."
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 10,
                border: `2px solid ${DORADO}`,
                background: TINTA,
                color: "#f7f1e4",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
            />
            {query && (
              <div style={{ background: TINTA, border: "1px solid rgba(226,197,120,.3)", borderRadius: 10, overflow: "hidden" }}>
                {resultados.length === 0 ? (
                  <p style={{ padding: 16, margin: 0, color: DORADO_SUAVE, fontSize: "0.85rem", fontStyle: "italic" }}>
                    Sin resultados.
                  </p>
                ) : (
                  resultados.map((r) => (
                    <button
                      key={r.href}
                      onClick={() => ir(r.href)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                        padding: "12px 16px",
                        background: "transparent",
                        border: "none",
                        borderBottom: "1px solid rgba(226,197,120,.15)",
                        color: "#f7f1e4",
                        fontSize: "0.95rem",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{r.label}</span>
                      <span style={{ fontSize: "0.72rem", color: DORADO_SUAVE, opacity: 0.8 }}>{r.detalle}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
