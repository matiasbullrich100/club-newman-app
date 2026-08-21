import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { esHoyEnArgentina, fechaIsoEsHoyEnArgentina, hoyIsoEnArgentina } from "@/lib/fecha";
import { CATEGORIAS, NUMERO_FECHAS_SUPERIOR, NUMERO_FECHAS_JUVENILES, grupoDeCategoria, partidoId } from "@/lib/categorias";
import type { Partido } from "@/types/firestore";

const ESTADOS_EN_VIVO = ["en_juego", "entretiempo", "suspendido"] as const;

export interface PartidoResumen {
  id: string;
  categoriaId: string;
  esLocal: boolean;
  rival: string;
  estado: Partido["estado"];
  resultado: Partido["resultado"];
  // Fecha calendario (ISO) del partido, si la tiene (los partidos de prueba no) -- para que
  // /superior y /juveniles puedan distinguir un resultado "de esta semana" de uno ya viejo (ver
  // diasDesdeEnArgentina en lib/fecha.ts).
  fecha?: string;
  // "Fecha libre" si esta fecha fue un bye -- LiveBanner muestra esto en vez del resultado.
  notaEspecial?: string;
}

function comoNumero(numeroFecha: Partido["numeroFecha"]): number {
  const n = Number(numeroFecha);
  return Number.isFinite(n) ? n : -Infinity;
}

/**
 * Partidos en vivo (cualquier categoria dentro de `categoriaIds`) mas la ULTIMA fecha jugada de
 * cada categoria (mayor `numeroFecha`, no "jugado hoy" literal) -- el club juega una fecha por
 * semana (Plantel Superior el sabado, Juveniles el domingo), asi que el resumen tiene que seguir
 * mostrando los resultados del ultimo partido jugado toda la semana, hasta que haya uno mas nuevo
 * (la fecha siguiente). "Jugada" incluye un bye (Fecha libre) que ya paso -- si no, una categoria
 * con fecha libre esta semana desaparece del resumen en vez de decir "Fecha libre" (una Fecha
 * libre queda "programado" para siempre, nunca pasa a "terminado"). No hace falta indice
 * compuesto: se trae "estado==terminado" y "notaEspecial==Fecha libre" enteros (el volumen de
 * partidos de este club es chico) y se filtra/agrupa en memoria.
 */
