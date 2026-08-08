import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import type { Partido } from "@/types/firestore";
import { getSession } from "@/lib/auth/session";
import { partidoId } from "@/lib/categorias";
import { formatFecha } from "@/lib/fecha";
import Header from "@/components/Header";
import SessionBar from "@/components/SessionBar";
import FixtureRow, { MatchupText } from "@/components/FixtureRow";
import { DORADO_SUAVE } from "@/lib/colors";

const NUMERO_FECHAS = 26;

export default async function Home() {
  const refs = Array.from({ length: NUMERO_FECHAS }, (_, i) => adminDb.collection("partidos").doc(partidoId("primera", i + 1)));
  const [snaps, session] = await Promise.all([adminDb.getAll(...refs), getSession()]);
  const fechas = snaps.map((snap, i) => ({ numeroFecha: i + 1, partido: snap.exists ? (snap.data() as Partido) : null }));

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "18px 16px 40px" }}>
      <Header tituloHome />
      <SessionBar session={session} />

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
