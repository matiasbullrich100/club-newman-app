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

// Una semifinal en UNA linea: "vie 30/10 | 1° Newman vs 4° Alumni". Verde = los dos ya son clasificados
// definitivos; amarillo = la tabla todavia es provisoria. El equipo del club va en negrita; cada nombre lleva a su
// lugar en la Tabla de Posiciones.
function Cruce({
  categoriaId,
  fecha,
  a,
  b,
  seguro,
  propio,
}: {
  categoriaId: string;
  fecha?: string;
  a: FilaPosicion | undefined;
  b: FilaPosicion | undefined;
  seguro: boolean;
  propio?: string;
}) {
  if (!a || !b) return null;
  const equipo = (f: FilaPosicion) => (
    <Link
      href={`/posiciones/${categoriaId}?equipo=${encodeURIComponent(f.equipo)}#eq-${slugEquipo(f.equipo)}`}
      style={{ color: "inherit", fontWeight: f.equipo === propio ? 800 : 500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
    >
      {f.posicion}° {f.equipo}
    </Link>
  );
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "62px 1fr",
        alignItems: "center",
        gap: 8,
        background: seguro ? bgAsegurado : bgHoy,
        boxShadow: seguro ? `inset 4px 0 0 ${barraAsegurado}` : undefined,
        color: seguro ? undefined : "#2a1b02",
        borderRadius: 6,
        padding: "8px 10px",
        fontSize: "0.88rem",
      }}
    >
      <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: 0.3, opacity: 0.85, lineHeight: 1.2 }}>
        {fecha ? fechaCorta(fecha) : "a confirmar"}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        {equipo(a)}
        <span style={{ fontSize: "0.68rem", opacity: 0.75, textTransform: "uppercase", flexShrink: 0 }}>vs</span>
        {equipo(b)}
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
      if (!snap.exists) return { cat, data: null, seguras: new Set<number>(), completa: false };
      const data = snap.data() as PosicionesTorneo;
      const fechasDiv = tieneFixtureDivision(cat.id) ? await fixtureDivisionCompleto(cat.id) : undefined;
      const partidos = fechasDiv?.flatMap((f) => f.partidos);
      // Fase regular terminada para toda la tabla (todos jugaron lo mismo): los 4 primeros ya son los
      // clasificados definitivos y los cruces son reales. Si faltan partidos, la tabla es provisoria.
      const completa = data.filas.length > 0 && data.filas.every((x) => x.jugados === data.filas[0].jugados);
      const seguras = completa ? new Set(data.filas.slice(0, 4).map((x) => x.posicion)) : posicionesClasificadas(data.filas, 4, partidos);
      return { cat, data, seguras, completa };
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

      {datos.map(({ cat, data, seguras, completa }) => {
        const cfg = PLAYOFF[cat.id];
        const filaDe = (pos: number) => data?.filas.find((f) => f.posicion === pos);
        return (
          <section key={cat.id} style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: "1.05rem", color: DORADO, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>
              {cat.nombre}
            </h2>
            <p style={{ fontSize: "0.72rem", opacity: 0.8, margin: "0 0 6px" }}>
              {[cfg.sede && `Sede: ${cfg.sede}`, `Final: ${cfg.final ? fechaCorta(cfg.final) : "a confirmar"}`, !completa && data ? "tabla provisoria" : null].filter(Boolean).join(" · ")}
            </p>
            {!data || data.filas.length < 4 ? (
              <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.82rem" }}>Todavía no hay tabla cargada.</p>
            ) : (
              <div style={{ display: "grid", gap: 4 }}>
                {cfg.semis.map((s) => (
                  <Cruce
                    key={`${s.fecha ?? "sin-fecha"}-${s.cruce.join("v")}`}
                    categoriaId={cat.id}
                    fecha={s.fecha}
                    a={filaDe(s.cruce[0])}
                    b={filaDe(s.cruce[1])}
                    seguro={seguras.has(s.cruce[0]) && seguras.has(s.cruce[1])}
                    propio={data.nuestroEquipo}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <FuenteUrba />
    </main>
  );
}
