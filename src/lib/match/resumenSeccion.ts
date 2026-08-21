import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { esHoyEnArgentina, fechaIsoEsHoyEnArgentina } from "@/lib/fecha";
import { CATEGORIAS, NUMERO_FECHAS_SUPERIOR, grupoDeCategoria, partidoId } from "@/lib/categorias";
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

function comoNumero(numeroFecha: Partido["numeroFecha"]): number {
  const n = Number(numeroFecha);
  return Number.isFinite(n) ? n : -Infinity;
}

/**
 * Partidos en vivo (cualquier categoria dentro de `categoriaIds`) mas el ULTIMO terminado de cada
 * categoria (mayor `numeroFecha`, no "jugado hoy" literal) -- el club juega una fecha por semana
 * (Plantel Superior el sabado, Juveniles el domingo), asi que el resumen tiene que seguir
 * mostrando los resultados del ultimo partido jugado toda la semana, hasta que haya uno mas nuevo
 * (la fecha siguiente). No hace falta indice compuesto: se trae "estado==terminado" entero (el
 * volumen de partidos de este club es chico) y se filtra/agrupa en memoria.
 */
export async function partidosEnVivoOUltimoTerminado(categoriaIds: string[]): Promise<PartidoResumen[]> {
  const idsSet = new Set(categoriaIds);
  const [enVivoSnap, terminadosSnap] = await Promise.all([
    adminDb.collection("partidos").where("estado", "in", ESTADOS_EN_VIVO).get(),
    adminDb.collection("partidos").where("estado", "==", "terminado").get(),
  ]);

  const enVivo = enVivoSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Partido) }))
    .filter((p) => idsSet.has(p.categoriaId));

  const terminados = terminadosSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Partido) }))
    .filter((p) => idsSet.has(p.categoriaId));

  // Partidos reales (con fecha calendario): el de mayor numeroFecha por categoria.
  const masRecientePorCategoria = new Map<string, (typeof terminados)[number]>();
  for (const p of terminados) {
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
 * El proximo partido "programado" de una categoria (menor numeroFecha) -- para el banner "Proxima
 * Fecha" de /superior los viernes/sabados (ver esViernesOSabadoEnArgentina en lib/fecha.ts), antes
 * de que la fecha de esta semana este en vivo o terminada. Trae los 26 partidos por id (mismo
 * patron que /categoria/[categoriaId]) en vez de un where() -- no hace falta indice compuesto.
 */
export async function proximaFechaDe(categoriaId: string): Promise<ProximaFecha | null> {
  const refs = Array.from({ length: NUMERO_FECHAS_SUPERIOR }, (_, i) => adminDb.collection("partidos").doc(partidoId(categoriaId, i + 1)));
  const snaps = await adminDb.getAll(...refs);
  let proxima: (Partido & { numeroFecha: number }) | null = null;
  for (const snap of snaps) {
    if (!snap.exists) continue;
    const p = snap.data() as Partido;
    if (p.estado !== "programado") continue;
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
