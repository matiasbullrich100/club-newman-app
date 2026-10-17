import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { CATEGORIAS_SUPERIOR } from "@/lib/categorias";
import { PLAYOFF } from "@/lib/playoff";
import type { PosicionesTorneo } from "@/types/firestore";

export interface ClasificadoNewman {
  categoriaId: string;
  categoria: string; // "Primera", "Pre A"...
  posicion: number;
}

// Equipos de Newman que estan entre los 4 primeros de su tabla y juegan playoff (ver PLAYOFF), con la
// posicion que figura en la ultima tabla de URBA -- para la pantalla "Newman clasificado a playoff" que
// se muestra en lugar de los tips cuando el club lo pide (ver EnJuegoTips). Se lee en vivo: cuando URBA
// actualiza las tablas, las posiciones se corrigen solas.
export async function clasificadosNewman(): Promise<ClasificadoNewman[]> {
  const categorias = CATEGORIAS_SUPERIOR.filter((c) => PLAYOFF[c.id]);
  const snaps = await adminDb.getAll(...categorias.map((c) => adminDb.collection("posiciones").doc(c.id)));
  const salida: ClasificadoNewman[] = [];
  snaps.forEach((snap, i) => {
    if (!snap.exists) return;
    const t = snap.data() as PosicionesTorneo;
    const fila = t.filas.find((f) => f.equipo === t.nuestroEquipo);
    if (fila && fila.posicion <= 4) salida.push({ categoriaId: categorias[i].id, categoria: categorias[i].nombre, posicion: fila.posicion });
  });
  return salida;
}
