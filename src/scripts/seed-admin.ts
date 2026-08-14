// Cuenta "administrador" (clave "admin") -- rol manager SIN alcance, mismo fallback sin
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
    username: "administrador",
    passwordHash,
  };
  await adminDb.collection("cuentas").doc("administrador").set({ ...cuenta, createdAt: new Date() }, { merge: true });
  console.log('Listo: cuenta "administrador" (clave "admin"), sin alcance -- acceso a las 5 divisiones.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
