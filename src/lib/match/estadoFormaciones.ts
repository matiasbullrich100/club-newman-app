import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import {
  CATEGORIAS_SUPERIOR,
  EDADES,
  equiposDeEdad,
  NUMERO_FECHAS_SUPERIOR,
  NUMERO_FECHAS_JUVENILES,
  partidoId,
} from "@/lib/categorias";
import { hoyIsoEnArgentina } from "@/lib/fecha";
import type { Partido } from "@/types/firestore";

export type EstadoSubida = "sin-subir" | "borrador" | "publicada" | "sin-fecha";

export interface EstadoFormacion {
  categoriaId: string;
  categoriaNombre: string;
  partidoId: string | null;
  numeroFecha: number | null;
  rival: string | null;
  fecha: string | null;
  jugadores: number;
  estado: EstadoSubida;
}

export interface GrupoEstadoFormaciones {
  titulo: string;
  filas: EstadoFormacion[];
}

async function estadoDeCategoria(
  categoriaId: string,
  categoriaNombre: string,
  numFechas: number
): Promise<EstadoFormacion> {
  const hoy = hoyIsoEnArgentina();
  const refs = Array.from({ length: numFechas }, (_, i) =>
    adminDb.collection("partidos").doc(partidoId(categoriaId, i + 1))
  );
  const snaps = await adminDb.getAll(...refs);
  const proximo = snaps
    .filter((s) => s.exists)
    .map((s) => ({ id: s.id, ...(s.data() as Partido) }))
    // Proxima fecha "programado" que todavia no paso -- la que el club esta por mandar.
    .filter((p) => p.estado === "programado" && (!p.fecha || p.fecha >= hoy))
    .sort((a, b) => Number(a.numeroFecha) - Number(b.numeroFecha))[0];

  if (!proximo) {
    return {
      categoriaId,
      categoriaNombre,
      partidoId: null,
      numeroFecha: null,
      rival: null,
      fecha: null,
      jugadores: 0,
      estado: "sin-fecha",
    };
  }

  const plantelSnap = await adminDb.collection("partidos").doc(proximo.id).collection("plantel").get();
  const jugadores = plantelSnap.size;
  // formacionPublicada ausente o true = publicada (default historico); solo false explicito = borrador.
  const estado: EstadoSubida =
    jugadores === 0 ? "sin-subir" : proximo.formacionPublicada === false ? "borrador" : "publicada";

  return {
    categoriaId,
    categoriaNombre,
    partidoId: proximo.id,
    numeroFecha: Number(proximo.numeroFecha),
    rival: proximo.rival,
    fecha: proximo.fecha ?? null,
    jugadores,
    estado,
  };
}

/**
 * Para cada categoria (Plantel Superior + las 4 edades de Juveniles), en que estado esta la
 * formacion de su PROXIMA fecha: sin subir / borrador (subida, no publicada) / publicada. Sirve
 * para ver de un vistazo que equipos faltan cargar -- sobre todo en Juveniles, que van llegando
 * por division.
 */
export async function estadoFormaciones(): Promise<GrupoEstadoFormaciones[]> {
  const superior = await Promise.all(
    CATEGORIAS_SUPERIOR.map((c) => estadoDeCategoria(c.id, c.nombre, NUMERO_FECHAS_SUPERIOR))
  );
  const grupos: GrupoEstadoFormaciones[] = [{ titulo: "Plantel Superior", filas: superior }];

  for (const edad of EDADES) {
    const filas = await Promise.all(
      equiposDeEdad(edad.id).map((c) => estadoDeCategoria(c.id, c.nombre, NUMERO_FECHAS_JUVENILES))
    );
    grupos.push({ titulo: edad.nombre, filas });
  }
  return grupos;
}
