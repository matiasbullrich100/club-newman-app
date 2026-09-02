import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS, grupoDeCategoria } from "@/lib/categorias";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { fixtureDivisionDe, numeroFechasDivisionDe, tieneFixtureDivision } from "@/lib/fixtureDivision";
import { formatFechaCorta, fechaFixtureYaPaso } from "@/lib/fecha";
import { adminDb } from "@/lib/firebase-admin";
import type { PosicionesTorneo } from "@/types/firestore";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import TiraEquipos from "@/components/TiraEquipos";
import { equiposParaTira } from "@/lib/tiraEquipos";
import { DORADO_SUAVE, NEGRO_JUGADA } from "@/lib/colors";

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

// Picker de fecha para el fixture completo de la division (26 fechas en Plantel Superior, 11 en
// Juveniles -- ver numeroFechasDivisionDe) -- de aca se entra a
// /fixture/[categoriaId]/division/[numeroFecha], que muestra los partidos de esa fecha.
export default async function FixtureDivisionPickerPage({ params }: { params: Promise<{ categoriaId: string }> }) {
  const { categoriaId } = await params;
  const categoria = CATEGORIAS.find((c) => c.id === categoriaId);
  if (!categoria || !tieneFixtureDivision(categoriaId)) notFound();

  const tienePosiciones = TORNEOS_URBA[categoriaId] !== undefined;
  const [session, posicionesSnap] = await Promise.all([
    getSession(),
    tienePosiciones ? adminDb.collection("posiciones").doc(categoriaId).get() : Promise.resolve(null),
  ]);
  const posiciones = posicionesSnap?.exists ? (posicionesSnap.data() as PosicionesTorneo) : null;
  const actualizado = posiciones
    ? ((posiciones.updatedAt as unknown as FirebaseFirestore.Timestamp)?.toDate?.() ?? (posiciones.updatedAt as Date))
    : null;
  const grupo = grupoDeCategoria(categoriaId);
  // "Resumen del partido" -- mismo hub con los 3 botones (Tabla/Fixt. Newm./Fixt Divis.) del que se
  // llega aca, tanto de vuelta (BackLink) como para el boton de "Fixt. Newm." en si.
  const hubHref = grupo.grupo === "juveniles" ? `/juveniles/${grupo.edadId}/equipo/${categoriaId}` : `/categoria/${categoriaId}`;
  const fixtureNewmanHref = grupo.grupo === "juveniles" ? hubHref : `/categoria/${categoriaId}/fixture`;
  const tiraEquipos = equiposParaTira(categoriaId, (id) => `/fixture/${id}/division`, tieneFixtureDivision);
  const fechas = Array.from({ length: numeroFechasDivisionDe(categoriaId) }, (_, i) => {
    const n = i + 1;
    const datos = fixtureDivisionDe(categoriaId, n);
    // "En negro" recién desde las 18:00 del sábado (Superior) / 16:00 del domingo (Juveniles) de
    // esa jornada -- ver fechaFixtureYaPaso.
    return { n, fecha: datos?.fecha, yaPaso: fechaFixtureYaPaso(datos?.fecha, grupo.grupo) };
  });

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href={hubHref} />
      <SessionBar session={session} />
      <Header />

      <div style={{ fontWeight: 700, color: DORADO_SUAVE, letterSpacing: 1, marginTop: 8, textTransform: "uppercase" }}>
        {categoria.nombre} - Fixture División
      </div>

      {tiraEquipos && <TiraEquipos equipos={tiraEquipos} actualId={categoriaId} />}

      {/* replace, no push -- ver mismo comentario en /posiciones/[categoriaId] */}
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {tienePosiciones && (
          <Link href={`/posiciones/${categoriaId}`} replace style={botonEstilo}>
            Tabla
          </Link>
        )}
        <Link href={fixtureNewmanHref} replace style={botonEstilo}>
          Fixt. Newm.
        </Link>
      </div>

      {posiciones && (
        <p style={{ fontSize: "0.78rem", opacity: 0.7, textAlign: "center", margin: "12px 0 6px" }}>
          {posiciones.championshipName}
          {actualizado && (
            <>
              {" · actualizado "}
              {actualizado.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit" })}
            </>
          )}
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginTop: 20 }}>
        {fechas.map(({ n, fecha, yaPaso }) => (
          <Link
            key={n}
            href={`/fixture/${categoriaId}/division/${n}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              padding: "8px 0",
              borderRadius: 8,
              border: `1px solid ${yaPaso ? "rgba(255,255,255,.06)" : "rgba(226,197,120,.25)"}`,
              background: yaPaso ? NEGRO_JUGADA : "linear-gradient(155deg, rgba(255,255,255,.05), rgba(0,0,0,.15))",
              color: DORADO_SUAVE,
              fontWeight: 700,
              fontSize: "0.85rem",
            }}
          >
            <span>#{n}</span>
            {fecha && <span style={{ fontSize: "0.65rem", opacity: 0.7, fontWeight: 400 }}>{formatFechaCorta(fecha)}</span>}
          </Link>
        ))}
      </div>
    </main>
  );
}
