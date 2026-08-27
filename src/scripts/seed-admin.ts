// Cuenta "admin" (clave "admin") -- rol manager SIN alcance, mismo fallback sin
// restriccion que ya soporta puedeOperarCategoria/puedeVerEstadisticas para "alcance ausente"
// (ver src/lib/auth/scope.ts). Pensada para cargar formaciones de cualquier division como
// borrador (formacionPublicada: false) y publicarlas cuando el club lo comunique -- ver
// publicarFormacion en src/lib/match/actions.ts. Correr con: npm run seed-admin (idempotente).

import { config } from "dotenv";
import { resolve } from "path";
import type { Cuenta } from "../types/firestore";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { hashPassword } = await import("../lib/auth/passwords");

  const passwordHash = await hashPassword("admin");
  const cuenta: Omit<Cuenta, "createdAt"> = {
    rol: "manager",
    username: "admin",
    passwordHash,
  };
  await adminDb.collection("cuentas").doc("admin").set({ ...cuenta, createdAt: new Date() }, { merge: true });
  // Borra la cuenta vieja "administrador" si existe (migracion de username -- ver docs/auth-and-roles.md).
  await adminDb.collection("cuentas").doc("administrador").delete().catch(() => {});
  console.log('Listo: cuenta "admin" (clave "admin"), sin alcance -- acceso a las 5 divisiones.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
