import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import type { Partido } from "@/types/firestore";
import { getSession } from "@/lib/auth/session";
import { EDADES, NUMERO_FECHAS_JUVENILES, equiposDeEdad, partidoId } from "@/lib/categorias";
import { formatFecha } from "@/lib/fecha";
import { partidosEnVivoOTerminadosHoy } from "@/lib/match/resumenSeccion";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import FixtureRow, { MatchupText } from "@/components/FixtureRow";
import LiveBanner from "@/components/LiveBanner";
import { DORADO_SUAVE } from "@/lib/colors";

export default async function EdadPage({ params }: { params: Promise<{ edadId: string }> }) {
  const { edadId } = await params;
  const edad = EDADES.find((e) => e.id === edadId);
  if (!edad) notFound();

  const equipos = equiposDeEdad(edadId);
  const session = await getSession();

  if (equipos.length === 0) {
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
        <BackLink href="/juveniles" />
        <SessionBar session={session} />
        <Header rightLabel={edad.nombre} />
        <p style={{ textAlign: "center", color: DORADO_SUAVE, marginTop: 24, fontStyle: "italic", opacity: 0.75 }}>
          Todavía no hay equipos ni fixture cargado para {edad.nombre}.
        </p>
      </main>
    );
  }

  const headline = equipos.find((e) => "destacado" in e && e.destacado) ?? equipos[0];
  const refs = Array.from({ length: NUMERO_FECHAS_JUVENILES }, (_, i) => adminDb.collection("partidos").doc(partidoId(headline.id, i + 1)));
  const [snaps, resumen] = await Promise.all([
    adminDb.getAll(...refs),
    partidosEnVivoOTerminadosHoy(equipos.map((e) => e.id)),
  ]);
  const fechas = snaps.map((snap, i) => ({ numeroFecha: i + 1, partido: snap.exists ? (snap.data() as Partido) : null }));

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/juveniles" />
      <SessionBar session={session} />
      <Header rightLabel={edad.nombre} />

      {resumen.map((p) => (
        <LiveBanner
          key={p.id}
          partidoId={p.id}
          categoriaNombre={equipos.find((e) => e.id === p.categoriaId)?.nombre ?? p.categoriaId}
          inicial={{ esLocal: p.esLocal, rival: p.rival, estado: p.estado, resultado: p.resultado }}
        />
      ))}

      <p style={{ textAlign: "center", marginTop: 16 }}>
        <Link
          href={`/juveniles/${edadId}/equipos`}
          style={{
            display: "inline-block",
            textTransform: "uppercase",
            letterSpacing: 1,
            fontSize: "0.78rem",
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid rgba(226,197,120,.4)",
            color: DORADO_SUAVE,
          }}
        >
          Ver por equipo
        </Link>
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: "20px" }}>
        {fechas.map(({ numeroFecha, partido }) =>
          partido ? (
            <FixtureRow
              key={numeroFecha}
              href={`/juveniles/${edadId}/fecha/${numeroFecha}`}
              jugada={partido.estado === "terminado"}
              tituloPrincipal={
                partido.notaEspecial ? (
                  <>
                    # {numeroFecha}. {partido.notaEspecial}
                  </>
                ) : (
                  <>
                    # {numeroFecha}.{" "}
                    <MatchupText esLocal={partido.esLocal} rival={partido.rival} jugado={partido.estado === "terminado"} resultado={partido.resultado} />
                  </>
                )
              }
              notaSecundaria={partido.fecha ? formatFecha(partido.fecha, "short") : ""}
            />
          ) : null
        )}
      </div>
    </main>
  );
}
