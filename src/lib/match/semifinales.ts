import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { CATEGORIAS_SUPERIOR, partidoId } from "@/lib/categorias";
import { debeMostrarProximaFechaEnArgentina, domingoDeEstaSemanaIso, hoyIsoEnArgentina } from "@/lib/fecha";
import type { Partido } from "@/types/firestore";
import type { ProximaFecha } from "./resumenSeccion";

export interface SemifinalProgramada {
  categoriaId: string;
  categoriaNombre: string;
  partidoId: string;
  proxima: ProximaFecha;
}

// Semifinales de playoff de Newman que todavia NO se jugaron y caen esta semana (hasta el domingo): se muestran
// en /superior y /playoff como un programa por dia y sede. Igual que una fecha normal, aparecen desde el jueves
// a las 06:00 (ver debeMostrarProximaFechaEnArgentina). Una semifinal ya en vivo / terminada sale en su fila de
// resultado de siempre, no aca. Los partidos son la "Fecha 27" (fase "semifinal") de cada categoria.
export async function semifinalesProgramadasEstaSemana(): Promise<SemifinalProgramada[]> {
  if (!debeMostrarProximaFechaEnArgentina()) return [];
  const snaps = await adminDb.getAll(...CATEGORIAS_SUPERIOR.map((c) => adminDb.collection("partidos").doc(partidoId(c.id, 27))));
  const hoy = hoyIsoEnArgentina();
  const domingo = domingoDeEstaSemanaIso();
  const salida: SemifinalProgramada[] = [];
  snaps.forEach((snap, i) => {
    if (!snap.exists) return;
    const p = snap.data() as Partido;
    if (p.fase !== "semifinal" || p.estado !== "programado" || !p.fecha || p.fecha < hoy || p.fecha > domingo) return;
    const cat = CATEGORIAS_SUPERIOR[i];
    salida.push({
      categoriaId: cat.id,
      categoriaNombre: cat.nombre,
      partidoId: snap.id,
      proxima: {
        numeroFecha: 27,
        fecha: p.fecha,
        esLocal: p.esLocal,
        rival: p.rival,
        hora: p.hora,
        cancha: p.cancha,
        numeroCancha: p.numeroCancha,
        notaEspecial: p.notaEspecial,
        amistoso: p.amistoso,
        formato: p.formato,
        fase: p.fase,
      },
    });
  });
  return salida;
}
