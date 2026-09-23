// Pre E vs CUBA F (Fecha 23) se adelanta al jueves 2026-09-24 a las 20:30, en CUBA Central, cancha 3.
// Correr con: npx tsx src/scripts/set-pre-e-f23-jueves.ts

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  const ref = adminDb.collection("partidos").doc("pre-e-f23");
  await ref.update({
    fecha: "2026-09-24",
    hora: "20:30",
    cancha: "CUBA Central, Cancha 3",
    updatedAt: FieldValue.serverTimestamp(),
  });
  const d = (await ref.get()).data();
  console.log(d?.rival, d?.esLocal ? "(L)" : "(V)", d?.fecha, d?.hora, d?.cancha);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
