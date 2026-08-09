import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import type { Partido } from "@/types/firestore";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS_SUPERIOR, NUMERO_FECHAS_SUPERIOR, partidoId } from "@/lib/categorias";
import { formatFecha } from "@/lib/fecha";
import { partidosEnVivoOTerminadosHoy } from "@/lib/match/resumenSeccion";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import FixtureRow, { MatchupText } from "@/components/FixtureRow";
import LiveBanner from "@/components/LiveBanner";
import { DORADO_SUAVE } from "@/lib/colors";

export default async function PlantelSuperiorPage() {
  const refs = Array.from({ length: NUMERO_FECHAS_SUPERIOR }, (_, i) => adminDb.collection("partidos").doc(partidoId("primera", i + 1)));
  const [snaps, session, resumen] = await Promise.all([
    adminDb.getAll(...refs),
    getSession(),
    partidosEnVivoOTerminadosHoy(CATEGORIAS_SUPERIOR.map((c) => c.id)),
  ]);
  const fechas = snaps.map((snap, i) => ({ numeroFecha: i + 1, partido: snap.exists ? (snap.data() as Partido) : null }));

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header rightLabel="Plantel Superior" />

      {resumen.map((p) => (
        <LiveBanner
          key={p.id}
          partidoId={p.id}
          categoriaNombre={CATEGORIAS_SUPERIOR.find((c) => c.id === p.categoriaId)?.nombre ?? p.categoriaId}
          inicial={{ esLocal: p.esLocal, rival: p.rival, estado: p.estado, resultado: p.resultado }}
        />
      ))}

      <p style={{ textAlign: "center", marginTop: 16 }}>
        <Link
          href="/categorias"
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
          Ver por categoría
        </Link>
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginTop: "20px",
        }}
      >
        {fechas.map(({ numeroFecha, partido }) =>
          partido ? (
            <FixtureRow
              key={numeroFecha}
              href={`/fecha/${numeroFecha}`}
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
