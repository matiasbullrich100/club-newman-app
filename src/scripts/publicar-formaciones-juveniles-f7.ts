// Publica todas las formaciones en borrador de Juveniles (Fecha 7, domingo 2026-09-27). Equivale al
// "publicar todas" de la app: solo marca formacionPublicada: true en partidos "programado".
// Correr con: npx tsx src/scripts/publicar-formaciones-juveniles-f7.ts

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");
  const { CATEGORIAS_JUVENILES } = await import("../lib/categorias");

  const batch = adminDb.batch();
  let n = 0;
  for (const c of CATEGORIAS_JUVENILES) {
    const ref = adminDb.collection("partidos").doc(`${c.id}-f7`);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const d = snap.data()!;
    if (d.estado !== "programado" || d.formacionPublicada !== false) continue;
    const plantel = (await ref.collection("plantel").get()).size;
    batch.update(ref, { formacionPublicada: true, updatedAt: FieldValue.serverTimestamp() });
    console.log(`publica ${c.id}-f7 (${plantel} jugadores) vs ${d.rival}`);
    n++;
  }
  await batch.commit();
  console.log(`Listo. ${n} formaciones publicadas.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
