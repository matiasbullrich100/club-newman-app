import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import { EDADES, NUMERO_FECHAS_JUVENILES, equiposDeEdad, nombreNewmanDe, partidoId } from "@/lib/categorias";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import { formatFechaCorta } from "@/lib/fecha";
import type { Partido, PosicionesTorneo } from "@/types/firestore";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import FixtureRow, { MatchupText } from "@/components/FixtureRow";
import TablaPosiciones from "@/components/TablaPosiciones";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

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
  const tieneTorneo = TORNEOS_URBA[equipoId] !== undefined;
  const [snaps, posicionesSnap, session] = await Promise.all([
    adminDb.getAll(...refs),
    tieneTorneo ? adminDb.collection("posiciones").doc(equipoId).get() : Promise.resolve(null),
    getSession(),
  ]);
  const fechas = snaps.map((snap, i) => ({ numeroFecha: i + 1, partido: snap.exists ? (snap.data() as Partido) : null }));

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href={`/juveniles/${edadId}/equipos`} />
      <SessionBar session={session} />
      <Header rightLabel={edad.nombre} logo="urba" />

      <div style={{ fontWeight: 700, color: DORADO_SUAVE, letterSpacing: 1, marginTop: 8, textTransform: "uppercase" }}>{equipo.nombre}</div>

      {tieneTorneo && (
        <>
          <div style={{ textAlign: "center", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, fontSize: "0.78rem", color: DORADO, margin: "12px 0 6px" }}>
            Tabla de posiciones
          </div>
          {posicionesSnap?.exists ? (
            <TablaPosiciones data={posicionesSnap.data() as PosicionesTorneo} />
          ) : (
            <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem", textAlign: "center" }}>
              Todavía no hay tabla de posiciones cargada.
            </p>
          )}
        </>
      )}

      {tieneFixtureDivision(equipoId) && (
        <p style={{ textAlign: "center", margin: "12px 0 0" }}>
          <Link
            href={`/fixture/${equipoId}/division`}
            style={{
              display: "inline-block",
              textTransform: "uppercase",
              letterSpacing: 1,
              fontSize: "0.78rem",
              fontWeight: 700,
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid rgba(226,197,120,.4)",
              color: DORADO_SUAVE,
            }}
          >
            Fixture División
          </Link>
        </p>
      )}

      <div style={{ textAlign: "center", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, fontSize: "0.78rem", color: DORADO, margin: "12px 0 6px" }}>
        Fixture {nombreNewman}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {fechas.map(({ numeroFecha, partido }) =>
          partido ? (
            <FixtureRow
              key={numeroFecha}
              href={`/partido/${partidoId(equipoId, numeroFecha)}`}
              jugada={partido.estado === "terminado" || !!partido.notaEspecial}
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
