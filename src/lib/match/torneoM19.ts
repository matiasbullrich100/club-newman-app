import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { diasDesdeEnArgentina } from "@/lib/fecha";
import type { Partido } from "@/types/firestore";
import type { JugadorFormacion } from "./semifinales";

// Torneo Veco Villegas (M19, sabado 21/11/2026 en Tucuman): partidos fuera del fixture de URBA, guardados como
// m19-a Fecha 12 a 15 con `torneo` (ver src/scripts/cargar-veco-villegas-m19.ts). Se muestran en el inicio, debajo de la
// final del Nacional de Clubes, con la formacion abierta cuando el Manager la publica.
const PARTIDOS_TORNEO_M19 = ["m19-a-f12", "m19-a-f13", "m19-a-f14", "m19-a-f15"];
// Cuantos dias (contando hoy) sigue visible en el inicio despues de jugado.
const DIAS_VISIBLE_JUGADO = 2;

export interface PartidoTorneoM19 {
  partidoId: string;
  torneo: string;
  estado: Partido["estado"];
  esLocal: boolean;
  rival: string;
  resultado: Partido["resultado"];
  fecha: string;
  hora?: string;
  cancha?: string;
  numeroCancha?: string;
  formacion?: JugadorFormacion[];
}

export async function partidosTorneoM19(): Promise<PartidoTorneoM19[]> {
  const snaps = await adminDb.getAll(...PARTIDOS_TORNEO_M19.map((id) => adminDb.collection("partidos").doc(id)));
  const salida: PartidoTorneoM19[] = [];
  for (const snap of snaps) {
    if (!snap.exists) continue;
    const p = snap.data() as Partido;
    if (!p.torneo || !p.fecha) continue;
    const enVivo = p.estado === "en_juego" || p.estado === "entretiempo" || p.estado === "suspendido";
    if (p.estado === "terminado" && !enVivo && diasDesdeEnArgentina(p.fecha) >= DIAS_VISIBLE_JUGADO) continue;
    let formacion: JugadorFormacion[] | undefined;
    if (p.formacionPublicada !== false) {
      const plantel = await snap.ref.collection("plantel").get();
      formacion = plantel.docs.map((d) => ({ jugadorId: d.id, ...(d.data() as Omit<JugadorFormacion, "jugadorId">) }));
      if (formacion.length === 0) formacion = undefined;
    }
    salida.push({
      partidoId: snap.id,
      torneo: p.torneo,
      estado: p.estado,
      esLocal: p.esLocal,
      rival: p.rival,
      resultado: p.resultado,
      fecha: p.fecha,
      hora: p.hora,
      cancha: p.cancha,
      numeroCancha: p.numeroCancha,
      formacion,
    });
  }
  return salida.sort((a, b) => `${a.fecha} ${a.hora ?? "99:99"}`.localeCompare(`${b.fecha} ${b.hora ?? "99:99"}`));
}
