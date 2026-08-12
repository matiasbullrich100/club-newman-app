// Carga el fixture (fechas 2 a 11, sin formaciones -- todavia no hay) de M15/M16/M17/M19 desde
// el excel del club. Correr con: npm run migrate-juveniles-fixture
// Idempotente: pisa el doc si ya existe (incluye M15, que ya tenia la fecha 2 cargada -- la
// vuelve a escribir con la letra del rival corregida; NO toca la fecha 1 de M15, esa no esta en
// este archivo).
//
// La fecha 3 de M17 A/B esta reprogramada para el 8/11 (vs Los Matreros) -- en el excel del club
// aparece al final de la hoja con el numero de fecha "F3" pero fuera de orden cronologico; se
// carga con numeroFecha=3 y fecha=8/11, no con el fixture "normal" del 23/8 (donde esos dos
// equipos no tienen fila -- ese domingo no jugaron).
//
// Nombres de club: iguales a los que ya usa Plantel Superior donde coinciden ("Regatas" no
// "Regatas BV", "Hindu" sin tilde -- asi lo tiene cargado el club, "BACRC" no "Buenos Aires").
// Para el resto (sin equivalente en Plantel Superior) se uso la ortografia correcta con tilde --
// el excel original tenia mojibake (acentos perdidos, reemplazados por el caracter de reemplazo
// Unicode U+FFFD) en Hindu/Pucará/Las Cañas/San Andrés/San Martín/Vicente López, irrecuperable
// del archivo, reconstruido por nombre de club conocido de URBA.
//
// Letra del rival: SIEMPRE se agrega, en todos los partidos -- letra propia del equipo del rival
// (no la de Newman), asignada secuencial (A, B, C...) dentro de cada grupo de (edad, club rival)
// esa fecha, en el orden en que aparecen los equipos de Newman. Ej.: si Newman C y Newman D
// juegan contra Virreyes esa fecha (y ningun otro equipo de Newman), es "Virreyes A" (para C) y
// "Virreyes B" (para D) -- la letra la pone el rival, no nosotros. Un rival que le da equipo a
// un solo Newman ese dia igual arranca en "A".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import type { Partido } from "../types/firestore";

const NEWMAN = "Newman";

interface FilaFixture {
  categoriaId: string;
  rivalBase: string | null; // null = fecha libre
  esLocal: boolean;
  hora: string;
}

interface Fecha {
  numeroFecha: number;
  fechaISO: string;
  filas: FilaFixture[];
}

function f(categoriaId: string, rivalBase: string | null, esLocal: boolean, hora: string): FilaFixture {
  return { categoriaId, rivalBase, esLocal, hora };
}

// "m16-a" -> "m16"
function edadDe(categoriaId: string): string {
  return categoriaId.split("-")[0];
}

