import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS_SUPERIOR, partidoId } from "@/lib/categorias";
import type { Partido } from "@/types/firestore";
import { formatFecha, capitalizarPrimera } from "@/lib/fecha";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import FixtureRow, { MatchupText } from "@/components/FixtureRow";
import FixtureRowLive from "@/components/FixtureRowLive";
import { nombrePropioDivision } from "@/lib/fixtureDivision";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

// Partido interno Newman vs Newman: el equipo propio se muestra con el nombre de la división
// ("Newman F") en vez de "Newman", para que diga "Newman F - Newman G".
const propioSi = (rival: string | undefined, catId: string) =>
  rival?.startsWith("Newman ") ? nombrePropioDivision(catId) : undefined;

const ESTADOS_EN_VIVO = new Set(["en_juego", "entretiempo", "suspendido"]);

export default async function VistaDeFecha({
  params,
}: {
  params: Promise<{ numeroFecha: string }>;
}) {
  const { numeroFecha } = await params;
  const numero = Number(numeroFecha);
  if (!Number.isInteger(numero) || numero < 1 || numero > 26) notFound();

  const refs = CATEGORIAS_SUPERIOR.map((c) => adminDb.collection("partidos").doc(partidoId(c.id, numero)));
  const [snaps, session] = await Promise.all([adminDb.getAll(...refs), getSession()]);
  const filas = CATEGORIAS_SUPERIOR.map((cat, i) => ({ cat, partido: snaps[i].exists ? (snaps[i].data() as Partido) : null }));

  const primera = filas.find((f) => f.cat.id === "primera")?.partido;

  const jugados = filas.filter((f) => f.partido?.estado === "terminado").map((f) => f.partido!);
  const ganados = jugados.filter((p) => p.resultado.newman > p.resultado.rival).length;
  const empatados = jugados.filter((p) => p.resultado.newman === p.resultado.rival).length;
  const perdidos = jugados.filter((p) => p.resultado.newman < p.resultado.rival).length;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header rightLabel={`Fecha ${numero}`} />

      {primera && (
        <>
          <div style={{ fontWeight: 700, textAlign: "center", color: DORADO, fontSize: "1.15rem", textTransform: "uppercase", marginTop: 12, letterSpacing: 0.3 }}>
            {primera.notaEspecial ?? (
              <MatchupText esLocal={primera.esLocal} rival={primera.rival} jugado={primera.estado === "terminado"} resultado={primera.resultado} />
            )}
          </div>
          {primera.fecha && (
            <div style={{ textAlign: "center", fontStyle: "italic", fontSize: "0.85rem", color: DORADO_SUAVE, opacity: 0.9, marginTop: 2, marginBottom: 14 }}>
              {capitalizarPrimera(formatFecha(primera.fecha, "long"))}
            </div>
          )}
        </>
      )}

      {jugados.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 6,
            fontSize: "0.78rem",
            color: DORADO_SUAVE,
            marginBottom: 14,
          }}
        >
          <span>
            P. Ganados: {ganados}
            {empatados > 0 && ` · P. Empatados: ${empatados}`} · P. Perdidos: {perdidos}
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: primera || jugados.length > 0 ? 0 : "20px" }}>
        {filas.map(({ cat, partido }) => {
          if (!partido) return null;
          const href = `/partido/${partidoId(cat.id, numero)}`;
          return ESTADOS_EN_VIVO.has(partido.estado) ? (
            <FixtureRowLive
              key={cat.id}
              partidoId={partidoId(cat.id, numero)}
              href={href}
              categoriaNombre={cat.nombre}
              esLocal={partido.esLocal}
              rival={partido.rival}
              nombreNewman={propioSi(partido.rival, cat.id)}
              inicial={{ estado: partido.estado, resultado: partido.resultado, notaEspecial: partido.notaEspecial }}
            />
          ) : (
            <FixtureRow
              key={cat.id}
              href={href}
              jugada={false}
              tituloPrincipal={cat.nombre}
              notaSecundaria={
                partido.notaEspecial ?? (
                  <MatchupText esLocal={partido.esLocal} rival={partido.rival} jugado={partido.estado === "terminado"} resultado={partido.resultado} nombreNewman={propioSi(partido.rival, cat.id)} />
                )
              }
            />
          );
        })}
      </div>
    </main>
  );
}
