import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { puedeOperarCategoria } from "@/lib/auth/scope";
import { pruebasVisiblesPara } from "@/lib/partidosPrueba";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import ResetDemoButton from "@/components/ResetDemoButton";
import { DORADO_SUAVE } from "@/lib/colors";

// Partidos de prueba (Fase 1), uno por categoria -- fuera del esquema real a proposito, asi
// que necesitan su propio link (nunca aparecen en /fecha ni /categoria).
const PARTIDOS_DEMO = [
  { id: "pre-a-test-beromama", label: "Pre A", categoriaId: "pre-a" },
  { id: "demo-partido-1", label: "Pre B", categoriaId: "demo" },
  { id: "demo-partido-2", label: "M-22", categoriaId: "m-22" },
];

export default async function PruebasPage() {
  const session = await getSession();
  if (!pruebasVisiblesPara(session)) redirect("/");

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header rightLabel="Partido de Prueba" />

      <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
        {PARTIDOS_DEMO.map((p) => (
          <div
            key={p.id}
            style={{
              background: "linear-gradient(155deg, rgba(255,255,255,.05), rgba(0,0,0,.15))",
              border: "1px solid rgba(226,197,120,.25)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <Link
              href={`/partido/${p.id}`}
              style={{
                display: "block",
                textAlign: "center",
                textTransform: "uppercase",
                letterSpacing: 1,
                fontSize: "1rem",
                fontWeight: 700,
                color: DORADO_SUAVE,
              }}
            >
              {p.label}
            </Link>
            {session?.rol === "manager" && puedeOperarCategoria(session, p.categoriaId) && (
              <ResetDemoButton partidoId={p.id} label={p.label} />
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
