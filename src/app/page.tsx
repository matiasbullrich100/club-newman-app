import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import type { Partido } from "@/types/firestore";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS, partidoId } from "@/lib/categorias";
import { formatFecha } from "@/lib/fecha";
import Header from "@/components/Header";
import SessionBar from "@/components/SessionBar";
import FixtureRow, { MatchupText } from "@/components/FixtureRow";
import LiveBanner from "@/components/LiveBanner";
import { DORADO_SUAVE } from "@/lib/colors";

const NUMERO_FECHAS = 26;
const ESTADOS_EN_VIVO = ["en_juego", "entretiempo", "suspendido"] as const;

export default async function Home() {
  const refs = Array.from({ length: NUMERO_FECHAS }, (_, i) => adminDb.collection("partidos").doc(partidoId("primera", i + 1)));
  const [snaps, session, enVivoSnap] = await Promise.all([
    adminDb.getAll(...refs),
    getSession(),
    adminDb.collection("partidos").where("estado", "in", ESTADOS_EN_VIVO).get(),
  ]);
  const fechas = snaps.map((snap, i) => ({ numeroFecha: i + 1, partido: snap.exists ? (snap.data() as Partido) : null }));
  const partidosEnVivo = enVivoSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Partido) }));

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <Header tituloHome />
      <SessionBar session={session} />

      {partidosEnVivo.map((p) => (
        <LiveBanner
          key={p.id}
          partidoId={p.id}
          categoriaNombre={CATEGORIAS.find((c) => c.id === p.categoriaId)?.nombre ?? p.categoriaId}
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

      <p style={{ marginTop: "2rem", fontSize: "0.85rem", textAlign: "center" }}>
        <Link href="/partido/demo-partido-1" style={{ color: DORADO_SUAVE }}>
          Partido de prueba (Fase 1)
        </Link>
      </p>
    </main>
  );
}
