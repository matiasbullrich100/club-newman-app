// Numero de cancha de la Fecha 24 de Plantel Superior (sabado 2026-10-03), del pizarron del club.
// Solo estan las que el pizarron trae anotadas (el resto queda sin numero hasta que avisen).
// "Pre G-H" es una sola fila del pizarron (amistoso vs Delta): cancha 5 para los dos.
// La columna "Vest." del pizarron no tiene campo en la app, no se carga.
// Correr con: npx tsx src/scripts/set-canchas-superior-fecha24.ts   (DRY_RUN=1 para simular)

import { config } from "dotenv";
import { resolve } from "path";

const CANCHAS: Record<string, string> = {
  "pre-g": "5",
  "pre-h": "5",
  "pre-d": "3",
  "pre-b": "2",
  primera: "1",
};

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  for (const [categoriaId, numeroCancha] of Object.entries(CANCHAS)) {
    const ref = adminDb.collection("partidos").doc(`${categoriaId}-f24`);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`${categoriaId} no existe, se saltea`);
      continue;
    }
    const d = snap.data()!;
    console.log(
      `${categoriaId.padEnd(8)} ${d.estado} ${d.fecha} ${d.hora ?? "-"} vs ${d.rival}: cancha "${d.numeroCancha ?? ""}" -> "${numeroCancha}"`
    );
    if (d.estado !== "programado") continue;
    if (!dryRun) await ref.update({ numeroCancha, updatedAt: FieldValue.serverTimestamp() });
  }
  if (dryRun) console.log("\n(DRY RUN) nada escrito.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