export async function partidosEnVivoOUltimoTerminado(categoriaIds: string[]): Promise<PartidoResumen[]> {
  const idsSet = new Set(categoriaIds);
  const hoy = hoyIsoEnArgentina();
  const [enVivoSnap, terminadosSnap, librePasadaSnap] = await Promise.all([
    adminDb.collection("partidos").where("estado", "in", ESTADOS_EN_VIVO).get(),
    adminDb.collection("partidos").where("estado", "==", "terminado").get(),
    adminDb.collection("partidos").where("notaEspecial", "==", "Fecha libre").get(),
  ]);

  const enVivo = enVivoSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Partido) }))
    .filter((p) => idsSet.has(p.categoriaId));

  const terminados = terminadosSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Partido) }))
    .filter((p) => idsSet.has(p.categoriaId));

  const libresPasadas = librePasadaSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Partido) }))
    .filter((p) => idsSet.has(p.categoriaId) && !!p.fecha && p.fecha <= hoy);

  // Partidos reales (con fecha calendario, terminados o Fecha libre ya pasada): el de mayor
  // numeroFecha por categoria.
  const masRecientePorCategoria = new Map<string, (typeof terminados)[number]>();
  for (const p of [...terminados, ...libresPasadas]) {
    if (!p.fecha) continue;
    const actual = masRecientePorCategoria.get(p.categoriaId);
    if (!actual || comoNumero(p.numeroFecha) > comoNumero(actual.numeroFecha)) {
      masRecientePorCategoria.set(p.categoriaId, p);
    }
  }

  // Partidos de prueba (sin fecha calendario real, numeroFecha "demo") -- "recien terminado"
  // sigue midiendose por la ultima edicion de hoy, no tiene sentido que queden pegados una semana.
  const pruebasHoy = terminados.filter((p) => {
    if (p.fecha) return false;
    const updatedAt = p.updatedAt;
    if (!updatedAt) return false;
    return esHoyEnArgentina(updatedAt instanceof Date ? updatedAt : updatedAt.toDate());
  });

  const terminadosHoy = [...masRecientePorCategoria.values(), ...pruebasHoy];

  // Firestore no garantiza el orden de un where().get() -- sin esto, cada visita podia mostrar
  // las categorias en un orden distinto (bug real: Primera terminaba al final de la lista en vez
  // de primera, aunque estuviera ahi). Plantel Superior se ordena por importancia (Primera arriba,
  // Pre H abajo del todo -- el orden canonico de categorias.ts, sin edadId asi que cae directo al
  // fallback). Juveniles se ordena por division/equipo, pero PRIMERO por edad (M19, M17, M16, M15
  // -- pedido explicito, orden inverso al de categorias.ts) y DESPUES por letra ascendente dentro
  // de esa edad (A, B, C...) -- el campo `orden` de categorias.ts arranca en 0 para cada edad, asi
  // que ordenar solo por ese campo intercalaba las letras entre divisiones (M15 A, M17 A, M19 A,
  // M15 B...) en vez de agrupar. En ambos casos, en vivo siempre va antes que terminado (arrays
  // separados abajo), y dentro de cada grupo se aplica el mismo criterio de importancia/division.
  const ordenPorCategoria = new Map<string, number>(CATEGORIAS.map((c) => [c.id, c.orden]));
  const RANGO_EDAD: Record<string, number> = { m19: 0, m17: 1, m16: 2, m15: 3 };
  const porOrden = (a: { categoriaId: string }, b: { categoriaId: string }) => {
    const edadA = grupoDeCategoria(a.categoriaId).edadId;
    const edadB = grupoDeCategoria(b.categoriaId).edadId;
    const rangoA = edadA ? (RANGO_EDAD[edadA] ?? 99) : 99;
    const rangoB = edadB ? (RANGO_EDAD[edadB] ?? 99) : 99;
    if (rangoA !== rangoB) return rangoA - rangoB;
    return (ordenPorCategoria.get(a.categoriaId) ?? 0) - (ordenPorCategoria.get(b.categoriaId) ?? 0);
  };

  return [...enVivo.sort(porOrden), ...terminadosHoy.sort(porOrden)].map((p) => ({
    id: p.id,
    categoriaId: p.categoriaId,
    esLocal: p.esLocal,
    rival: p.rival,
    estado: p.estado,
    resultado: p.resultado,
    fecha: p.fecha,
    notaEspecial: p.notaEspecial,
  }));
}

export interface ProximaFecha {
  numeroFecha: number;
  fecha?: string;
  esLocal: boolean;
  rival: string;
  cancha?: string;
  notaEspecial?: string;
}

/**
 * Las proximas `cantidad` fechas "programado" de una categoria (menor numeroFecha primero) -- para
 * el banner "Proxima Fecha" de /superior de jueves a la noche a domingo (ver
 * debeMostrarProximaFechaEnArgentina en lib/fecha.ts), antes de que la fecha de esta semana este en
 * vivo o terminada. Trae los 26 partidos por id (mismo patron que /categoria/[categoriaId]) en vez
 * de un where() -- no hace falta indice compuesto.
 */
export async function proximasFechasDe(categoriaId: string, cantidad: number): Promise<ProximaFecha[]> {
  const refs = Array.from({ length: NUMERO_FECHAS_SUPERIOR }, (_, i) => adminDb.collection("partidos").doc(partidoId(categoriaId, i + 1)));
  const snaps = await adminDb.getAll(...refs);
  const hoy = hoyIsoEnArgentina();
  const programados = snaps
    .filter((snap) => snap.exists)
    .map((snap) => ({ ...(snap.data() as Partido), numeroFecha: comoNumero((snap.data() as Partido).numeroFecha) }))
    // "programado" no siempre es futuro -- una Fecha libre queda "programado" para siempre, nunca
    // pasa a "terminado", asi que sin este filtro una fecha libre YA JUGADA (semanas atras) se
    // sigue mostrando como "proxima" para siempre.
    .filter((p) => p.estado === "programado" && (!p.fecha || p.fecha >= hoy))
    .sort((a, b) => a.numeroFecha - b.numeroFecha)
    .slice(0, cantidad);

  return programados.map((p) => ({
    numeroFecha: p.numeroFecha,
    fecha: p.fecha,
    esLocal: p.esLocal,
    rival: p.rival,
    cancha: p.cancha,
    notaEspecial: p.notaEspecial,
  }));
}

