import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import { EDADES, NUMERO_FECHAS_JUVENILES, equiposDeEdad, nombreNewmanDe, partidoId, rivalGenerico } from "@/lib/categorias";
import type { Partido } from "@/types/firestore";
import { formatFecha, capitalizarPrimera } from "@/lib/fecha";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import FixtureRow, { MatchupText } from "@/components/FixtureRow";
import FixtureRowLive from "@/components/FixtureRowLive";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

const ESTADOS_EN_VIVO = new Set(["en_juego", "entretiempo", "suspendido"]);

export default async function FechaJuvenilesPage({
  params,
}: {
  params: Promise<{ edadId: string; numeroFecha: string }>;
}) {
  const { edadId, numeroFecha } = await params;
  const edad = EDADES.find((e) => e.id === edadId);
  const numero = Number(numeroFecha);
  if (!edad || !Number.isInteger(numero) || numero < 1 || numero > NUMERO_FECHAS_JUVENILES) notFound();

  const equipos = equiposDeEdad(edadId);
  if (equipos.length === 0) notFound();

  const refs = equipos.map((c) => adminDb.collection("partidos").doc(partidoId(c.id, numero)));
  const [snaps, session] = await Promise.all([adminDb.getAll(...refs), getSession()]);
  const filas = equipos.map((cat, i) => ({ cat, partido: snaps[i].exists ? (snaps[i].data() as Partido) : null }));

  const headline = filas[0]?.partido;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href={`/juveniles/${edadId}`} />
      <SessionBar session={session} />
      <Header rightLabel={`${edad.nombre} · Fecha ${numero}`} />

      {headline && (
        <>
          <div style={{ fontWeight: 700, textAlign: "center", color: DORADO, fontSize: "1.15rem", textTransform: "uppercase", marginTop: 12, letterSpacing: 0.3 }}>
            {headline.notaEspecial ?? (
              <MatchupText esLocal={headline.esLocal} rival={rivalGenerico(headline.rival)} jugado={headline.estado === "terminado"} resultado={headline.resultado} />
            )}
          </div>
          {headline.fecha && (
            <div style={{ textAlign: "center", fontStyle: "italic", fontSize: "0.85rem", color: DORADO_SUAVE, opacity: 0.9, marginTop: 2, marginBottom: 14 }}>
              {capitalizarPrimera(formatFecha(headline.fecha, "long"))}
            </div>
          )}
        </>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: headline ? 0 : "20px" }}>
        {filas.map(({ cat, partido }) => {
          if (!partido) return null;
          const href = `/partido/${partidoId(cat.id, numero)}`;
          const nombreNewman = nombreNewmanDe(cat.id);
          return ESTADOS_EN_VIVO.has(partido.estado) ? (
            <FixtureRowLive
              key={cat.id}
              partidoId={partidoId(cat.id, numero)}
              href={href}
              categoriaNombre={cat.nombre}
              esLocal={partido.esLocal}
              rival={partido.rival}
              inicial={{ estado: partido.estado, resultado: partido.resultado, notaEspecial: partido.notaEspecial }}
              nombreNewman={nombreNewman}
            />
          ) : (
            <FixtureRow
              key={cat.id}
              href={href}
              jugada={false}
              tituloPrincipal={cat.nombre}
              notaSecundaria={
                partido.notaEspecial ?? (
                  <>
                    <MatchupText esLocal={partido.esLocal} rival={partido.rival} jugado={partido.estado === "terminado"} resultado={partido.resultado} nombreNewman={nombreNewman} />
                    {partido.estado !== "terminado" && partido.hora && ` · ${partido.hora}`}
                  </>
                )
              }
            />
          );
        })}
      </div>
    </main>
  );
}
