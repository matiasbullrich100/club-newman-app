import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { CATEGORIAS_SUPERIOR } from "@/lib/categorias";
import { PLAYOFF } from "@/lib/playoff";
import type { PosicionesTorneo } from "@/types/firestore";

export interface ClasificadoNewman {
  categoriaId: string;
  categoria: string; // "Primera", "Pre A"...
  posicion: number; // la de Newman
  /** Los 4 primeros de la tabla (los que clasifican), con el nombre ya "limpio" para mostrar. */
  top4: { posicion: number; equipo: string; propio: boolean }[];
}

// "SIC B" -> "SIC", "Newman C" -> "Newman", "Hindu" -> "Hindú": en la pantalla de clasificados de una division
// alcanza con el club (la letra del equipo es la de la division) y se usa la grafia del club.
function nombreClub(equipo: string): string {
  const sinLetra = equipo.replace(/ [A-H]$/, "");
  return sinLetra === "Hindu" ? "Hindú" : sinLetra;
}

// Equipos de Newman que estan entre los 4 primeros de su tabla y juegan playoff (ver PLAYOFF), con la
// posicion que figura en la ultima tabla de URBA y los 4 clasificados de cada division -- para las pantallas
// "Newman clasificado a playoff" y "Clasificados a playoff" (ver EnJuegoTips / ClasificadosPantalla). Se lee en
// vivo: cuando URBA actualiza las tablas, las posiciones se corrigen solas.
export async function clasificadosNewman(): Promise<ClasificadoNewman[]> {
  const categorias = CATEGORIAS_SUPERIOR.filter((c) => PLAYOFF[c.id]);
  const snaps = await adminDb.getAll(...categorias.map((c) => adminDb.collection("posiciones").doc(c.id)));
  const salida: ClasificadoNewman[] = [];
  snaps.forEach((snap, i) => {
    if (!snap.exists) return;
    const t = snap.data() as PosicionesTorneo;
    const fila = t.filas.find((f) => f.equipo === t.nuestroEquipo);
    if (fila && fila.posicion <= 4) {
      const top4 = t.filas
        .filter((f) => f.posicion <= 4)
        .sort((a, b) => a.posicion - b.posicion)
        .map((f) => ({ posicion: f.posicion, equipo: nombreClub(f.equipo), propio: f.equipo === t.nuestroEquipo }));
      salida.push({ categoriaId: categorias[i].id, categoria: categorias[i].nombre, posicion: fila.posicion, top4 });
    }
  });
  return salida;
}
