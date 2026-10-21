import Link from "next/link";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";
import { fechaCorta } from "@/lib/playoff";
import { slugEquipo } from "@/lib/equipoSlug";
import type { ClasificadoNewman, EquipoClasificado } from "@/lib/clasificadosNewman";

// "Clasificados a playoff · Top 14", todo en una pantalla y en orden cronologico: una tarjeta por division con su
// dia y sede a la izquierda, y las dos semifinales (1° vs 4° y 2° vs 3°) con su horario. El equipo de Newman va en
// amarillo y cada nombre lleva a su lugar en la Tabla de Posiciones. Primera: horarios a confirmar.
export default function TablaClasificadosTop14({ filas }: { filas: ClasificadoNewman[] }) {
  const chip = (categoriaId: string, e: EquipoClasificado) => (
    <Link
      href={`/posiciones/${categoriaId}?equipo=${encodeURIComponent(e.equipo)}#eq-${slugEquipo(e.equipo)}`}
      style={{
        flex: 1,
        minWidth: 0,
        background: e.propio ? "#f5a800" : "rgba(0,0,0,.2)",
        color: e.propio ? "#2a1b02" : "inherit",
        fontWeight: e.propio ? 800 : 500,
        borderRadius: 5,
        padding: "4px 5px",
        fontSize: "0.74rem",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {e.posicion}° {e.equipo}
    </Link>
  );

  return (
    <div style={{ textAlign: "left" }}>
      <div style={{ textAlign: "center", fontWeight: 800, color: DORADO, fontSize: "1.25rem", lineHeight: 1.2 }}>Clasificados a playoff · Top 14</div>
      <div style={{ textAlign: "center", marginTop: 4, fontSize: "0.68rem", letterSpacing: 1, textTransform: "uppercase", color: DORADO_SUAVE }}>
        URBA · Torneo 2026 · Semifinales
      </div>
      <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
        {filas.map((f) => {
          const dias = [...new Set(f.cruces.map((c) => c.fecha).filter(Boolean))] as string[];
          return (
            <div
              key={f.categoriaId}
              style={{
                display: "grid",
                gridTemplateColumns: "74px 1fr",
                gap: 8,
                background: "rgba(70,196,106,.62)",
                boxShadow: "inset 4px 0 0 #46e07a",
                borderRadius: 8,
                padding: "7px 8px 7px 12px",
              }}
            >
              <div style={{ display: "grid", alignContent: "center", gap: 1 }}>
                <span style={{ fontWeight: 800, fontSize: "0.95rem", lineHeight: 1.1 }}>{f.categoria}</span>
                {dias.length > 0 && (
                  <span style={{ fontSize: "0.64rem", textTransform: "uppercase", letterSpacing: 0.3, opacity: 0.95, lineHeight: 1.2 }}>
                    {dias.map((d) => fechaCorta(d)).join(" y ")}
                  </span>
                )}
                {f.sede && <span style={{ fontSize: "0.64rem", textTransform: "uppercase", letterSpacing: 0.3, opacity: 0.8 }}>{f.sede}</span>}
                {f.provisoria && <span style={{ fontSize: "0.56rem", fontStyle: "italic", opacity: 0.8 }}>provisoria</span>}
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                {f.cruces.map((c) => (
                  <div key={`${c.a.posicion}v${c.b.posicion}`} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 34, flexShrink: 0, fontSize: "0.7rem", fontWeight: 700, opacity: 0.95 }}>{c.hora ?? "a conf."}</span>
                    {chip(f.categoriaId, c.a)}
                    <span style={{ fontSize: "0.6rem", opacity: 0.75, textTransform: "uppercase" }}>vs</span>
                    {chip(f.categoriaId, c.b)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: "center", marginTop: 10, fontSize: "0.68rem", opacity: 0.75 }}>Posición según la última tabla de URBA.</div>
    </div>
  );
}
