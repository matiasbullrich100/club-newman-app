import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { CATEGORIAS, partidoId } from "@/lib/categorias";
import type { Partido } from "@/types/firestore";
import FixtureRow from "@/components/FixtureRow";
import FixtureRowLive from "@/components/FixtureRowLive";

const ESTADOS_EN_VIVO = new Set(["en_juego", "entretiempo", "suspendido"]);

export default async function VistaDeFecha({
  params,
}: {
  params: Promise<{ numeroFecha: string }>;
}) {
  const { numeroFecha } = await params;
  const numero = Number(numeroFecha);
  if (!Number.isInteger(numero) || numero < 1 || numero > 26) notFound();

  const refs = CATEGORIAS.map((c) => adminDb.collection("partidos").doc(partidoId(c.id, numero)));
  const snaps = await adminDb.getAll(...refs);

  const filas = CATEGORIAS.map((cat, i) => ({ cat, partido: snaps[i].exists ? (snaps[i].data() as Partido) : null }));

  return (
    <main style={{ padding: "1.5rem 1rem", fontFamily: "sans-serif" }}>
      <p>
        <Link href="/">← Volver</Link>
      </p>
      <h1 style={{ fontSize: "1.15rem", textTransform: "uppercase" }}>Fecha {numero}.</h1>

      <div style={{ marginTop: "1rem" }}>
        {filas.map(({ cat, partido }) => {
          if (!partido) return null;
          const href = `/partido/${partidoId(cat.id, numero)}`;
          return ESTADOS_EN_VIVO.has(partido.estado) ? (
            <FixtureRowLive
              key={cat.id}
              partidoId={partidoId(cat.id, numero)}
              href={href}
              label={cat.nombre}
              esLocal={partido.esLocal}
              rival={partido.rival}
              inicial={{ estado: partido.estado, resultado: partido.resultado, notaEspecial: partido.notaEspecial }}
            />
          ) : (
            <FixtureRow
              key={cat.id}
              href={href}
              label={cat.nombre}
              esLocal={partido.esLocal}
              rival={partido.rival}
              estado={partido.estado}
              resultado={partido.resultado}
              notaEspecial={partido.notaEspecial}
            />
          );
        })}
      </div>
    </main>
  );
}
