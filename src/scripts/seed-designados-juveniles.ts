// Cuentas reales de Designado para los equipos de Juveniles (M15/M16/M17/M19). Correr con:
// npm run seed-designados-juveniles
// A diferencia de plantel superior (misma clave "dalebordo" para las 11), aca el usuario no lleva
// espacio -- "m15a", "m16b", "m17c", etc. -- y la clave es igual al usuario (pedido explicito del
// club). Idempotente: pisa el doc si ya existe.

import { config } from "dotenv";
import { resolve } from "path";
import { CATEGORIAS_JUVENILES } from "../lib/categorias";
import type { Cuenta } from "../types/firestore";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { hashPassword } = await import("../lib/auth/passwords");

  console.log("Sembrando cuentas Designado de Juveniles (usuario y clave iguales)...");
  const batch = adminDb.batch();
  for (const eq of CATEGORIAS_JUVENILES) {
    const username = eq.id.replace("-", ""); // "m17-a" -> "m17a"
    const passwordHash = await hashPassword(username);
    const cuenta: Omit<Cuenta, "createdAt"> = {
      rol: "designado",
      username,
      passwordHash,
      categoriaId: eq.id,
    };
    batch.set(adminDb.collection("cuentas").doc(username), { ...cuenta, createdAt: new Date() });
    console.log(`  usuario: "${username}"  clave: "${username}"  ->  equipo: ${eq.nombre}`);
  }
  await batch.commit();

  console.log("Listo.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
