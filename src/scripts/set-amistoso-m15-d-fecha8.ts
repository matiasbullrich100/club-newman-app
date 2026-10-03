// M15 D, domingo 2026-10-04: el fixture decia "Libre" (fecha libre) pero el club arreglo un amistoso
// contra SIC, 09:30 en Newman (placa de formacion "M15D vs SIC"). Saca la nota "Fecha libre", pone
// rival "SIC", local en Newman y marca amistoso. No toca hora ni formacion.
// Correr con: npx tsx src/scripts/set-amistoso-m15-d-fecha8.ts   (DRY_RUN=1 para simular)

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  const ref = adminDb.collection("partidos").doc("m15-d-f8");
  const snap = await ref.get();
  const d = snap.data();
  if (!snap.exists || d?.estado !== "programado" || d?.fecha !== "2026-10-04") throw new Error("m15-d-f8 no esta como se esperaba");
  console.log(`m15-d-f8: rival "${d.rival}" cancha "${d.cancha}" nota "${d.notaEspecial ?? "-"}" -> rival "SIC", cancha "Newman", amistoso, sin nota`);
  if (dryRun) return console.log("(DRY RUN) nada escrito.");
  await ref.update({
    rival: "SIC",
    esLocal: true,
    cancha: "Newman",
    amistoso: true,
    notaEspecial: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log("Listo.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
