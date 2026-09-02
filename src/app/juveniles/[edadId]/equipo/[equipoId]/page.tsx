import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import { EDADES, NUMERO_FECHAS_JUVENILES, equiposDeEdad, nombreNewmanDe, partidoId } from "@/lib/categorias";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import { formatFechaCorta, fechaFixtureYaPaso } from "@/lib/fecha";
import type { Partido, PosicionesTorneo } from "@/types/firestore";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import FixtureRow, { MatchupText } from "@/components/FixtureRow";
import TiraEquipos from "@/components/TiraEquipos";
import { DORADO_SUAVE } from "@/lib/colors";

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

export default async function EquipoJuvenilesPage({
  params,
}: {
  params: Promise<{ edadId: string; equipoId: string }>;
}) {
  const { edadId, equipoId } = await params;
  const edad = EDADES.find((e) => e.id === edadId);
  const equipo = edad ? equiposDeEdad(edadId).find((e) => e.id === equipoId) : undefined;
  if (!edad || !equipo) notFound();

  const nombreNewman = nombreNewmanDe(equipoId);
  const refs = Array.from({ length: NUMERO_FECHAS_JUVENILES }, (_, i) => adminDb.collection("partidos").doc(partidoId(equipoId, i + 1)));
  const tienePosiciones = TORNEOS_URBA[equipoId] !== undefined;
  const [snaps, posicionesSnap, session] = await Promise.all([
    adminDb.getAll(...refs),
    tienePosiciones ? adminDb.collection("posiciones").doc(equipoId).get() : Promise.resolve(null),
    getSession(),
  ]);
  const fechas = snaps.map((snap, i) => ({ numeroFecha: i + 1, partido: snap.exists ? (snap.data() as Partido) : null }));
  const posiciones = posicionesSnap?.exists ? (posicionesSnap.data() as PosicionesTorneo) : null;
  const actualizado = posiciones
    ? ((posiciones.updatedAt as unknown as FirebaseFirestore.Timestamp)?.toDate?.() ?? (posiciones.updatedAt as Date))
    : null;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href={`/juveniles/${edadId}`} />
      <SessionBar session={session} />
      <Header logo="urba" />

      <div style={{ fontWeight: 700, color: DORADO_SUAVE, letterSpacing: 1, marginTop: 8, textTransform: "uppercase" }}>
        {equipo.nombre} - Fixture {nombreNewman}
      </div>

      {/* Prueba: barra para saltar entre equipos de la edad sin volver atrás. Por ahora solo M15
          (pedido explícito, para probar el patrón antes de sumarlo al resto). */}
      {edadId === "m15" && (
        <TiraEquipos
          equipos={equiposDeEdad(edadId).map((e) => ({
            id: e.id,
            nombre: e.nombre,
            href: `/juveniles/${edadId}/equipo/${e.id}`,
          }))}
          actualId={equipoId}
        />
      )}

      {/* replace, no push -- ver mismo comentario en /posiciones/[categoriaId] */}
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {tienePosiciones && (
          <Link href={`/posiciones/${equipoId}`} replace style={botonEstilo}>
            Tabla
          </Link>
        )}
        {tieneFixtureDivision(equipoId) && (
          <Link href={`/fixture/${equipoId}/division`} replace style={botonEstilo}>
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
              href={`/partido/${partidoId(equipoId, numeroFecha)}`}
              jugada={partido.estado === "terminado" || !!partido.notaEspecial || fechaFixtureYaPaso(partido.fecha, "juveniles")}
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
                    <MatchupText
                      esLocal={partido.esLocal}
                      rival={partido.rival}
                      jugado={partido.estado === "terminado"}
                      resultado={partido.resultado}
                      nombreNewman={nombreNewman}
                    />
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
