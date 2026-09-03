import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS, grupoDeCategoria } from "@/lib/categorias";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import type { PosicionesTorneo } from "@/types/firestore";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import TablaPosiciones from "@/components/TablaPosiciones";
import TiraEquipos from "@/components/TiraEquipos";
import { equiposParaTira } from "@/lib/tiraEquipos";
import { DORADO_SUAVE } from "@/lib/colors";

const botonEstilo: React.CSSProperties = {
  flex: 1,
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  fontSize: "0.7rem",
  fontWeight: 700,
  padding: "9px 4px",
  borderRadius: 8,
  border: "1px solid rgba(226,197,120,.4)",
  color: DORADO_SUAVE,
};

export default async function PosicionesPage({
  params,
}: {
  params: Promise<{ categoriaId: string }>;
}) {
  const { categoriaId } = await params;
  const categoria = CATEGORIAS.find((c) => c.id === categoriaId);
  if (!categoria) notFound();

  const esJuveniles = categoria.grupo === "juveniles";
  const backHref = esJuveniles ? `/juveniles/${categoria.edadId}/equipo/${categoriaId}` : `/categoria/${categoriaId}`;
  const fixtureNewmanHref = esJuveniles ? `/juveniles/${categoria.edadId}/equipo/${categoriaId}` : `/categoria/${categoriaId}/fixture`;
  const fixtureDivisionHref = tieneFixtureDivision(categoriaId) ? `/fixture/${categoriaId}/division` : undefined;
  const tiraEquipos = equiposParaTira(categoriaId, (id) => `/posiciones/${id}`, (id) => TORNEOS_URBA[id] !== undefined);

  const [snap, session] = await Promise.all([adminDb.collection("posiciones").doc(categoriaId).get(), getSession()]);

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href={backHref} />
      <SessionBar session={session} />
      <Header logo={categoria.grupo === "juveniles" ? "urba" : "top14"} />

      <div style={{ fontWeight: 700, color: DORADO_SUAVE, letterSpacing: 1, marginTop: 8, textTransform: "uppercase" }}>
        {categoria.nombre} - Tabla de Posiciones
      </div>

      {tiraEquipos && <TiraEquipos equipos={tiraEquipos} actualId={categoriaId} />}

      {/* replace, no push -- Tabla/Fixt. Newm./Fixt Divis. son 3 vistas alternativas del mismo
          nivel (no una mas adentro de la otra), asi que saltar entre ellas no debe apilar
          historial: "Atras" desde cualquiera vuelve a la pantalla de la que se entro a esta
          terna, no a la anterior de la terna. */}
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <Link href={fixtureNewmanHref} replace style={botonEstilo}>
          Fixt. Newm.
        </Link>
        {fixtureDivisionHref && (
          <Link href={fixtureDivisionHref} replace style={botonEstilo}>
            Fixt Divis.
          </Link>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        {!snap.exists ? (
          <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem", textAlign: "center" }}>
            Todavía no hay tabla de posiciones cargada para esta categoría.
          </p>
        ) : (
          <TablaPosiciones data={snap.data() as PosicionesTorneo} conPlayoff={grupoDeCategoria(categoriaId).grupo === "superior"} />
        )}
      </div>
    </main>
  );
}
