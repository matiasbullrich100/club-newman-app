// Cuentas reales de Designado para los equipos de Juveniles. Correr con:
// npm run seed-designados-juveniles
// A diferencia de plantel superior (usuario = nombre de categoria con espacios, ej. "pre a"),
// aca el usuario pedido no lleva espacio: "m15a", "m15b", etc. Misma clave que el resto de
// los Designados.

import { config } from "dotenv";
import { resolve } from "path";
import { equiposDeEdad } from "../lib/categorias";
import type { Cuenta } from "../types/firestore";

const CLAVE_DESIGNADOS = "dalebordo";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { hashPassword } = await import("../lib/auth/passwords");

  const passwordHash = await hashPassword(CLAVE_DESIGNADOS);
  const equipos = equiposDeEdad("m15");

  console.log("Sembrando cuentas Designado de M15...");
  const batch = adminDb.batch();
  for (const eq of equipos) {
    const username = eq.id.replace("-", ""); // "m15-a" -> "m15a"
    const cuenta: Omit<Cuenta, "createdAt"> = {
      rol: "designado",
      username,
      passwordHash,
      categoriaId: eq.id,
    };
    batch.set(adminDb.collection("cuentas").doc(username), { ...cuenta, createdAt: new Date() });
    console.log(`  usuario: "${username}"  ->  equipo: ${eq.nombre}`);
  }
  await batch.commit();

  console.log(`Listo. Clave: ${CLAVE_DESIGNADOS}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
