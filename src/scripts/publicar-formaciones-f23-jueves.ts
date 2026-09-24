// Publica las formaciones de los 3 partidos del jueves 2026-09-24 (Pre E vs CUBA F, Pre G vs Pre H).
// Equivale a publicarFormacion() de la app: solo marca formacionPublicada: true.
// Correr con: npx tsx src/scripts/publicar-formaciones-f23-jueves.ts

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  for (const id of ["pre-e-f23", "pre-g-f23", "pre-h-f23"]) {
    const ref = adminDb.collection("partidos").doc(id);
    const estado = (await ref.get()).data()?.estado;
    if (estado !== "programado") throw new Error(`${id}: estado "${estado}"`);
    await ref.update({ formacionPublicada: true, updatedAt: FieldValue.serverTimestamp() });
    const d = (await ref.get()).data();
    const n = (await ref.collection("plantel").get()).size;
    console.log(id, "publicada:", d?.formacionPublicada, "| plantel:", n, "|", d?.fecha, d?.hora, "vs", d?.rival);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
