import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { CATEGORIAS_SUPERIOR, partidoId } from "@/lib/categorias";
import { debeMostrarProximaFechaEnArgentina, diasDesdeEnArgentina, domingoDeEstaSemanaIso, hoyIsoEnArgentina, plantelAdelantaSemifinales } from "@/lib/fecha";
import type { Partido } from "@/types/firestore";
import type { ProximaFecha } from "./resumenSeccion";

export interface JugadorFormacion {
  jugadorId: string;
  nombre: string;
  dorsal: string;
  titular: boolean;
  capitan?: boolean;
}

export interface SemifinalProgramada {
  categoriaId: string;
  categoriaNombre: string;
  partidoId: string;
  proxima: ProximaFecha;
  // Solo si el partido es HOY y la formacion ya esta publicada: se muestra directo en el programa.
  formacion?: JugadorFormacion[];
}

// Semifinales de playoff de Newman que todavia NO se jugaron y caen esta semana (hasta el domingo): se muestran
// en /superior y /playoff como un programa por dia y sede. Igual que una fecha normal, aparecen desde el jueves
// a las 06:00 (ver debeMostrarProximaFechaEnArgentina). Una semifinal ya en vivo / terminada sale en su fila de
// resultado de siempre, no aca. Los partidos son la "Fecha 27" (fase "semifinal") de cada categoria.
export async function semifinalesProgramadasEstaSemana(): Promise<SemifinalProgramada[]> {
  if (!debeMostrarProximaFechaEnArgentina() && !plantelAdelantaSemifinales()) return [];
  const snaps = await adminDb.getAll(...CATEGORIAS_SUPERIOR.map((c) => adminDb.collection("partidos").doc(partidoId(c.id, 27))));
  const hoy = hoyIsoEnArgentina();
  const domingo = domingoDeEstaSemanaIso();
  const salida: SemifinalProgramada[] = [];
  for (const [i, snap] of snaps.entries()) {
    if (!snap.exists) continue;
    const p = snap.data() as Partido;
    if (p.fase !== "semifinal" || p.estado !== "programado" || !p.fecha || p.fecha < hoy || p.fecha > domingo) continue;
    let formacion: JugadorFormacion[] | undefined;
    if (p.fecha === hoy && p.formacionPublicada !== false) {
      const plantel = await snap.ref.collection("plantel").get();
      formacion = plantel.docs.map((d) => ({ jugadorId: d.id, ...(d.data() as Omit<JugadorFormacion, "jugadorId">) }));
      if (formacion.length === 0) formacion = undefined;
    }
    const cat = CATEGORIAS_SUPERIOR[i];
    salida.push({
      categoriaId: cat.id,
      categoriaNombre: cat.nombre,
      partidoId: snap.id,
      formacion,
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
  }
  return salida;
}

export interface SemifinalEnCurso {
  categoriaId: string;
  categoriaNombre: string;
  partidoId: string;
  estado: Partido["estado"];
  esLocal: boolean;
  rival: string;
  resultado: Partido["resultado"];
  cancha?: string;
  numeroCancha?: string;
  hora?: string;
  fecha?: string;
  // La formacion publicada se muestra mientras el partido es de hoy (en vivo o recien terminado).
  formacion?: JugadorFormacion[];
}

// Cuantos dias (contando hoy) sigue visible en el inicio el resultado de una semifinal ya jugada.
const DIAS_SEMIFINAL_JUGADA_VISIBLE = 2;

// Semifinales de Newman EN VIVO o ya TERMINADAS (hoy y el dia anterior): el inicio las muestra con el marcador y el
// reloj en vivo (LiveBanner), en el mismo lugar donde antes estaba el programa del partido. Mientras el partido es
// de HOY se muestra tambien su formacion.
export async function semifinalesEnCursoOTerminadas(): Promise<SemifinalEnCurso[]> {
  const snaps = await adminDb.getAll(...CATEGORIAS_SUPERIOR.map((c) => adminDb.collection("partidos").doc(partidoId(c.id, 27))));
  const hoy = hoyIsoEnArgentina();
  const salida: SemifinalEnCurso[] = [];
  for (const [i, snap] of snaps.entries()) {
    if (!snap.exists) continue;
    const p = snap.data() as Partido;
    if (p.fase !== "semifinal" || p.estado === "programado" || !p.fecha) continue;
    const enVivo = p.estado === "en_juego" || p.estado === "entretiempo" || p.estado === "suspendido";
    if (!enVivo && diasDesdeEnArgentina(p.fecha) >= DIAS_SEMIFINAL_JUGADA_VISIBLE) continue;
    let formacion: JugadorFormacion[] | undefined;
    if ((enVivo || p.fecha === hoy) && p.formacionPublicada !== false) {
      const plantel = await snap.ref.collection("plantel").get();
      formacion = plantel.docs.map((d) => ({ jugadorId: d.id, ...(d.data() as Omit<JugadorFormacion, "jugadorId">) }));
      if (formacion.length === 0) formacion = undefined;
    }
    const cat = CATEGORIAS_SUPERIOR[i];
    salida.push({
      categoriaId: cat.id,
      categoriaNombre: cat.nombre,
      partidoId: snap.id,
      estado: p.estado,
      esLocal: p.esLocal,
      rival: p.rival,
      resultado: p.resultado,
      cancha: p.cancha,
      numeroCancha: p.numeroCancha,
      hora: p.hora,
      fecha: p.fecha,
      formacion,
    });
  }
  // En vivo primero, despues por dia y hora.
  const orden = (s: SemifinalEnCurso) => `${s.estado === "terminado" ? "1" : "0"} ${s.fecha} ${s.hora ?? "99:99"}`;
  return salida.sort((a, b) => orden(a).localeCompare(orden(b)));
}
