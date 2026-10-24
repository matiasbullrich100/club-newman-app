import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { CATEGORIAS_SUPERIOR } from "@/lib/categorias";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { PLAYOFF } from "@/lib/playoff";
import { fetchPlayoffUrba, normalizarNombreEquipo, type PartidoPlayoffUrba, type RondaPlayoffUrba } from "@/lib/urba";
import { nombreClub } from "@/lib/nombreClub";

// Instancia "Finalistas" del Playoff (pantalla /playoff): los dos equipos que juegan la final de cada
// division, que salen de los GANADORES de las 2 semifinales. Se completa sola a medida que URBA carga los
// resultados: un cron (.github/workflows/actualizar-playoff.yml -> /api/cron/actualizar-playoff) baja
// cada 15 minutos las rondas de playoff de cada zona y las guarda en Firestore (playoff/{categoriaId});
// la pantalla lee de ahi. Si URBA ya publico la ronda de la final, los finalistas salen de esa ronda.

// Inter, Pre A a F y M-22 (Primera juega sus semifinales el 30 y 31/10, queda afuera por ahora).
export const CATEGORIAS_FINALISTAS = ["intermedia", "pre-a", "pre-b", "pre-c", "pre-d", "pre-e", "pre-f", "m-22"];

const COLECCION = "playoff";

export interface PartidoPlayoff {
  local: string; // nombre del club, sin la letra de la division ("SIC", "Los Tilos", "Hindú")
  visitante: string;
  golesLocal: number;
  golesVisitante: number;
  jugado: boolean;
  fecha?: string;
}

export interface PlayoffDoc {
  categoriaId: string;
  semis: PartidoPlayoff[];
  final?: PartidoPlayoff;
}

export interface Finalista {
  club: string;
  propio: boolean; // es Newman
}

export interface FilaFinalistas {
  categoriaId: string;
  categoria: string; // "Pre A"...
  finalistas: [Finalista | null, Finalista | null]; // null = todavia por definir
  fechaFinal?: string; // ISO yyyy-mm-dd
  sede?: string; // "CUBA"
}

// "SIC B" -> "SIC", "Hindu" -> "Hindú", "Buenos Aires C&RC" -> "BACRC".
const limpio = (nombre: string) => nombreClub(normalizarNombreEquipo(nombre));

function aPartido(p: PartidoPlayoffUrba): PartidoPlayoff {
  return {
    local: limpio(p.local),
    visitante: limpio(p.visitante),
    golesLocal: p.golesLocal,
    golesVisitante: p.golesVisitante,
    jugado: p.jugado,
    ...(p.fecha ? { fecha: p.fecha } : {}),
  };
}

// Semis = la ronda de playoff con 2 partidos (o la que se llame "semi"); final = la de 1 solo partido (o la
// que se llame "final" a secas). No se asume el nombre exacto de la ronda: URBA la llama "PLAYOFF" en unas
// divisiones y "SEMI FINAL" en otras.
export function armarPlayoffDoc(categoriaId: string, rondas: RondaPlayoffUrba[]): PlayoffDoc {
  const semis = rondas.find((r) => /semi/i.test(r.nombre)) ?? rondas.find((r) => r.partidos.length === 2);
  const final =
    rondas.find((r) => /final/i.test(r.nombre) && !/semi/i.test(r.nombre)) ?? rondas.find((r) => r !== semis && r.partidos.length === 1);
  return {
    categoriaId,
    semis: (semis?.partidos ?? []).map(aPartido),
    ...(final?.partidos[0] ? { final: aPartido(final.partidos[0]) } : {}),
  };
}

const finalista = (club: string): Finalista => ({ club, propio: club === "Newman" });

// Ganador de un partido ya jugado, o null si todavia no se jugo (o URBA lo cargo empatado: sin ganador no hay
// finalista hasta que lo corrijan).
function ganador(p?: PartidoPlayoff): Finalista | null {
  if (!p || !p.jugado || p.golesLocal === p.golesVisitante) return null;
  return finalista(p.golesLocal > p.golesVisitante ? p.local : p.visitante);
}

export function finalistasDe(doc?: PlayoffDoc): [Finalista | null, Finalista | null] {
  if (doc?.final) return [finalista(doc.final.local), finalista(doc.final.visitante)];
  return [ganador(doc?.semis[0]), ganador(doc?.semis[1])];
}

export interface ResultadoActualizacionPlayoff {
  categoriaId: string;
  ok: boolean;
  finalistas?: number;
  error?: string;
}

// Baja de URBA las rondas de playoff de cada division y las guarda en playoff/{categoriaId}.
export async function actualizarPlayoffFinalistas(): Promise<ResultadoActualizacionPlayoff[]> {
  const entradas = CATEGORIAS_FINALISTAS.filter((id) => TORNEOS_URBA[id]).map((id) => [id, TORNEOS_URBA[id].championshipId] as const);
  const torneos = [...new Set(entradas.map(([, c]) => c))];
  const porTorneo = new Map<number, RondaPlayoffUrba[] | { error: string }>();
  await Promise.all(
    torneos.map(async (c) => {
      try {
        porTorneo.set(c, await fetchPlayoffUrba(c));
      } catch (e) {
        porTorneo.set(c, { error: e instanceof Error ? e.message : String(e) });
      }
    })
  );

  const resultados: ResultadoActualizacionPlayoff[] = [];
  for (const [categoriaId, championshipId] of entradas) {
    const datos = porTorneo.get(championshipId);
    if (!datos || "error" in datos) {
      resultados.push({ categoriaId, ok: false, error: datos && "error" in datos ? datos.error : "sin datos" });
      continue;
    }
    const doc = armarPlayoffDoc(categoriaId, datos);
    try {
      await adminDb.collection(COLECCION).doc(categoriaId).set({ ...doc, championshipId, updatedAt: FieldValue.serverTimestamp() });
      resultados.push({ categoriaId, ok: true, finalistas: finalistasDe(doc).filter(Boolean).length });
    } catch (e) {
      resultados.push({ categoriaId, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return resultados;
}

// Filas de la instancia "Finalistas" para la pantalla de Playoff, en el orden de las categorias.
export async function finalistasPlayoff(): Promise<FilaFinalistas[]> {
  const categorias = CATEGORIAS_SUPERIOR.filter((c) => CATEGORIAS_FINALISTAS.includes(c.id));
  const snaps = await adminDb.getAll(...categorias.map((c) => adminDb.collection(COLECCION).doc(c.id)));
  return categorias.map((cat, i) => {
    const doc = snaps[i].exists ? (snaps[i].data() as PlayoffDoc) : undefined;
    const cfg = PLAYOFF[cat.id];
    return {
      categoriaId: cat.id,
      categoria: cat.nombre,
      finalistas: finalistasDe(doc),
      fechaFinal: cfg?.final,
      sede: cfg?.sede?.replace(/ \(.*\)$/, "").replace(/^Cancha de /, ""),
    };
  });
}
