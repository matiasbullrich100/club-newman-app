import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { CATEGORIAS_JUVENILES, CATEGORIAS_SUPERIOR, partidoId } from "@/lib/categorias";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import { fixtureDivisionCompleto } from "@/lib/resultadosDivision/consultar";
import { reordenarPorDesempateDirecto } from "@/lib/clasificacion";
import { CATEGORIAS_FINALISTAS, playoffResuelto } from "@/lib/playoffFinalistas";
import { nombreClub } from "@/lib/nombreClub";
import { normalizarNombreEquipo } from "@/lib/urba";
import type { Partido, PosicionesTorneo } from "@/types/firestore";

// Tabla de campeones de la temporada: un campeon por categoria (Plantel Superior y Juveniles, de TODOS los clubes
// de la zona) y cuantos titulos tiene cada club.
//  - Plantel Superior: el ganador de la final del playoff (URBA; si la final la jugo Newman, manda el resultado de la
//    app). Pre G y Pre H juegan dentro de la zona de Pre F: su campeon es el de Pre F, no tienen fila propia.
//  - Juveniles: el 1° de la tabla de la zona con el titulo ASEGURADO (nadie lo alcanza ni ganando todo lo que le
//    queda, con desempate por resultado directo, igual que "Resultados finales"). Si todavia puede cambiar queda "a
//    confirmar" y no suma.

export interface CampeonCategoria {
  categoriaId: string;
  categoria: string; // "Pre E", "M17 A"
  grupo: "superior" | "juveniles";
  edadId?: string; // solo Juveniles
  campeon: string | null; // club ("Newman", "SIC"...); null = todavia sin definir
  detalle?: string; // "33 - 32 Hindú" (final) o "49 pts" (tabla)
}

export interface TitulosClub {
  club: string;
  superior: number;
  juveniles: number;
  total: number;
}

// Maximo que suma un equipo por partido en Juveniles: victoria 4 + bonus ofensivo 1.
const PUNTOS_MAX_POR_PARTIDO = 5;

async function campeonesSuperior(): Promise<CampeonCategoria[]> {
  const categorias = CATEGORIAS_SUPERIOR.filter((c) => CATEGORIAS_FINALISTAS.includes(c.id));
  const [docs, finalesApp] = await Promise.all([
    playoffResuelto(categorias.map((c) => c.id)),
    adminDb.getAll(...categorias.map((c) => adminDb.collection("partidos").doc(partidoId(c.id, 28)))),
  ]);
  return categorias.map((cat, i) => {
    const base = { categoriaId: cat.id, categoria: cat.nombre, grupo: "superior" as const };
    // La final que jugo Newman esta en la app: su resultado manda sobre URBA.
    const p = finalesApp[i].exists ? (finalesApp[i].data() as Partido) : undefined;
    if (p?.fase === "final" && p.estado === "terminado" && p.resultado.newman !== p.resultado.rival) {
      const gana = p.resultado.newman > p.resultado.rival;
      return {
        ...base,
        campeon: gana ? "Newman" : nombreClub(p.rival),
        detalle: gana ? `${p.resultado.newman} - ${p.resultado.rival} ${nombreClub(p.rival)}` : `${p.resultado.rival} - ${p.resultado.newman} Newman`,
      };
    }
    const f = docs.get(cat.id)?.final;
    if (!f?.jugado || f.golesLocal === f.golesVisitante) return { ...base, campeon: null };
    const gana = f.golesLocal > f.golesVisitante;
    return {
      ...base,
      campeon: gana ? f.local : f.visitante,
      detalle: gana ? `${f.golesLocal} - ${f.golesVisitante} ${f.visitante}` : `${f.golesVisitante} - ${f.golesLocal} ${f.local}`,
    };
  });
}

async function campeonesJuveniles(): Promise<CampeonCategoria[]> {
  const categorias = CATEGORIAS_JUVENILES;
  const snaps = await adminDb.getAll(...categorias.map((c) => adminDb.collection("posiciones").doc(c.id)));
  const salida: CampeonCategoria[] = [];
  await Promise.all(
    snaps.map(async (snap, i) => {
      if (!snap.exists) return;
      const cat = categorias[i];
      const t = snap.data() as PosicionesTorneo;
      // El fixture nombra a Newman "Newman" y a los demas abreviados: se compara con esos nombres (ver
      // posicionesFinalesJuveniles). Una sola rueda: alcanza con el partido entre los dos igualados.
      const categoriaId = cat.id;
      const partidos = tieneFixtureDivision(categoriaId) ? (await fixtureDivisionCompleto(categoriaId)).flatMap((f) => f.partidos) : undefined;
      const conNombres = t.filas.map((f) => ({ ...f, equipo: f.equipo === t.nuestroEquipo ? "Newman" : normalizarNombreEquipo(f.equipo) }));
      const filas = reordenarPorDesempateDirecto(conNombres, partidos, 1);
      const lider = filas[0];
      if (!lider) return;
      const fechasTotales = filas.length - 1;
      const pendientes = (pj: number) => Math.max(0, fechasTotales - pj);
      const asegurado = filas.every(
        (f) => f === lider || (pendientes(f.jugados) === 0 ? f.puntos <= lider.puntos : f.puntos + PUNTOS_MAX_POR_PARTIDO * pendientes(f.jugados) < lider.puntos)
      );
      salida.push({
        categoriaId: cat.id,
        categoria: cat.nombre,
        grupo: "juveniles",
        edadId: cat.edadId,
        campeon: asegurado ? nombreClub(lider.equipo) : null,
        detalle: asegurado ? `${lider.puntos} pts` : `A confirmar · lidera ${nombreClub(lider.equipo)} (${lider.puntos} pts)`,
      });
    })
  );
  // Promise.all termina en cualquier orden: se vuelve al orden de las categorias.
  const orden = new Map<string, number>(categorias.map((c, i) => [c.id, i]));
  return salida.sort((a, b) => (orden.get(a.categoriaId) ?? 0) - (orden.get(b.categoriaId) ?? 0));
}

export async function campeonesTemporada(): Promise<CampeonCategoria[]> {
  const [superior, juveniles] = await Promise.all([campeonesSuperior(), campeonesJuveniles()]);
  return [...superior, ...juveniles];
}

// Titulos por club, de mas a menos (a igualdad, primero el que mas gano en Plantel Superior y despues por nombre).
export function titulosPorClub(campeones: CampeonCategoria[]): TitulosClub[] {
  const porClub = new Map<string, TitulosClub>();
  for (const c of campeones) {
    if (!c.campeon) continue;
    const fila = porClub.get(c.campeon) ?? { club: c.campeon, superior: 0, juveniles: 0, total: 0 };
    fila[c.grupo] += 1;
    fila.total += 1;
    porClub.set(c.campeon, fila);
  }
  return [...porClub.values()].sort((a, b) => b.total - a.total || b.superior - a.superior || a.club.localeCompare(b.club));
}
