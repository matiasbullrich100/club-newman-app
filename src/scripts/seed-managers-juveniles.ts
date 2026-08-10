// Cuentas de Manager por division de Juveniles -- cada una opera solo su division (misma
// jerarquia de poderes que manager/fede, pero acotada). Correr con:
// npm run seed-managers-juveniles
// Usuario y clave iguales (pedido explicito del club, mismo patron que seed-designados-juveniles).

import { config } from "dotenv";
import { resolve } from "path";
import { EDADES } from "../lib/categorias";
import type { Cuenta } from "../types/firestore";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { hashPassword } = await import("../lib/auth/passwords");

  console.log("Sembrando cuentas Manager de division (usuario y clave iguales)...");
  const batch = adminDb.batch();
  for (const edad of EDADES) {
    const username = `manager${edad.id}`; // "m15" -> "managerm15"
    const clave = edad.id; // "m15"
    const passwordHash = await hashPassword(clave);
    const cuenta: Omit<Cuenta, "createdAt"> = {
      rol: "manager",
      username,
      passwordHash,
      alcance: edad.id,
    };
    batch.set(adminDb.collection("cuentas").doc(username), { ...cuenta, createdAt: new Date() });
    console.log(`  usuario: "${username}"  clave: "${clave}"  ->  division: ${edad.nombre}`);
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
