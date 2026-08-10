// Carga el fixture (sin formaciones -- todavia no hay) de la fecha 2 de M15 (A/B/C/D) contra
// Casi, de visitante, domingo 16/08/2026. Correr con: npm run migrate-m15-fecha2
// Idempotente: pisa el doc si ya existe.

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import type { Partido } from "../types/firestore";

const FECHA_ISO = "2026-08-16";
const NUMERO_FECHA = 2;

interface EquipoFecha {
  categoriaId: string;
  rival: string;
  cancha: string;
  hora: string;
}

const EQUIPOS: EquipoFecha[] = [
  { categoriaId: "m15-a", rival: "Casi", cancha: "Casi", hora: "11:00" },
  { categoriaId: "m15-b", rival: "Casi", cancha: "Casi", hora: "09:30" },
  { categoriaId: "m15-c", rival: "Casi", cancha: "Casi", hora: "11:00" },
  { categoriaId: "m15-d", rival: "Casi", cancha: "Casi", hora: "09:30" },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");

  const batch = adminDb.batch();
  for (const equipo of EQUIPOS) {
    const pid = partidoId(equipo.categoriaId, NUMERO_FECHA);
    const partido: Partido = {
      categoriaId: equipo.categoriaId,
      numeroFecha: NUMERO_FECHA,
      fecha: FECHA_ISO,
      hora: equipo.hora,
      rival: equipo.rival,
      esLocal: false,
      cancha: equipo.cancha,
      estado: "programado",
      resultado: { newman: 0, rival: 0 },
      enCanchaIds: [],
    };
    batch.set(adminDb.collection("partidos").doc(pid), { ...partido, createdAt: new Date(), updatedAt: new Date() });
    console.log(`${equipo.categoriaId}: vs ${equipo.rival}, ${equipo.hora} hs en ${equipo.cancha}`);
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
