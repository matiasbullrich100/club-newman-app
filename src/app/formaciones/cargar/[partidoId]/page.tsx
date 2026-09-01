import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import { esManagerDeCategoria } from "@/lib/auth/scope";
import { CATEGORIAS } from "@/lib/categorias";
import { formatFechaCorta } from "@/lib/fecha";
import { ordenarPorDorsal } from "@/lib/players";
import type { JugadorPartido, Partido } from "@/types/firestore";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import CargarFormacionEditor from "@/components/CargarFormacionEditor";
import { DORADO_SUAVE } from "@/lib/colors";

// Pantalla para cargar la formación de UN partido desde el celular (escribiéndola mirando una foto
// o pegándola desde el Excel / una imagen ya formateada). Queda en BORRADOR; se publica después
// con el botón "Publicar" de /formaciones. Se llega acá desde el botón "Subir" de esa lista.
export default async function CargarFormacionPage({ params }: { params: Promise<{ partidoId: string }> }) {
  const { partidoId } = await params;
  const session = await getSession();
  const snap = await adminDb.collection("partidos").doc(partidoId).get();
  if (!snap.exists) notFound();
  const partido = snap.data() as Partido;

  const autorizado = session?.rol === "manager" && esManagerDeCategoria(session, partido.categoriaId);
  const categoriaNombre = CATEGORIAS.find((c) => c.id === partido.categoriaId)?.nombre ?? partido.categoriaId;

  let textoInicial = "";
  if (autorizado && partido.estado === "programado") {
    const plantelSnap = await adminDb.collection("partidos").doc(partidoId).collection("plantel").get();
    const plantel = ordenarPorDorsal(plantelSnap.docs.map((d) => d.data() as JugadorPartido));
    const titulares = plantel.filter((j) => j.titular).map((j) => j.nombre);
    const suplentes = plantel.filter((j) => !j.titular).map((j) => j.nombre);
    textoInicial = [...titulares, ...(suplentes.length ? ["", "SUPLENTES:"] : []), ...suplentes].join("\n");
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/formaciones" />
      <SessionBar session={session} />
      <Header rightLabel="Formación" />

      {!autorizado ? (
        <p style={{ textAlign: "center", color: DORADO_SUAVE, marginTop: 20 }}>
          Esta sección es solo para el Manager de esta división (o el Administrador).
        </p>
      ) : partido.estado !== "programado" ? (
        <p style={{ textAlign: "center", color: DORADO_SUAVE, marginTop: 20 }}>
          Este partido ya arrancó o terminó — no se puede cargar la formación.{" "}
          <Link href="/formaciones" style={{ color: DORADO_SUAVE, textDecoration: "underline" }}>
            Volver a Formaciones
          </Link>
        </p>
      ) : (
        <CargarFormacionEditor
          partidoId={partidoId}
          categoriaNombre={categoriaNombre}
          rival={partido.rival}
          numeroFecha={String(partido.numeroFecha)}
          fecha={partido.fecha ? formatFechaCorta(partido.fecha) : null}
          textoInicial={textoInicial}
        />
      )}
    </main>
  );
}
