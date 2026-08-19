import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS } from "@/lib/categorias";
import { NUMERO_FECHAS_SUPERIOR } from "@/lib/categorias";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import { DORADO_SUAVE } from "@/lib/colors";

// Picker de fecha para el fixture completo de la division (las 26 fechas del TOP 14) -- de aca se
// entra a /fixture/[categoriaId]/division/[numeroFecha], que muestra los 7 partidos de esa fecha.
export default async function FixtureDivisionPickerPage({ params }: { params: Promise<{ categoriaId: string }> }) {
  const { categoriaId } = await params;
  const categoria = CATEGORIAS.find((c) => c.id === categoriaId);
  if (!categoria || !tieneFixtureDivision(categoriaId)) notFound();

  const session = await getSession();
  const fechas = Array.from({ length: NUMERO_FECHAS_SUPERIOR }, (_, i) => i + 1);

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href={`/fixture/${categoriaId}`} />
      <SessionBar session={session} />
      <Header rightLabel={categoria.nombre} />

      <div style={{ fontWeight: 700, color: DORADO_SUAVE, letterSpacing: 1, marginTop: 8, textTransform: "uppercase", textAlign: "center" }}>
        Fixture División
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginTop: 20 }}>
        {fechas.map((n) => (
          <Link
            key={n}
            href={`/fixture/${categoriaId}/division/${n}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 0",
              borderRadius: 8,
              border: "1px solid rgba(226,197,120,.25)",
              background: "linear-gradient(155deg, rgba(255,255,255,.05), rgba(0,0,0,.15))",
              color: DORADO_SUAVE,
              fontWeight: 700,
              fontSize: "0.85rem",
            }}
          >
            {n}
          </Link>
        ))}
      </div>
    </main>
  );
}
