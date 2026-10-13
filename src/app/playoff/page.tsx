import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS_SUPERIOR } from "@/lib/categorias";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import { fixtureDivisionCompleto } from "@/lib/resultadosDivision/consultar";
import { posicionesClasificadas } from "@/lib/clasificacion";
import { PLAYOFF, fechaCorta } from "@/lib/playoff";
import type { FilaPosicion, PosicionesTorneo } from "@/types/firestore";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import { FuenteUrba } from "@/components/PieNota";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";
import { slugEquipo } from "@/lib/equipoSlug";

// Verde intenso con barra = ya clasificado (los demas no lo pueden alcanzar, mismo que la Tabla de
// Posiciones); amarillo = esta entre los 4 hoy pero todavia puede cambiar.
const bgHoy = "rgba(245,196,40,.95)";
const bgAsegurado = "rgba(70,196,106,.62)";
const barraAsegurado = "#46e07a";

function Equipo({ fila, categoriaId, alDia, segura, propio }: { fila: FilaPosicion | undefined; categoriaId: string; alDia: string | null; segura: boolean; propio: boolean }) {
  if (!fila) return null;
  const ancla = `?equipo=${encodeURIComponent(fila.equipo)}#eq-${slugEquipo(fila.equipo)}`;
  // Pastillas chicas dentro del recuadro: borde oscuro sobre el amarillo, claro sobre el verde.
  const pastilla: React.CSSProperties = {
    fontSize: "0.66rem",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 999,
    border: `1px solid ${segura ? "rgba(255,255,255,.7)" : "rgba(42,27,2,.6)"}`,
    color: "inherit",
    whiteSpace: "nowrap",
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: segura ? bgAsegurado : bgHoy,
        boxShadow: segura ? `inset 4px 0 0 ${barraAsegurado}` : undefined,
        borderRadius: 8,
        padding: "8px 10px",
        color: segura ? undefined : "#2a1b02",
        fontWeight: propio ? 700 : 500,
        fontSize: "0.9rem",
      }}
    >
      <span>
        {fila.posicion}° {fila.equipo}
      </span>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <Link href={`/posiciones/${categoriaId}${ancla}`} style={pastilla}>
            Tabla
          </Link>
          <Link href={`/fixture/${categoriaId}/cruces${ancla}`} style={pastilla}>
            Próx. fecha
          </Link>
        </div>
        <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.9, whiteSpace: "nowrap" }}>
          {segura || !alDia ? "Clasificado" : `Clasificado al ${alDia}`}
        </span>
      </div>
    </div>
  );
}

export default async function PlayoffPage() {
  const session = await getSession();
  const categorias = CATEGORIAS_SUPERIOR.filter((c) => PLAYOFF[c.id]);

  const datos = await Promise.all(
    categorias.map(async (cat) => {
      const snap = await adminDb.collection("posiciones").doc(cat.id).get();
      if (!snap.exists) return { cat, data: null, seguras: new Set<number>(), alDia: null as string | null };
      const data = snap.data() as PosicionesTorneo;
      const fechasDiv = tieneFixtureDivision(cat.id) ? await fixtureDivisionCompleto(cat.id) : undefined;
      const partidos = fechasDiv?.flatMap((f) => f.partidos);
      // "Clasificado al d/m": dia de la ultima fecha con algun resultado -- hasta ahi llega la tabla.
      const ultima = fechasDiv?.filter((f) => f.fecha && f.partidos.some((p) => p.jugado)).map((f) => f.fecha).sort().pop();
      const alDia = ultima ? `${Number(ultima.split("-")[2])}/${Number(ultima.split("-")[1])}` : null;
      return { cat, data, seguras: posicionesClasificadas(data.filas, 4, partidos), alDia };
    })
  );

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header rightLabel="Playoff" />

      <p style={{ fontSize: "0.82rem", color: DORADO_SUAVE, textAlign: "center", margin: "14px 0 4px", lineHeight: 1.4 }}>
        Los primeros 4 de cada tabla juegan las semifinales: 1° vs 4° y 2° vs 3°.
      </p>
      <p style={{ fontSize: "0.72rem", opacity: 0.7, textAlign: "center", margin: "0 0 14px" }}>
        Fechas y sedes informadas, a confirmar por URBA.
      </p>

      <div style={{ display: "grid", gap: 6, margin: "0 0 18px", fontSize: "0.7rem" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden style={{ width: 14, height: 12, background: bgAsegurado, boxShadow: `inset 4px 0 0 ${barraAsegurado}`, flexShrink: 0 }} />
          Clasificado: ya no lo pueden alcanzar
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden style={{ width: 14, height: 12, background: bgHoy, flexShrink: 0 }} />
          Clasificado hoy: está entre los 4 primeros, todavía puede cambiar
        </span>
      </div>

      {datos.map(({ cat, data, seguras, alDia }) => {
        const cfg = PLAYOFF[cat.id];
        const filaDe = (pos: number) => data?.filas.find((f) => f.posicion === pos);
        return (
          <section key={cat.id} style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: "1.05rem", color: DORADO, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>
              {cat.nombre}
            </h2>
            {cfg.sede && (
              <p style={{ fontSize: "0.76rem", opacity: 0.85, margin: "-4px 0 8px" }}>Sede: {cfg.sede}</p>
            )}
            {!data || data.filas.length < 4 ? (
              <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.82rem" }}>Todavía no hay tabla cargada.</p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {cfg.semis.map((s) => (
                  <div key={`${s.fecha ?? "sin-fecha"}-${s.cruce.join("v")}`} style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.8 }}>
                      Semifinal · {s.fecha ? fechaCorta(s.fecha) : "fecha a confirmar"}
                    </div>
                    {s.cruce.map((pos) => (
                      <Equipo key={pos} fila={filaDe(pos)} categoriaId={cat.id} alDia={alDia} segura={seguras.has(pos)} propio={filaDe(pos)?.equipo === data.nuestroEquipo} />
                    ))}
                  </div>
                ))}
                <div style={{ fontSize: "0.78rem", opacity: 0.85 }}>
                  Final: {cfg.final ? fechaCorta(cfg.final) : "fecha a confirmar"}
                </div>
              </div>
            )}
          </section>
        );
      })}

      <FuenteUrba />
    </main>
  );
}
