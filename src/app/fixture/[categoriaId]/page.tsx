import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS, grupoDeCategoria, nombreNewmanDe } from "@/lib/categorias";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

// Pantalla intermedia entre el resumen de partido y el fixture -- "Fixture Newman X" es el
// fixture de nuestro equipo puntual (ya existe, ver /categoria o /juveniles/.../equipo). "Fixture
// División" (el calendario completo del campeonato en URBA, todos los equipos) todavía no está --
// la API pública de URBA no expone un endpoint de partidos/fixture, solo posiciones (ver
// src/lib/urba.ts). Cuando se resuelva eso, se agrega el segundo botón acá.
export default async function FixturePickerPage({ params }: { params: Promise<{ categoriaId: string }> }) {
  const { categoriaId } = await params;
  const categoria = CATEGORIAS.find((c) => c.id === categoriaId);
  if (!categoria) notFound();

  const grupo = grupoDeCategoria(categoriaId);
  const fixtureEquipoHref = grupo.grupo === "juveniles" ? `/juveniles/${grupo.edadId}/equipo/${categoriaId}` : `/categoria/${categoriaId}`;
  const backHref = grupo.grupo === "juveniles" ? "/juveniles" : "/superior";
  const nombreNewman = nombreNewmanDe(categoriaId);
  const session = await getSession();

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href={backHref} />
      <SessionBar session={session} />
      <Header rightLabel={categoria.nombre} />

      <div style={{ fontWeight: 700, color: DORADO_SUAVE, letterSpacing: 1, marginTop: 8, textTransform: "uppercase", textAlign: "center" }}>
        Fixture
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
        <Link
          href={fixtureEquipoHref}
          style={{
            display: "block",
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: 1,
            fontSize: "0.85rem",
            fontWeight: 700,
            padding: "16px",
            borderRadius: 10,
            border: `1px solid ${DORADO}`,
            color: DORADO_SUAVE,
            background: "linear-gradient(155deg, rgba(255,255,255,.05), rgba(0,0,0,.15))",
          }}
        >
          Fixture {nombreNewman}
        </Link>
      </div>
    </main>
  );
}
