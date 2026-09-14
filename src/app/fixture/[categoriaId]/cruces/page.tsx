import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS, grupoDeCategoria } from "@/lib/categorias";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import { fixtureDivisionCompleto } from "@/lib/resultadosDivision/consultar";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import TiraEquipos from "@/components/TiraEquipos";
import TablaCruces from "@/components/TablaCruces";
import { FuenteUrba } from "@/components/PieNota";
import { equiposParaTira } from "@/lib/tiraEquipos";
import { DORADO, DORADO_SUAVE, TINTA } from "@/lib/colors";

const botonEstilo: React.CSSProperties = {
  flex: 1,
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  fontSize: "0.7rem",
  fontWeight: 700,
  padding: "9px 4px",
  borderRadius: 8,
  border: "1px solid rgba(226,197,120,.4)",
  color: DORADO_SUAVE,
};
const botonActivo: React.CSSProperties = { ...botonEstilo, background: DORADO, color: TINTA, border: `1px solid ${DORADO}` };

// Vista "Cruces" -- grilla de doble entrada (quién jugó contra quién y cómo salió) + "lo que le
// queda a cada uno, en orden". 4ª vista alternativa de la división, al lado de Tabla / Fixt. Newm.
// / Fixt División. Plantel Superior y Juveniles (cada letra tiene su propia zona en URBA -- ver
// CATEGORIAS_CON_FIXTURE_DIVISION en lib/fixtureDivision.ts).
export default async function CrucesPage({ params }: { params: Promise<{ categoriaId: string }> }) {
  const { categoriaId } = await params;
  const categoria = CATEGORIAS.find((c) => c.id === categoriaId);
  if (!categoria || !tieneFixtureDivision(categoriaId)) notFound();

  const [session, fechas] = await Promise.all([getSession(), fixtureDivisionCompleto(categoriaId)]);
  const tienePosiciones = TORNEOS_URBA[categoriaId] !== undefined;
  const tiraEquipos = equiposParaTira(categoriaId, (id) => `/fixture/${id}/cruces`, tieneFixtureDivision);
  const grupo = grupoDeCategoria(categoriaId);
  // "Resumen del partido" -- mismo hub del que se llega aca, tanto de vuelta (BackLink) como para
  // el boton de "Fixt. Newm." en si -- ver mismo comentario en /fixture/[categoriaId]/division.
  const hubHref = grupo.grupo === "juveniles" ? `/juveniles/${grupo.edadId}/equipo/${categoriaId}` : `/categoria/${categoriaId}`;
  const fixtureNewmanHref = grupo.grupo === "juveniles" ? hubHref : `/categoria/${categoriaId}/fixture`;

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href={hubHref} />
      <SessionBar session={session} />
      <Header />

      <div style={{ fontWeight: 700, color: DORADO_SUAVE, letterSpacing: 1, marginTop: 8, textTransform: "uppercase" }}>
        {categoria.nombre} - Cruces
      </div>

      {tiraEquipos && <TiraEquipos equipos={tiraEquipos} actualId={categoriaId} />}

      {/* replace, no push -- Tabla / Fixt. Newm. / Fixt Divis. / Cruces son vistas alternativas del
          mismo nivel (ver mismo comentario en /posiciones/[categoriaId]). */}
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {tienePosiciones && (
          <Link href={`/posiciones/${categoriaId}`} replace style={botonEstilo}>
            Tabla
          </Link>
        )}
        <Link href={fixtureNewmanHref} replace style={botonEstilo}>
          Fixt. Newm.
        </Link>
        <Link href={`/fixture/${categoriaId}/division`} replace style={botonEstilo}>
          Fixt Divis.
        </Link>
        <span style={botonActivo}>Cruces</span>
      </div>

      <div style={{ marginTop: 18 }}>
        <TablaCruces fechas={fechas} todasLasFechas={grupo.grupo === "juveniles"} />
      </div>

      <FuenteUrba />
    </main>
  );
}
