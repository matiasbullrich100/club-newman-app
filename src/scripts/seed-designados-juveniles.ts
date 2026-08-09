// Cuentas reales de Designado para los equipos de Juveniles. Correr con:
// npm run seed-designados-juveniles
// A diferencia de plantel superior (usuario = nombre de categoria con espacios, ej. "pre a",
// misma clave "dalebordo" para las 11), aca el usuario pedido no lleva espacio -- "m15a",
// "m15b", etc. -- y la clave es igual al usuario (pedido explicito del club).

import { config } from "dotenv";
import { resolve } from "path";
import { equiposDeEdad } from "../lib/categorias";
import type { Cuenta } from "../types/firestore";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { hashPassword } = await import("../lib/auth/passwords");

  const equipos = equiposDeEdad("m15");

  console.log("Sembrando cuentas Designado de M15 (usuario y clave iguales)...");
  const batch = adminDb.batch();
  for (const eq of equipos) {
    const username = eq.id.replace("-", ""); // "m15-a" -> "m15a"
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
