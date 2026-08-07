import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import type { Partido } from "@/types/firestore";
import { getSession } from "@/lib/auth/session";
import { logout } from "@/lib/auth/actions";

export default async function Home() {
  const [snap, session] = await Promise.all([
    adminDb.collection("partidos").get(),
    getSession(),
  ]);
  const partidos = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Partido) }));

  return (
    <main style={{ padding: "1.5rem 1rem", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "1.25rem" }}>Club Newman — En vivo</h1>
      <p style={{ color: "#666", fontSize: "0.9rem" }}>
        Etapa 1: motor en vivo (datos de prueba). El diseño definitivo se aplica más adelante.
      </p>

      {session ? (
        <p style={{ fontSize: "0.9rem" }}>
          Sesión: <strong>{session.username}</strong> ({session.rol}){" "}
          <form action={logout} style={{ display: "inline" }}>
            <button type="submit">Cerrar sesión</button>
          </form>
        </p>
      ) : null}

      {partidos.length === 0 ? (
        <p>No hay partidos cargados todavía. Corré el script de seed.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {partidos.map((p) => (
            <li key={p.id} style={{ marginBottom: "0.5rem" }}>
              <Link href={`/partido/${p.id}`}>
                {p.esLocal ? `Newman vs ${p.rival}` : `${p.rival} vs Newman`} — {p.estado}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p style={{ marginTop: "2rem" }}>
        <Link href="/login">Iniciar sesión (Designado / Entrenador / Manager)</Link>
      </p>
    </main>
  );
}
