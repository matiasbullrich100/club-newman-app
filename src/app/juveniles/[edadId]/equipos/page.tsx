import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { EDADES, equiposDeEdad } from "@/lib/categorias";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import { DORADO_SUAVE } from "@/lib/colors";

export default async function EquiposJuvenilesPage({ params }: { params: Promise<{ edadId: string }> }) {
  const { edadId } = await params;
  const edad = EDADES.find((e) => e.id === edadId);
  const equipos = edad ? equiposDeEdad(edadId) : [];
  if (!edad || equipos.length === 0) notFound();

  const session = await getSession();

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/juveniles" />
      <SessionBar session={session} />
      <Header rightLabel={edad.nombre} logo="urba" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 20 }}>
        {equipos.map((eq) => (
          <Link
            key={eq.id}
            href={`/juveniles/${edadId}/equipo/${eq.id}`}
            style={{
              background: "linear-gradient(155deg, rgba(255,255,255,.05), rgba(0,0,0,.15))",
              border: "1px solid rgba(226,197,120,.25)",
              borderRadius: 8,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ fontWeight: 600, letterSpacing: 0.5, fontSize: "0.85rem", textTransform: "uppercase", color: DORADO_SUAVE }}>
              {eq.nombre}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