const FECHAS: Fecha[] = [
  {
    numeroFecha: 2,
    fechaISO: "2026-08-16",
    filas: [
      f("m15-a", "CASI", false, "11:00"),
      f("m15-b", "CASI", false, "09:30"),
      f("m15-c", "CASI", false, "11:00"),
      f("m15-d", "CASI", false, "09:30"),
      f("m16-a", "CASI", true, "11:00"),
      f("m16-b", "CASI", true, "09:30"),
      f("m16-c", "CASI", true, "11:00"),
      f("m16-d", "CASI", true, "09:30"),
      f("m17-a", "Olivos", false, "14:00"),
      f("m17-b", "Olivos", false, "12:30"),
      f("m17-c", "Las Cañas", false, "12:30"),
      f("m19-a", "SIC", true, "14:00"),
      f("m19-b", "SIC", true, "12:30"),
      f("m19-c", "SIC", true, "12:30"),
      f("m19-d", "SIC", true, "11:00"),
      f("m19-e", "SIC", true, "12:30"),
    ],
  },
  {
    numeroFecha: 3,
    fechaISO: "2026-08-23",
    filas: [
      f("m15-a", "CUBA", true, "11:00"),
      f("m15-b", "CUBA", true, "09:30"),
      f("m15-c", "CUBA", true, "11:00"),
      f("m15-d", "CUBA", true, "09:30"),
      f("m16-a", "Pucará", false, "11:00"),
      f("m16-b", "Pucará", false, "09:30"),
      f("m16-c", "Virreyes", false, "12:30"),
      f("m16-d", "Virreyes", false, "11:00"),
      f("m17-c", "Vicente López", true, "14:00"),
      f("m19-a", "La Plata", false, "14:00"),
      f("m19-b", "La Plata", false, "12:30"),
      f("m19-c", "La Plata", false, "14:00"),
      f("m19-d", "La Plata", false, "12:30"),
      f("m19-e", "G y Esgrima", false, "12:30"),
    ],
  },
  {
    numeroFecha: 4,
    fechaISO: "2026-08-30",
    filas: [
      f("m15-a", "Pucará", false, "11:00"),
      f("m15-b", "Pucará", false, "09:30"),
      f("m15-c", "Pucará", false, "11:00"),
      f("m15-d", "Pucará", false, "09:30"),
      f("m16-a", "Belgrano Athletic", true, "11:00"),
      f("m16-b", "Belgrano Athletic", true, "09:30"),
      f("m16-c", "Belgrano Athletic", true, "11:00"),
      f("m16-d", "Belgrano Athletic", true, "09:30"),
      f("m17-a", "San Andrés", false, "14:00"),
      f("m17-b", "San Andrés", false, "12:30"),
      f("m17-c", "Bco. Hipotecario", false, "14:00"),
      f("m19-a", "Champagnat", true, "14:00"),
      f("m19-b", "Champagnat", true, "12:30"),
      f("m19-c", "Champagnat", true, "12:30"),
      f("m19-d", "Champagnat", true, "11:00"),
      f("m19-e", "Champagnat", true, "12:30"),
    ],
  },
  {
    numeroFecha: 5,
    fechaISO: "2026-09-06",
    filas: [
      f("m15-a", "Liceo Naval", true, "11:00"),
      f("m15-b", "Liceo Naval", true, "09:30"),
      f("m15-c", null, true, ""),
      f("m15-d", "San Andrés", true, "09:30"),
      f("m16-a", "CUBA", false, "11:00"),
      f("m16-b", "CUBA", false, "09:30"),
      f("m16-c", "CUBA", false, "11:00"),
      f("m16-d", "CUBA", false, "09:30"),
      f("m17-a", "Los Tilos", true, "14:00"),
      f("m17-b", "Los Tilos", true, "12:30"),
      f("m17-c", "St. Brendan's", true, "14:00"),
      f("m19-a", "San Luis", false, "14:00"),
      f("m19-b", "San Luis", false, "12:30"),
      f("m19-c", "San Martín", false, "12:30"),
      f("m19-d", "San Martín", false, "11:00"),
      f("m19-e", "San Luis", false, "14:00"),
    ],
  },
  {
    numeroFecha: 6,
    fechaISO: "2026-09-13",
    filas: [
      f("m15-a", "La Plata", true, "11:00"),
      f("m15-b", "La Plata", true, "09:30"),
      f("m15-c", "La Plata", true, "11:00"),
      f("m15-d", "Los Pinos", true, "09:30"),
      f("m16-a", "Alumni", false, "11:00"),
      f("m16-b", "Alumni", false, "09:30"),
      f("m16-c", "Alumni", false, "11:00"),
      f("m16-d", "Alumni", false, "09:30"),
      f("m17-a", "SITAS", true, "14:00"),
      f("m17-b", "SITAS", true, "12:30"),
      f("m17-c", "Los Pinos", true, "14:00"),
      f("m19-a", "Alumni", false, "14:00"),
      f("m19-b", "Alumni", false, "12:30"),
      f("m19-c", "CASI", false, "14:00"),
      f("m19-d", "CASI", false, "12:30"),
      f("m19-e", "Alumni", false, "14:00"),
    ],
  },
  {
    numeroFecha: 7,
    fechaISO: "2026-09-27",
    filas: [
      f("m15-a", "Alumni", false, "11:00"),
      f("m15-b", "Alumni", false, "09:30"),
      f("m15-c", "Alumni", false, "11:00"),
      f("m15-d", "Los Molinos", false, "11:00"),
      f("m16-a", "SIC", true, "11:00"),
      f("m16-b", "SIC", true, "09:30"),
      f("m16-c", "SIC", true, "11:00"),
      f("m16-d", "SIC", true, "09:30"),
      f("m17-a", "A.D. Francesa", false, "14:00"),
      f("m17-b", "A.D. Francesa", false, "12:30"),
      f("m17-c", "A.D. Francesa", false, "14:00"),
      f("m19-a", "BACRC", true, "14:00"),
      f("m19-b", "BACRC", true, "12:30"),
      f("m19-c", "BACRC", true, "12:30"),
      f("m19-d", "BACRC", true, "11:00"),
      f("m19-e", "BACRC", true, "12:30"),
    ],
  },
  {
    numeroFecha: 8,
    fechaISO: "2026-10-04",
    filas: [
      f("m15-a", "SIC", true, "11:00"),
      f("m15-b", "SIC", true, "09:30"),
      f("m15-c", "SIC", true, "11:00"),
      f("m15-d", null, true, ""),
      f("m16-a", "San Cirano", false, "11:00"),
      f("m16-b", "San Cirano", false, "09:30"),
      f("m16-c", "Hurling", false, "11:00"),
      f("m16-d", "Hurling", false, "09:30"),
      f("m17-a", "Liceo Naval", true, "14:00"),
      f("m17-b", "Liceo Naval", true, "12:30"),
      f("m17-c", "Liceo Naval", true, "14:00"),
      f("m19-a", "CUBA", false, "14:00"),
      f("m19-b", "CUBA", false, "12:30"),
      f("m19-c", "CUBA", false, "12:30"),
      f("m19-d", "CUBA", false, "11:00"),
      f("m19-e", "CUBA", false, "14:00"),
    ],
  },
  {
    numeroFecha: 9,
    fechaISO: "2026-10-11",
    filas: [
      f("m15-a", "Champagnat", false, "11:00"),
      f("m15-b", "Champagnat", false, "09:30"),
      f("m15-c", "Champagnat", false, "11:00"),
      f("m15-d", null, true, ""),
      f("m16-a", "Champagnat", true, "11:00"),
      f("m16-b", "Champagnat", true, "09:30"),
      f("m16-c", "Champagnat", true, "11:00"),
      f("m16-d", "Champagnat", true, "09:30"),
      f("m17-a", "Los Molinos", false, "14:00"),
      f("m17-b", "Los Molinos", false, "12:30"),
      f("m17-c", "Rivadavia de Lobos", false, "14:00"),
      f("m19-a", "Pucará", true, "14:00"),
      f("m19-b", "Pucará", true, "12:30"),
      f("m19-c", "Pucará", true, "12:30"),
      f("m19-d", "Pucará", true, "11:00"),
      f("m19-e", "Los Molinos", true, "12:30"),
    ],
  },
  {
    numeroFecha: 10,
    fechaISO: "2026-10-25",
    filas: [
      f("m15-a", "Olivos", true, "11:00"),
      f("m15-b", "Olivos", true, "09:30"),
      f("m15-c", "Olivos", true, "11:00"),
      f("m15-d", null, true, ""),
      f("m16-a", "Los Tilos", false, "11:00"),
      f("m16-b", "Los Tilos", false, "09:30"),
      f("m16-c", null, true, ""),
      f("m16-d", null, true, ""),
      f("m17-a", "Hindu", true, "14:00"),
      f("m17-b", "Hindu", true, "12:30"),
      f("m17-c", null, true, ""),
      f("m19-a", "Hindu", false, "14:00"),
      f("m19-b", "Hindu", false, "12:30"),
      f("m19-c", "Hindu", false, "12:30"),
      f("m19-d", "Hindu", false, "11:00"),
      f("m19-e", null, true, ""),
    ],
  },
  {
    numeroFecha: 11,
    fechaISO: "2026-11-01",
    filas: [
      f("m15-a", "A.D. Francesa", false, "11:00"),
      f("m15-b", "A.D. Francesa", false, "09:30"),
      f("m15-c", null, true, ""),
      f("m15-d", "BACRC", false, "11:00"),
      f("m16-a", "San Albano", true, "11:00"),
      f("m16-b", "San Albano", true, "09:30"),
      f("m16-c", "C.U. de Quilmes", true, "11:00"),
      f("m16-d", "C.U. de Quilmes", true, "09:30"),
      f("m17-a", "Lomas Athletic", false, "14:00"),
      f("m17-b", "Lomas Athletic", false, "12:30"),
      f("m17-c", null, true, ""),
      f("m19-a", "Belgrano Athletic", true, "14:00"),
      f("m19-b", "Belgrano Athletic", true, "12:30"),
      f("m19-c", "Belgrano Athletic", true, "12:30"),
      f("m19-d", "Belgrano Athletic", true, "11:00"),
      f("m19-e", "Belgrano Athletic", true, "12:30"),
    ],
  },
  // M17 A/B fecha 3 reprogramada -- ver comentario arriba.
  {
    numeroFecha: 3,
    fechaISO: "2026-11-08",
    filas: [f("m17-a", "Los Matreros", true, "14:00"), f("m17-b", "Los Matreros", true, "12:30")],
  },
];

