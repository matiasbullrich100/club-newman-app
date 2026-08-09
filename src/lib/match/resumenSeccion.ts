import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { esHoyEnArgentina } from "@/lib/fecha";
import type { Partido } from "@/types/firestore";

const ESTADOS_EN_VIVO = ["en_juego", "entretiempo", "suspendido"] as const;

export interface PartidoResumen {
  id: string;
  categoriaId: string;
  esLocal: boolean;
  rival: string;
  estado: Partido["estado"];
  resultado: Partido["resultado"];
}

function toDate(v: NonNullable<Partido["updatedAt"]>): Date {
  return v instanceof Date ? v : v.toDate();
}

/**
 * Partidos en vivo (cualquier categoria dentro de `categoriaIds`) mas los que ya terminaron
 * HOY -- asi un partido recien terminado no desaparece de la pagina principal de su seccion
 * hasta el dia siguiente. No hace falta indice compuesto: se trae "estado==terminado" entero
 * (el volumen de partidos de este club es chico) y se filtra categoria/dia en memoria.
 */
export async function partidosEnVivoOTerminadosHoy(categoriaIds: string[]): Promise<PartidoResumen[]> {
  const idsSet = new Set(categoriaIds);
  const [enVivoSnap, terminadosSnap] = await Promise.all([
    adminDb.collection("partidos").where("estado", "in", ESTADOS_EN_VIVO).get(),
    adminDb.collection("partidos").where("estado", "==", "terminado").get(),
  ]);

  const enVivo = enVivoSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Partido) }))
    .filter((p) => idsSet.has(p.categoriaId));

  const terminadosHoy = terminadosSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Partido) }))
    .filter((p) => idsSet.has(p.categoriaId) && p.updatedAt && esHoyEnArgentina(toDate(p.updatedAt)));

  return [...enVivo, ...terminadosHoy].map((p) => ({
    id: p.id,
    categoriaId: p.categoriaId,
    esLocal: p.esLocal,
    rival: p.rival,
    estado: p.estado,
    resultado: p.resultado,
  }));
}
