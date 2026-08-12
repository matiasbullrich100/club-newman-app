// Carga la fecha 1 de M16/M17/M19 (domingo 09/08/2026, mismo dia que M15) -- resultados
// transcriptos de la imagen de resumen que paso el club. Correr con:
// npm run migrate-m16-m17-m19-fecha1
// Idempotente: pisa el doc si ya existe (mismo patron que migrate-juveniles-m15-fecha1.ts).
//
// Local/visitante confirmado por el club: M17 jugo de local (en Newman), M16 y M19 de visitante.
// Letra en el nombre del rival (ej. "Hindu A", "Regatas A") SIEMPRE, en TODOS los partidos --
// letra propia del equipo del rival, asignada secuencial (A, B, C...) dentro de cada grupo de
// (edad, club rival) esa fecha, en el orden en que aparecen los equipos de Newman -- no es la
// misma letra que el equipo de Newman (ver ejemplo Virreyes en migrate-juveniles-fixture.ts: nace
// de cual de los equipos del RIVAL nos toco, no de cual de los nuestros somos). La cancha es el
// nombre del club sin letra (es un lugar, no un equipo). Nombres de club iguales a los que ya usa
// Plantel Superior (ver query a Firestore) -- "Regatas" no "Regatas BV/de Bella Vista", "Hindu"
// sin tilde (asi lo tiene cargado el club, no "Hindú"). M19 F no tiene resultado en la imagen (en
// blanco) y tampoco tiene fixture futuro en el excel del club -- queda "programado" en vez de
// "terminado", sin resultado, hasta que haya datos.

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import type { Partido, Resultado } from "../types/firestore";

const FECHA_ISO = "2026-08-09";

interface EquipoFecha1 {
  categoriaId: string;
  rival: string;
  esLocal: boolean;
  cancha: string;
  resultado?: Resultado;
}

const EQUIPOS: EquipoFecha1[] = [
  // M16 -- visitante. Hindu(A,B) y Regatas(C,D) son dos grupos separados -- cada uno arranca su
  // propia numeracion en A, independiente de la letra de Newman.
  { categoriaId: "m16-a", rival: "Hindu A", esLocal: false, cancha: "Hindu", resultado: { newman: 71, rival: 12, bonusNewman: true } },
  { categoriaId: "m16-b", rival: "Hindu B", esLocal: false, cancha: "Hindu", resultado: { newman: 62, rival: 17, bonusNewman: true } },
  { categoriaId: "m16-c", rival: "Regatas A", esLocal: false, cancha: "Regatas", resultado: { newman: 57, rival: 31, bonusNewman: true } },
  { categoriaId: "m16-d", rival: "Regatas B", esLocal: false, cancha: "Regatas", resultado: { newman: 14, rival: 19 } },
  // M17 -- local. La Plata es grupo de 1 (solo m17-c) -- igual arranca en A.
  { categoriaId: "m17-a", rival: "San Martín A", esLocal: true, cancha: "Newman", resultado: { newman: 64, rival: 17, bonusNewman: true } },
  { categoriaId: "m17-b", rival: "San Martín B", esLocal: true, cancha: "Newman", resultado: { newman: 45, rival: 24, bonusNewman: true } },
  { categoriaId: "m17-c", rival: "La Plata A", esLocal: true, cancha: "Newman", resultado: { newman: 33, rival: 64 } },
  // M19 -- visitante, todos contra Regatas (un solo grupo de 6, A a F).
  { categoriaId: "m19-a", rival: "Regatas A", esLocal: false, cancha: "Regatas", resultado: { newman: 47, rival: 24, bonusNewman: true } },
  { categoriaId: "m19-b", rival: "Regatas B", esLocal: false, cancha: "Regatas", resultado: { newman: 28, rival: 24 } },
  { categoriaId: "m19-c", rival: "Regatas C", esLocal: false, cancha: "Regatas", resultado: { newman: 40, rival: 5, bonusNewman: true } },
  { categoriaId: "m19-d", rival: "Regatas D", esLocal: false, cancha: "Regatas", resultado: { newman: 71, rival: 12, bonusNewman: true } },
  { categoriaId: "m19-e", rival: "Regatas E", esLocal: false, cancha: "Regatas", resultado: { newman: 33, rival: 26 } },
  // M19 F -- sin resultado en la imagen ni fixture futuro en el excel, queda programado.
  { categoriaId: "m19-f", rival: "Regatas F", esLocal: false, cancha: "Regatas" },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");

  const batch = adminDb.batch();

  for (const equipo of EQUIPOS) {
    const pid = partidoId(equipo.categoriaId, 1);
    const partido: Partido = {
      categoriaId: equipo.categoriaId,
      numeroFecha: 1,
      fecha: FECHA_ISO,
      rival: equipo.rival,
      esLocal: equipo.esLocal,
      cancha: equipo.cancha,
      estado: equipo.resultado ? "terminado" : "programado",
      resultado: equipo.resultado ?? { newman: 0, rival: 0 },
      enCanchaIds: [],
    };
    batch.set(adminDb.collection("partidos").doc(pid), { ...partido, createdAt: new Date(), updatedAt: new Date() });
    console.log(
      `${equipo.categoriaId}: ${equipo.esLocal ? "vs" : "en"} ${equipo.rival}${
        equipo.resultado ? ` -> ${equipo.resultado.newman}-${equipo.resultado.rival}` : " (sin resultado)"
      }`
    );
  }

  await batch.commit();
  console.log("Listo.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