/** Asigna la letra del rival (secuencial por grupo de edad+club, en el orden de las filas). */
function conLetraDeRival(filas: FilaFixture[]): Map<string, { rival: string; esLibre: boolean }> {
  const contadores = new Map<string, number>();
  const resultado = new Map<string, { rival: string; esLibre: boolean }>();
  for (const fila of filas) {
    if (fila.rivalBase === null) {
      resultado.set(fila.categoriaId, { rival: "Libre", esLibre: true });
      continue;
    }
    const key = `${edadDe(fila.categoriaId)}|${fila.rivalBase}`;
    const n = (contadores.get(key) ?? 0) + 1;
    contadores.set(key, n);
    const letra = String.fromCharCode(64 + n); // 1 -> A, 2 -> B, ...
    resultado.set(fila.categoriaId, { rival: `${fila.rivalBase} ${letra}`, esLibre: false });
  }
  return resultado;
}

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");

  const batch = adminDb.batch();
  let count = 0;

  for (const fecha of FECHAS) {
    const letras = conLetraDeRival(fecha.filas);
    for (const fila of fecha.filas) {
      const { rival, esLibre } = letras.get(fila.categoriaId)!;
      const pid = partidoId(fila.categoriaId, fecha.numeroFecha);
      const partido: Partido = {
        categoriaId: fila.categoriaId,
        numeroFecha: fecha.numeroFecha,
        fecha: fecha.fechaISO,
        ...(fila.hora ? { hora: fila.hora } : {}),
        rival,
        esLocal: fila.esLocal,
        cancha: esLibre ? "-" : fila.esLocal ? NEWMAN : fila.rivalBase!,
        estado: "programado",
        resultado: { newman: 0, rival: 0 },
        enCanchaIds: [],
        ...(esLibre ? { notaEspecial: "Fecha libre" } : {}),
      };
      batch.set(adminDb.collection("partidos").doc(pid), { ...partido, createdAt: new Date(), updatedAt: new Date() });
      count++;
    }
    console.log(`Fecha ${fecha.numeroFecha} (${fecha.fechaISO}): ${fecha.filas.length} partidos`);
  }

  await batch.commit();
  console.log(`Listo. ${count} partidos cargados.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
