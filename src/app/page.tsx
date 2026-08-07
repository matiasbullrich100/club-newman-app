import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import type { Partido } from "@/types/firestore";
import { getSession } from "@/lib/auth/session";
import { logout } from "@/lib/auth/actions";
import { partidoId } from "@/lib/categorias";
import FixtureRow from "@/components/FixtureRow";

const NUMERO_FECHAS = 26;

export default async function Home() {
  const refs = Array.from({ length: NUMERO_FECHAS }, (_, i) => adminDb.collection("partidos").doc(partidoId("primera", i + 1)));
  const [snaps, session] = await Promise.all([adminDb.getAll(...refs), getSession()]);
  const fechas = snaps.map((snap, i) => ({ numeroFecha: i + 1, partido: snap.exists ? (snap.data() as Partido) : null }));

  return (
    <main style={{ padding: "1.5rem 1rem", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "1.25rem" }}>Club Newman — En vivo</h1>
      <p style={{ color: "#666", fontSize: "0.85rem" }}>
        Diseño definitivo (escudo, tipografías) se aplica más adelante.
      </p>

      {session ? (
        <p style={{ fontSize: "0.9rem" }}>
          Sesión: <strong>{session.username}</strong> ({session.rol}){" "}
          <form action={logout} style={{ display: "inline" }}>
            <button type="submit">Cerrar sesión</button>
          </form>
        </p>
      ) : (
        <p style={{ fontSize: "0.9rem" }}>
          <Link href="/login">Iniciar sesión (Designado / Entrenador / Manager)</Link>
        </p>
      )}

      <div style={{ marginTop: "1rem" }}>
        {fechas.map(({ numeroFecha, partido }) =>
          partido ? (
            <FixtureRow
              key={numeroFecha}
              href={`/fecha/${numeroFecha}`}
              label={`Fecha ${numeroFecha}.`}
              esLocal={partido.esLocal}
              rival={partido.rival}
              estado={partido.estado}
              resultado={partido.resultado}
              notaEspecial={partido.notaEspecial}
            />
          ) : null
        )}
      </div>

      <p style={{ marginTop: "2rem", fontSize: "0.85rem" }}>
        <Link href="/partido/demo-partido-1">Partido de prueba (Fase 1)</Link>
      </p>
    </main>
  );
}