/**
 * La proxima fecha "programado" de CADA categoria en `categoriaIds` -- para Juveniles, donde a
 * diferencia de /superior (una sola fila, Primera) se sigue mostrando un resumen por equipo (hasta
 * 17). Usa NUMERO_FECHAS_JUVENILES (11 fechas) en vez de las 26 de Plantel Superior.
 */
export async function proximaFechaPorCategoria(categoriaIds: string[]): Promise<Map<string, ProximaFecha>> {
  const resultado = new Map<string, ProximaFecha>();
  await Promise.all(
    categoriaIds.map(async (categoriaId) => {
      const proximas = await proximaFechaJuvenilDe(categoriaId);
      if (proximas) resultado.set(categoriaId, proximas);
    })
  );
  return resultado;
}

export interface PartidoDeFecha {
  id: string;
  categoriaId: string;
  esLocal: boolean;
  rival: string;
  hora?: string;
  cancha?: string;
  notaEspecial?: string;
}

/**
 * El partido de cada categoria en `categoriaIds` que cae justo en `fechaIso` -- para el resumen
 * "Partidos de Mañana" en /superior (ver mananaIsoEnArgentina en lib/fecha.ts). Un solo where()
 * sobre el campo `fecha` (sin filtro compuesto, no hace falta indice) y se filtra/ordena en
 * memoria por el orden canonico de categorias.ts.
 */
export async function partidosDeFechaExacta(categoriaIds: string[], fechaIso: string): Promise<PartidoDeFecha[]> {
  const idsSet = new Set(categoriaIds);
  const snap = await adminDb.collection("partidos").where("fecha", "==", fechaIso).get();
  const partidos = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Partido) }))
    .filter((p) => idsSet.has(p.categoriaId));

  const ordenPorCategoria = new Map<string, number>(CATEGORIAS.map((c) => [c.id, c.orden]));
  partidos.sort((a, b) => (ordenPorCategoria.get(a.categoriaId) ?? 0) - (ordenPorCategoria.get(b.categoriaId) ?? 0));

  return partidos.map((p) => ({
    id: p.id,
    categoriaId: p.categoriaId,
    esLocal: p.esLocal,
    rival: p.rival,
    hora: p.hora,
    cancha: p.cancha,
    notaEspecial: p.notaEspecial,
  }));
}

async function proximaFechaJuvenilDe(categoriaId: string): Promise<ProximaFecha | null> {
  const refs = Array.from({ length: NUMERO_FECHAS_JUVENILES }, (_, i) => adminDb.collection("partidos").doc(partidoId(categoriaId, i + 1)));
  const snaps = await adminDb.getAll(...refs);
  const hoy = hoyIsoEnArgentina();
  let proxima: (Partido & { numeroFecha: number }) | null = null;
  for (const snap of snaps) {
    if (!snap.exists) continue;
    const p = snap.data() as Partido;
    // "programado" no siempre es futuro -- una Fecha libre queda asi para siempre (ver el mismo
    // comentario en proximasFechasDe).
    if (p.estado !== "programado" || (p.fecha && p.fecha < hoy)) continue;
    const n = comoNumero(p.numeroFecha);
    if (!proxima || n < proxima.numeroFecha) proxima = { ...p, numeroFecha: n };
  }
  if (!proxima) return null;
  return {
    numeroFecha: proxima.numeroFecha,
    fecha: proxima.fecha,
    esLocal: proxima.esLocal,
    rival: proxima.rival,
    cancha: proxima.cancha,
    notaEspecial: proxima.notaEspecial,
  };
}
