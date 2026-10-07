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
import { FuenteUrba, Seuo } from "@/components/PieNota";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

// Verde intenso con barra = ya clasificado (los demas no lo pueden alcanzar, mismo que la Tabla de
// Posiciones); amarillo = esta entre los 4 hoy pero todavia puede cambiar.
const bgHoy = "rgba(245,196,40,.95)";
const bgAsegurado = "rgba(70,196,106,.62)";
const barraAsegurado = "#46e07a";

function Equipo({ fila, segura, propio }: { fila: FilaPosicion | undefined; segura: boolean; propio: boolean }) {
  if (!fila) return null;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
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
      <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.9, whiteSpace: "nowrap" }}>
        {segura ? "Clasificado" : "Clasificado hoy"}
      </span>
    </div>
  );
}

export default async function PlayoffPage() {
  const session = await getSession();
  const categorias = CATEGORIAS_SUPERIOR.filter((c) => PLAYOFF[c.id]);

  const datos = await Promise.all(
    categorias.map(async (cat) => {
      const snap = await adminDb.collection("posiciones").doc(cat.id).get();
      if (!snap.exists) return { cat, data: null, seguras: new Set<number>() };
      const data = snap.data() as PosicionesTorneo;
      const partidos = tieneFixtureDivision(cat.id) ? (await fixtureDivisionCompleto(cat.id)).flatMap((f) => f.partidos) : undefined;
      return { cat, data, seguras: posicionesClasificadas(data.filas, 4, partidos) };
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

      {datos.map(({ cat, data, seguras }) => {
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
                      <Equipo key={pos} fila={filaDe(pos)} segura={seguras.has(pos)} propio={filaDe(pos)?.equipo === data.nuestroEquipo} />
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
      <Seuo />
    </main>
  );
}
