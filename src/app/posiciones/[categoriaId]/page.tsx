import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS } from "@/lib/categorias";
import type { PosicionesTorneo } from "@/types/firestore";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import TablaPosiciones from "@/components/TablaPosiciones";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

export default async function PosicionesPage({
  params,
}: {
  params: Promise<{ categoriaId: string }>;
}) {
  const { categoriaId } = await params;
  const categoria = CATEGORIAS.find((c) => c.id === categoriaId);
  if (!categoria) notFound();

  const backHref =
    categoria.grupo === "juveniles" ? `/juveniles/${categoria.edadId}/equipo/${categoriaId}` : `/categoria/${categoriaId}`;

  const [snap, session] = await Promise.all([adminDb.collection("posiciones").doc(categoriaId).get(), getSession()]);

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href={backHref} />
      <SessionBar session={session} />
      <Header rightLabel="Posiciones" logo={categoria.grupo === "juveniles" ? "urba" : "top14"} />

      <div style={{ fontWeight: 700, color: DORADO_SUAVE, letterSpacing: 1, marginTop: 8, textTransform: "uppercase" }}>{categoria.nombre}</div>
      <div
        style={{
          textAlign: "center",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1,
          fontSize: "0.78rem",
          color: DORADO,
          margin: "12px 0 6px",
        }}
      >
        Tabla de posiciones
      </div>

      {!snap.exists ? (
        <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem", textAlign: "center", marginTop: 16 }}>
          Todavía no hay tabla de posiciones cargada para esta categoría.
        </p>
      ) : (
        <TablaPosiciones data={snap.data() as PosicionesTorneo} />
      )}
    </main>
  );
}
