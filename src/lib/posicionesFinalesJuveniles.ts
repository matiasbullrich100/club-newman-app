import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { CATEGORIAS_JUVENILES } from "@/lib/categorias";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import { fixtureDivisionCompleto } from "@/lib/resultadosDivision/consultar";
import { reordenarPorDesempateDirecto } from "@/lib/clasificacion";
import { normalizarNombreEquipo } from "@/lib/urba";
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
    // Empates en puntos: desempata el resultado directo (en Juveniles, una sola rueda: alcanza con el partido entre
    // los dos). La web de URBA a veces los deja al reves (ej. M17 A 2026: igualado con San Andres, Newman le gano).
    const categoriaId = categorias[i].id;
    const partidos = tieneFixtureDivision(categoriaId) ? (await fixtureDivisionCompleto(categoriaId)).flatMap((f) => f.partidos) : undefined;
    // El fixture nombra a Newman "Newman" y a los demas abreviados (ver fixtureDivision.nombreCorto): se compara con esos nombres.
    const conNombreDelFixture = t.filas.map((f) => ({ ...f, equipo: f.equipo === t.nuestroEquipo ? "Newman" : normalizarNombreEquipo(f.equipo) }));
    const reordenadas = reordenarPorDesempateDirecto(conNombreDelFixture, partidos, 1);
    // El desempate directo se aplica solo a la lucha por el TITULO (si Newman es 1° segun URBA o segun el desempate); el
    // resto de las posiciones queda como las informa URBA.
    const luchaPorElTitulo = [conNombreDelFixture, reordenadas].some((fs) => fs.find((f) => f.equipo === "Newman")?.posicion === 1);
    const filas = luchaPorElTitulo ? reordenadas : conNombreDelFixture;
    const fila = filas.find((f) => f.equipo === "Newman");
    if (!fila) continue;
    const fechasTotales = filas.length - 1;
    const pendientes = (pj: number) => Math.max(0, fechasTotales - pj);
    // Campeon: 1° y ningun rival lo alcanza -- al que ya jugo todo no le alcanza con empatarlo en puntos (el desempate
    // ya esta resuelto en el orden de arriba); al que le falta algo, solo si sus puntos maximos quedan por debajo.
    const campeon =
      fila.posicion === 1 &&
      filas.every((f) => f === fila || f.equipo === fila.equipo || (pendientes(f.jugados) === 0 ? f.puntos <= fila.puntos : f.puntos + PUNTOS_MAX_POR_PARTIDO * pendientes(f.jugados) < fila.puntos));
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
