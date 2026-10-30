// REACTIVA todas las cuentas suspendidas con src/scripts/suspender-cuentas.ts (saca el campo `suspendida`). No cambia
// ninguna clave. Correr con: npx tsx src/scripts/reactivar-cuentas.ts   (DRY_RUN=1 para solo listar)
import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");
  const snap = await adminDb.collection("cuentas").get();
  const batch = adminDb.batch();
  let n = 0;
  for (const d of snap.docs) {
    if (d.data().suspendida !== true) continue;
    console.log(`${dryRun ? "(simula) " : ""}reactiva ${d.id} (${d.data().rol})`);
    batch.update(d.ref, { suspendida: FieldValue.delete() });
    n++;
  }
  if (!dryRun) await batch.commit();
  console.log(dryRun ? `(DRY RUN) ${n} cuentas se reactivarian.` : `Listo. ${n} cuentas reactivadas.`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
