// Horarios y rivales de la Fecha 26 de Plantel Superior (sabado 2026-10-17), pasados por el club.
// En Newman: Pre G y Pre F vs Los Tilos 10:15 (3 tiempos de 40 -- sin campo en el modelo, no se carga),
// y vs CUBA: Pre D/B 10:15, Pre E/C/A 12:00, M-22/Inter 13:45, Primera 15:30.
// Pre H de visitante en Pinazo (cancha de Belgrano Athletic) 12:00 vs Belgrano H.
// Correr con: npx tsx src/scripts/set-horarios-superior-fecha26.ts   (DRY_RUN=1 para simular)

import { config } from "dotenv";
import { resolve } from "path";

const FECHA = 26;
const DIA = "2026-10-17";

const DATOS: Record<string, { hora: string; rival?: string; cancha: string; esLocal: boolean }> = {
  "pre-g": { hora: "10:15", rival: "Los Tilos G", cancha: "Newman", esLocal: true },
  "pre-f": { hora: "10:15", rival: "Los Tilos F", cancha: "Newman", esLocal: true },
  "pre-d": { hora: "10:15", cancha: "Newman", esLocal: true },
  "pre-b": { hora: "10:15", cancha: "Newman", esLocal: true },
  "pre-e": { hora: "12:00", cancha: "Newman", esLocal: true },
  "pre-c": { hora: "12:00", cancha: "Newman", esLocal: true },
  "pre-a": { hora: "12:00", cancha: "Newman", esLocal: true },
  "m-22": { hora: "13:45", cancha: "Newman", esLocal: true },
  intermedia: { hora: "13:45", cancha: "Newman", esLocal: true },
  primera: { hora: "15:30", cancha: "Newman", esLocal: true },
  "pre-h": { hora: "12:00", rival: "Belgrano H", cancha: "Pinazo", esLocal: false },
};

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  for (const [categoriaId, datos] of Object.entries(DATOS)) {
    const ref = adminDb.collection("partidos").doc(`${categoriaId}-f${FECHA}`);
    const snap = await ref.get();
    if (!snap.exists || snap.data()!.estado !== "programado") {
      console.log(`${categoriaId.padEnd(10)} se saltea (${snap.exists ? snap.data()!.estado : "no existe"})`);
      continue;
    }
    const a = snap.data()!;
    console.log(
      `${categoriaId.padEnd(10)} ${DIA} ${datos.hora} | ${datos.cancha} | ${datos.esLocal ? "L" : "V"} vs ${datos.rival ?? a.rival}   (antes: ${a.fecha} ${a.hora ?? "-"} | ${a.cancha} | vs ${a.rival})`
    );
    if (dryRun) continue;
    await ref.update({ ...datos, fecha: DIA, updatedAt: FieldValue.serverTimestamp() });
  }
  if (dryRun) console.log("(DRY RUN) nada escrito.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
