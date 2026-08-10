import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { esHoyEnArgentina, fechaIsoEsHoyEnArgentina } from "@/lib/fecha";
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

/**
 * Partidos en vivo (cualquier categoria dentro de `categoriaIds`) mas los que se jugaron HOY
 * (por `partido.fecha`, no por cuando se toco el documento por ultima vez -- una correccion
 * cargada dias despues no debe hacer "reaparecer" un partido como si fuera de hoy). No hace
 * falta indice compuesto: se trae "estado==terminado" entero (el volumen de partidos de este
 * club es chico) y se filtra categoria/fecha en memoria.
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
    .filter((p) => {
      if (!idsSet.has(p.categoriaId)) return false;
      // Los partidos de prueba no tienen fecha calendario real (numeroFecha "demo") -- para
      // esos, "recien terminado" sigue midiendose por la ultima edicion.
      if (p.fecha) return fechaIsoEsHoyEnArgentina(p.fecha);
      const updatedAt = p.updatedAt;
      if (!updatedAt) return false;
      return esHoyEnArgentina(updatedAt instanceof Date ? updatedAt : updatedAt.toDate());
    });

  return [...enVivo, ...terminadosHoy].map((p) => ({
    id: p.id,
    categoriaId: p.categoriaId,
    esLocal: p.esLocal,
    rival: p.rival,
    estado: p.estado,
    resultado: p.resultado,
  }));
}
