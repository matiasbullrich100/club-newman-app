import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS, partidoId } from "@/lib/categorias";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import { formatFechaCorta, fechaFixtureYaPaso } from "@/lib/fecha";
import type { Partido, PosicionesTorneo } from "@/types/firestore";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import FixtureRow, { MatchupText } from "@/components/FixtureRow";
import { DORADO_SUAVE } from "@/lib/colors";

const NUMERO_FECHAS = 26;

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

// El fixture completo (jugado y por jugar) de un equipo de Plantel Superior -- vive en su propia
// pagina, aparte de /categoria/[categoriaId] (que ahora muestra la formacion del proximo partido
// directo, sin este paso) para no alargar esa pantalla. Se llega aca tocando "Fixt. New.".
export default async function CategoriaFixturePage({
  params,
}: {
  params: Promise<{ categoriaId: string }>;
}) {
  const { categoriaId } = await params;
  const categoria = CATEGORIAS.find((c) => c.id === categoriaId && c.grupo === "superior");
  if (!categoria) notFound();

  const refs = Array.from({ length: NUMERO_FECHAS }, (_, i) => adminDb.collection("partidos").doc(partidoId(categoriaId, i + 1)));
  const tienePosiciones = TORNEOS_URBA[categoriaId] !== undefined;
  const [snaps, posicionesSnap, session] = await Promise.all([
    adminDb.getAll(...refs),
    tienePosiciones ? adminDb.collection("posiciones").doc(categoriaId).get() : Promise.resolve(null),
    getSession(),
  ]);
  const fechas = snaps.map((snap, i) => ({ numeroFecha: i + 1, partido: snap.exists ? (snap.data() as Partido) : null }));
  const posiciones = posicionesSnap?.exists ? (posicionesSnap.data() as PosicionesTorneo) : null;
  const actualizado = posiciones
    ? ((posiciones.updatedAt as unknown as FirebaseFirestore.Timestamp)?.toDate?.() ?? (posiciones.updatedAt as Date))
    : null;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href={`/categoria/${categoriaId}`} />
      <SessionBar session={session} />
      <Header />

      <div style={{ fontWeight: 700, color: DORADO_SUAVE, letterSpacing: 1, marginTop: 8, textTransform: "uppercase" }}>
        {categoria.nombre} - Fixture Newman
      </div>

      {/* replace, no push -- ver mismo comentario en /posiciones/[categoriaId] */}
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {tienePosiciones && (
          <Link href={`/posiciones/${categoriaId}`} replace style={botonEstilo}>
            Tabla
          </Link>
        )}
        {tieneFixtureDivision(categoriaId) && (
          <Link href={`/fixture/${categoriaId}/division`} replace style={botonEstilo}>
            Fixt Divis.
          </Link>
        )}
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {fechas.map(({ numeroFecha, partido }) =>
          partido ? (
            <FixtureRow
              key={numeroFecha}
              href={`/partido/${partidoId(categoriaId, numeroFecha)}`}
              jugada={partido.estado === "terminado" || !!partido.notaEspecial || fechaFixtureYaPaso(partido.fecha, "superior")}
              tituloPrincipal={
                partido.notaEspecial ? (
                  <>
                    <span style={{ fontSize: "0.75em" }}>#{numeroFecha}.</span> {partido.notaEspecial}
                    {partido.fecha && (
                      <span style={{ fontSize: "0.7em", fontWeight: 400, opacity: 0.6, marginLeft: 4 }}>
                        {formatFechaCorta(partido.fecha)}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "0.75em" }}>#{numeroFecha}.</span>{" "}
                    <MatchupText esLocal={partido.esLocal} rival={partido.rival} jugado={partido.estado === "terminado"} resultado={partido.resultado} />
                    {partido.fecha && (
                      <span style={{ fontSize: "0.7em", fontWeight: 400, opacity: 0.6, marginLeft: 4 }}>
                        {formatFechaCorta(partido.fecha)}
                      </span>
                    )}
                  </>
                )
              }
              notaSecundaria={partido.amistoso && "Amistoso"}
            />
          ) : null
        )}
      </div>
    </main>
  );
}
