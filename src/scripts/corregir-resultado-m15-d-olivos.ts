// Corrige el amistoso de M15 D vs Olivos (9/10): fue 17-29 (perdio Newman), no 20-40.
// Correr con: npx tsx src/scripts/corregir-resultado-m15-d-olivos.ts

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  const ref = adminDb.collection("partidos").doc("m15-d-f9");
  const d = (await ref.get()).data();
  if (d?.estado !== "terminado" || d.rival !== "Olivos" || d.resultado?.newman !== 20 || d.resultado?.rival !== 40) {
    throw new Error(`Estado inesperado: ${JSON.stringify(d?.resultado)}`);
  }
  await ref.update({ resultado: { newman: 17, rival: 29 }, updatedAt: FieldValue.serverTimestamp() });
  console.log(JSON.stringify((await ref.get()).data()?.resultado));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
