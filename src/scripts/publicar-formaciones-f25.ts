// Publica las formaciones de Plantel Superior de la Fecha 25 que estan en borrador. Equivale a
// publicarFormacion() de la app: solo marca formacionPublicada: true en partidos "programado".
// Correr con: npx tsx src/scripts/publicar-formaciones-f25.ts

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  const ids = ["primera", "intermedia", "pre-a", "pre-b", "m-22", "pre-c", "pre-d", "pre-e", "pre-f", "pre-g"];
  const batch = adminDb.batch();
  let n = 0;
  for (const c of ids) {
    const ref = adminDb.collection("partidos").doc(`${c}-f25`);
    const snap = await ref.get();
    const d = snap.data();
    if (!snap.exists || d?.estado !== "programado" || d.formacionPublicada !== false) {
      console.log(`${c}: se saltea (${snap.exists ? `${d?.estado}, publicada=${d?.formacionPublicada}` : "no existe"})`);
      continue;
    }
    const plantel = (await ref.collection("plantel").get()).size;
    batch.update(ref, { formacionPublicada: true, updatedAt: FieldValue.serverTimestamp() });
    console.log(`publica ${c}-f25 (${plantel} jugadores) vs ${d.rival}`);
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
