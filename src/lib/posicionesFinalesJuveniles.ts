import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { CATEGORIAS_JUVENILES } from "@/lib/categorias";
import type { PosicionesTorneo } from "@/types/firestore";

export interface PosicionFinalNewman {
  categoriaId: string;
  categoria: string; // "M19 A"
  edadId: string;
  posicion: number;
  equipos: number; // cuantos equipos tiene la zona
  puntos: number;
  /** Primero y con el titulo asegurado: nadie lo alcanza ni ganando todo lo que le queda. */
  campeon: boolean;
  /** A Newman o a algun rival le quedan partidos por jugar: la posicion puede cambiar. */
  provisoria: boolean;
}

// Maximo de puntos por partido (victoria 4 + bonus ofensivo 1) -- para saber si el 1° ya es campeon aunque a
// algun perseguidor le quede un partido pendiente.
const PUNTOS_MAX_POR_PARTIDO = 5;

// Posicion de cada equipo juvenil de Newman en su zona de la fase actual (la tabla de URBA que ya guarda la app en
// posiciones/{categoriaId}). Se lee en vivo: si URBA corrige la tabla, esto se corrige solo.
export async function posicionesFinalesJuveniles(): Promise<PosicionFinalNewman[]> {
  const categorias = CATEGORIAS_JUVENILES;
  const snaps = await adminDb.getAll(...categorias.map((c) => adminDb.collection("posiciones").doc(c.id)));
  const salida: PosicionFinalNewman[] = [];
  for (const [i, snap] of snaps.entries()) {
    if (!snap.exists) continue;
    const t = snap.data() as PosicionesTorneo;
    const filas = t.filas;
    const fila = filas.find((f) => f.equipo === t.nuestroEquipo);
    if (!fila) continue;
    const fechasTotales = filas.length - 1;
    const pendientes = (pj: number) => Math.max(0, fechasTotales - pj);
    const segundo = filas.find((f) => f.posicion === 2);
    const campeon =
      fila.posicion === 1 &&
      (!segundo || segundo.puntos + PUNTOS_MAX_POR_PARTIDO * pendientes(segundo.jugados) < fila.puntos || filas.every((f) => pendientes(f.jugados) === 0));
    salida.push({
      categoriaId: categorias[i].id,
      categoria: categorias[i].nombre,
      edadId: categorias[i].edadId,
      posicion: fila.posicion,
      equipos: filas.length,
      puntos: fila.puntos,
      campeon,
      provisoria: filas.some((f) => pendientes(f.jugados) > 0),
    });
  }
  return salida;
}
