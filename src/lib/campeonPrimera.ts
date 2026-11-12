import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { partidoId } from "@/lib/categorias";
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

// Cuantos dias despues de la final el inicio sigue festejando el titulo de Primera.
const DIAS_FESTEJO = 10;

// Si Primera ya gano la final del playoff (Fecha 28, fase "final", terminada con victoria de Newman) y todavia estamos
// dentro de la ventana de festejo, el inicio abre con el cartel de campeon. Se lee en vivo del partido, sin cargar nada a mano.
export async function campeonPrimera(): Promise<CampeonPrimera | null> {
  const snap = await adminDb.collection("partidos").doc(partidoId("primera", 28)).get();
  if (!snap.exists) return null;
  const p = snap.data() as Partido;
  if (p.fase !== "final" || p.estado !== "terminado" || !p.fecha) return null;
  if (!(p.resultado.newman > p.resultado.rival)) return null;
  if (diasDesdeEnArgentina(p.fecha) > DIAS_FESTEJO) return null;
  return {
    newman: p.resultado.newman,
    rival: p.resultado.rival,
    rivalNombre: nombreClub(p.rival),
    fecha: p.fecha,
    sede: p.cancha,
  };
}
