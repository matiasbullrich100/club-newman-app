// M16 D, domingo 2026-10-18: el fixture tiene "Libre" en la Fecha 10 (25/10), pero el club arreglo un
// amistoso contra SIC, 09:30 en Newman. Mismo criterio que M15 D (set-amistoso-m15-d-fecha8): la fecha
// libre pasa a "SIC" (amistoso), con el dia y hora reales, local en Newman y sin la nota "Fecha libre".
// Correr con: npx tsx src/scripts/set-amistoso-m16-d-sic.ts   (DRY_RUN=1 para simular)

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  const ref = adminDb.collection("partidos").doc("m16-d-f10");
  const snap = await ref.get();
  const d = snap.data();
  if (!snap.exists || d?.estado !== "programado" || d?.notaEspecial !== "Fecha libre") throw new Error("m16-d-f10 no esta como se esperaba");
  console.log(`m16-d-f10: ${d.fecha} ${d.hora} rival "${d.rival}" nota "${d.notaEspecial}" -> 2026-10-18 09:30 rival "SIC", Newman, amistoso`);
  if (dryRun) return console.log("(DRY RUN) nada escrito.");
  await ref.update({
    fecha: "2026-10-18",
    hora: "09:30",
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
