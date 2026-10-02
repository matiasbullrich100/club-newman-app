// Horarios de la Fecha 24 de Plantel Superior (sabado 2026-10-03), tomados de la fila de horarios de
// "FECHA 24 - VS. LOS TILOS.xlsx". Solo horarios -- la cancha/local-visitante se define aparte.
// Pre G y Pre H no juegan la fecha oficial: son AMISTOSOS vs Delta en el Club (Newman), 10:15 (pedido del club).
// Correr con: npx tsx src/scripts/set-horarios-superior-fecha24.ts   (DRY_RUN=1 para simular)

import { config } from "dotenv";
import { resolve } from "path";

const HORAS: Record<string, string> = {
  primera: "15:30",
  intermedia: "13:45",
  "pre-a": "12:00",
  "pre-b": "10:15",
  "m-22": "13:45",
  "pre-c": "12:00",
  "pre-d": "10:15",
  "pre-e": "12:00",
  "pre-f": "13:45",
};

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  for (const [categoriaId, hora] of Object.entries(HORAS)) {
    const ref = adminDb.collection("partidos").doc(`${categoriaId}-f24`);
    const snap = await ref.get();
    if (!snap.exists || snap.data()!.estado !== "programado") {
      console.log(`${categoriaId} se saltea`);
      continue;
    }
    console.log(`${categoriaId.padEnd(10)} ${snap.data()!.hora ?? "-"} -> ${hora}`);
    if (!dryRun) await ref.update({ hora, updatedAt: FieldValue.serverTimestamp() });
  }

  for (const categoriaId of ["pre-g", "pre-h"]) {
    const ref = adminDb.collection("partidos").doc(`${categoriaId}-f24`);
    const snap = await ref.get();
    if (!snap.exists || snap.data()!.estado !== "programado") {
      console.log(`${categoriaId} se saltea`);
      continue;
    }
    const d = snap.data()!;
    console.log(
      `${categoriaId.padEnd(10)} ${d.hora ?? "-"} vs ${d.rival} (${d.cancha ?? "-"}) -> 10:15 AMISTOSO vs Delta, en Newman`
    );
    if (!dryRun) {
      await ref.update({
        rival: "Delta",
        esLocal: true,
        cancha: "Newman",
        hora: "10:15",
        amistoso: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  if (dryRun) console.log("\n(DRY RUN) nada escrito.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
