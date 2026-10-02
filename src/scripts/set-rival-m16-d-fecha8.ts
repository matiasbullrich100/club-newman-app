// M16 D Fecha 8 (domingo 2026-10-04): el club confirma que C y D juegan contra El Retiro (A y B);
// el fixture traia "Hurling B" para M16 D. Se cambia solo el rival. Correr con: npx tsx src/scripts/set-rival-m16-d-fecha8.ts

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");
  const ref = adminDb.collection("partidos").doc("m16-d-f8");
  const snap = await ref.get();
  const d = snap.data();
  if (!snap.exists || d!.estado !== "programado") throw new Error("m16-d-f8 no existe o ya no esta programado");
  console.log(`rival: "${d!.rival}" -> "El Retiro B"  (${d!.fecha} ${d!.hora}, local=${d!.esLocal})`);
  await ref.update({ rival: "El Retiro B", updatedAt: FieldValue.serverTimestamp() });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
