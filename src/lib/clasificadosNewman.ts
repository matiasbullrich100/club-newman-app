import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { CATEGORIAS_SUPERIOR } from "@/lib/categorias";
import { PLAYOFF } from "@/lib/playoff";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import { fixtureDivisionCompleto } from "@/lib/resultadosDivision/consultar";
import { reordenarPorDesempateDirecto } from "@/lib/clasificacion";
import { nombreClub } from "@/lib/nombreClub";
import type { PosicionesTorneo } from "@/types/firestore";
import type { PlayoffDoc } from "@/lib/playoffFinalistas";

export interface EquipoClasificado {
  posicion: number;
  equipo: string; // nombre "limpio" para mostrar
  propio: boolean; // es el equipo de Newman
}

export interface CruceClasificados {
  a: EquipoClasificado;
  b: EquipoClasificado;
  fecha?: string; // ISO yyyy-mm-dd
  hora?: string; // "HH:MM"
  /** Resultado de la semifinal, si URBA ya la cargo como jugada: goles de `a` y de `b`. */
  resultado?: { golesA: number; golesB: number };
}

export interface ClasificadoNewman {
  categoriaId: string;
  categoria: string; // "Primera", "Pre A"...
  posicion: number; // la de Newman
  sede?: string; // "CUBA", "Hindú", "CASI"
  provisoria: boolean; // la tabla todavia tiene partidos por jugar
  /** Los cruces de semifinales (1° vs 4° y 2° vs 3°) con dia y hora. */
  cruces: CruceClasificados[];
}


// "CUBA (Villa de Mayo)" -> "CUBA", "Cancha de CASI" -> "CASI"
const sedeCorta = (sede?: string) => sede?.replace(/ \(.*\)$/, "").replace(/^Cancha de /, "");

// Equipos de Newman que estan entre los 4 primeros de su tabla y juegan playoff (ver PLAYOFF), con sus cruces de
// semifinal, dia, hora y sede -- para la pantalla de Playoff. Ordenado cronologicamente (dia y hora; lo que todavia
// no tiene horario, al final). Se lee en vivo: cuando URBA actualiza las tablas, las posiciones se corrigen solas.
export async function clasificadosNewman(): Promise<ClasificadoNewman[]> {
  const categorias = CATEGORIAS_SUPERIOR.filter((c) => PLAYOFF[c.id]);
  const snaps = await adminDb.getAll(...categorias.map((c) => adminDb.collection("posiciones").doc(c.id)));
  // Resultados de las semifinales (los baja el cron de URBA, ver playoffFinalistas.ts).
  const playoffSnaps = await adminDb.getAll(...categorias.map((c) => adminDb.collection("playoff").doc(c.id)));
  const salida: ClasificadoNewman[] = [];
  for (const [i, snap] of snaps.entries()) {
    if (!snap.exists) continue;
    const cat = categorias[i];
    const t = snap.data() as PosicionesTorneo;
    // Empates en puntos: desempata el resultado directo (ver reordenarPorDesempateDirecto).
    const partidos = tieneFixtureDivision(cat.id) ? (await fixtureDivisionCompleto(cat.id)).flatMap((f) => f.partidos) : undefined;
    const filas = reordenarPorDesempateDirecto(t.filas, partidos);
    const fila = filas.find((f) => f.equipo === t.nuestroEquipo);
    if (!fila || fila.posicion > 4) continue;
    const equipo = (pos: number): EquipoClasificado => {
      const f = filas.find((x) => x.posicion === pos)!;
      return { posicion: pos, equipo: nombreClub(f.equipo), propio: f.equipo === t.nuestroEquipo };
    };
    const cfg = PLAYOFF[cat.id];
    const playoff = playoffSnaps[i].exists ? (playoffSnaps[i].data() as PlayoffDoc) : undefined;
    // Resultado de un cruce: se busca la semifinal por los dos clubes (en cualquier orden de local/visitante) y,
    // si el nombre no coincide, por posicion (URBA las lista 1° vs 4° y 2° vs 3°, igual que PLAYOFF.semis).
    const resultadoDe = (a: EquipoClasificado, b: EquipoClasificado, indice: number): CruceClasificados["resultado"] => {
      const semis = playoff?.semis ?? [];
      const semi = semis.find((x) => (x.local === a.equipo && x.visitante === b.equipo) || (x.local === b.equipo && x.visitante === a.equipo)) ?? semis[indice];
      if (!semi?.jugado) return undefined;
      return semi.local === a.equipo || semi.visitante !== a.equipo
        ? { golesA: semi.golesLocal, golesB: semi.golesVisitante }
        : { golesA: semi.golesVisitante, golesB: semi.golesLocal };
    };
    salida.push({
      categoriaId: cat.id,
      categoria: cat.nombre,
      posicion: fila.posicion,
      sede: sedeCorta(cfg.sede),
      provisoria: !filas.every((f) => f.jugados === filas[0].jugados),
      cruces: cfg.semis
        .map((s, idx) => {
          const a = equipo(s.cruce[0]);
          const b = equipo(s.cruce[1]);
          return { a, b, fecha: s.fecha, hora: s.hora, resultado: resultadoDe(a, b, idx) };
        })
        .sort((x, y) => `${x.fecha ?? "9999"} ${x.hora ?? "99:99"}`.localeCompare(`${y.fecha ?? "9999"} ${y.hora ?? "99:99"}`)),
    });
  }
  const clave = (c: ClasificadoNewman) => {
    const horas = c.cruces.map((x) => `${x.fecha ?? "9999-99-99"} ${x.hora ?? "99:99"}`).sort();
    return horas[0];
  };
  return salida.sort((a, b) => clave(a).localeCompare(clave(b)));
}
