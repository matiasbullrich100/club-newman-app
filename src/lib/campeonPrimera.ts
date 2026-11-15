import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { CATEGORIAS_SUPERIOR, partidoId } from "@/lib/categorias";
import { diasDesdeEnArgentina } from "@/lib/fecha";
import { nombreClub } from "@/lib/nombreClub";
import type { Partido } from "@/types/firestore";

export interface CampeonPrimera {
  newman: number;
  rival: number;
  rivalNombre: string; // "Hindú"
  fecha: string; // ISO yyyy-mm-dd de la final
  sede?: string; // "CASI"
}

// Final de otra division de Plantel Superior en la que jugo Newman (Fecha 28, fase "final"): campeon si gano,
// subcampeon si perdio.
export interface TituloPlantel {
  categoria: string; // "Pre E"
  campeon: boolean; // false = subcampeon
  newman: number;
  rival: number;
  rivalNombre: string; // "SIC"
  fecha: string; // ISO yyyy-mm-dd
}

export interface FestejoBicampeon {
  campeon: CampeonPrimera;
  /** Las otras finales de Newman ya jugadas: campeonatos primero, despues subcampeonatos; dentro de cada grupo, por division. */
  titulos: TituloPlantel[];
}

// Cuantos dias despues de la ULTIMA final de Newman (la de Primera o la de cualquier otra division) el inicio sigue
// festejando.
const DIAS_FESTEJO = 10;

async function finalPrimera(): Promise<CampeonPrimera | null> {
  const snap = await adminDb.collection("partidos").doc(partidoId("primera", 28)).get();
  if (!snap.exists) return null;
  const p = snap.data() as Partido;
  if (p.fase !== "final" || p.estado !== "terminado" || !p.fecha) return null;
  if (!(p.resultado.newman > p.resultado.rival)) return null;
  return {
    newman: p.resultado.newman,
    rival: p.resultado.rival,
    rivalNombre: nombreClub(p.rival),
    fecha: p.fecha,
    sede: p.cancha,
  };
}

// Finales (Fecha 28, fase "final") ya terminadas de las demas divisiones de Plantel Superior donde Newman jugo la final
// -- solo existen para las que clasificaron. Se leen en vivo del resultado del partido, sin cargar nada a mano.
async function titulosPlantelSuperior(): Promise<TituloPlantel[]> {
  const categorias = CATEGORIAS_SUPERIOR.filter((c) => c.id !== "primera");
  const snaps = await adminDb.getAll(...categorias.map((c) => adminDb.collection("partidos").doc(partidoId(c.id, 28))));
  const salida: TituloPlantel[] = [];
  snaps.forEach((snap, i) => {
    if (!snap.exists) return;
    const p = snap.data() as Partido;
    if (p.fase !== "final" || p.estado !== "terminado" || !p.fecha) return;
    if (p.resultado.newman === p.resultado.rival) return; // sin ganador no hay titulo ni subcampeonato
    salida.push({
      categoria: categorias[i].nombre,
      campeon: p.resultado.newman > p.resultado.rival,
      newman: p.resultado.newman,
      rival: p.resultado.rival,
      rivalNombre: nombreClub(p.rival),
      fecha: p.fecha,
    });
  });
  return salida.sort((a, b) => Number(b.campeon) - Number(a.campeon));
}

// Si Primera ya gano la final del playoff y todavia estamos dentro de la ventana de festejo, el inicio abre con el
// cartel de bicampeon, y adentro los campeonatos / subcampeonatos de las demas divisiones.
export async function festejoBicampeon(): Promise<FestejoBicampeon | null> {
  const [campeon, titulos] = await Promise.all([finalPrimera(), titulosPlantelSuperior()]);
  if (!campeon) return null;
  const ultima = [campeon.fecha, ...titulos.map((t) => t.fecha)].sort().at(-1)!;
  if (diasDesdeEnArgentina(ultima) > DIAS_FESTEJO) return null;
  return { campeon, titulos };
}
