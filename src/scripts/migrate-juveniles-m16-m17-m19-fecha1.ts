// Carga la fecha 1 de M16/M17/M19 (domingo 09/08/2026, mismo dia que M15) -- resultados
// transcriptos de la imagen de resumen que paso el club. Correr con:
// npm run migrate-m16-m17-m19-fecha1
// Idempotente: pisa el doc si ya existe (mismo patron que migrate-juveniles-m15-fecha1.ts).
//
// Local/visitante confirmado por el club: M17 jugo de local (en Newman), M16 y M19 de visitante.
// Letra en el nombre del rival (ej. "Hindú A") solo cuando el mismo club le dio equipo a mas de
// un team de Newman esa fecha -- distingue cual de los suyos jugamos, igual criterio que
// migrate-juveniles-m15-fecha1.ts. La cancha es el nombre del club sin letra (es un lugar, no un
// equipo). M19 F no tiene resultado en la imagen (en blanco) y tampoco tiene fixture futuro en el
// excel del club -- queda "programado" en vez de "terminado", sin resultado, hasta que haya datos.

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
  // M16 -- visitante
  { categoriaId: "m16-a", rival: "Hindú A", esLocal: false, cancha: "Hindú", resultado: { newman: 71, rival: 12, bonusNewman: true } },
  { categoriaId: "m16-b", rival: "Hindú B", esLocal: false, cancha: "Hindú", resultado: { newman: 62, rival: 17, bonusNewman: true } },
  { categoriaId: "m16-c", rival: "Regatas BV C", esLocal: false, cancha: "Regatas BV", resultado: { newman: 57, rival: 31, bonusNewman: true } },
  { categoriaId: "m16-d", rival: "Regatas BV D", esLocal: false, cancha: "Regatas BV", resultado: { newman: 14, rival: 19 } },
  // M17 -- local
  { categoriaId: "m17-a", rival: "San Martín A", esLocal: true, cancha: "Newman", resultado: { newman: 64, rival: 17, bonusNewman: true } },
  { categoriaId: "m17-b", rival: "San Martín B", esLocal: true, cancha: "Newman", resultado: { newman: 45, rival: 24, bonusNewman: true } },
  { categoriaId: "m17-c", rival: "La Plata", esLocal: true, cancha: "Newman", resultado: { newman: 33, rival: 64 } },
  // M19 -- visitante, todos contra Regatas BV
  { categoriaId: "m19-a", rival: "Regatas BV A", esLocal: false, cancha: "Regatas BV", resultado: { newman: 47, rival: 24, bonusNewman: true } },
  { categoriaId: "m19-b", rival: "Regatas BV B", esLocal: false, cancha: "Regatas BV", resultado: { newman: 28, rival: 24 } },
  { categoriaId: "m19-c", rival: "Regatas BV C", esLocal: false, cancha: "Regatas BV", resultado: { newman: 40, rival: 5, bonusNewman: true } },
  { categoriaId: "m19-d", rival: "Regatas BV D", esLocal: false, cancha: "Regatas BV", resultado: { newman: 71, rival: 12, bonusNewman: true } },
  { categoriaId: "m19-e", rival: "Regatas BV E", esLocal: false, cancha: "Regatas BV", resultado: { newman: 33, rival: 26 } },
  // M19 F -- sin resultado en la imagen ni fixture futuro en el excel, queda programado.
  { categoriaId: "m19-f", rival: "Regatas BV F", esLocal: false, cancha: "Regatas BV" },
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
