// SUSPENDE todas las cuentas (designados, managers, entrenadores, demo) salvo "admin": marca `suspendida: true` en
// cuentas/{id}. No toca ninguna clave. Las cuentas suspendidas no pueden iniciar sesion y una sesion ya abierta deja de
// valer (ver lib/auth/suspension.ts). Se revierte con src/scripts/reactivar-cuentas.ts.
// Correr con: npx tsx src/scripts/suspender-cuentas.ts   (DRY_RUN=1 para solo listar)
import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  const snap = await adminDb.collection("cuentas").get();
  if (!snap.docs.some((d) => d.id === "admin")) throw new Error('No existe la cuenta "admin": no se suspende nada');
  const batch = adminDb.batch();
  let n = 0;
  for (const d of snap.docs) {
    if (d.id === "admin") continue;
    console.log(`${dryRun ? "(simula) " : ""}suspende ${d.id} (${d.data().rol})`);
    batch.update(d.ref, { suspendida: true });
    n++;
  }
  if (!dryRun) await batch.commit();
  console.log(dryRun ? `(DRY RUN) ${n} cuentas se suspenderian; admin queda activa.` : `Listo. ${n} cuentas suspendidas; admin queda activa.`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
