// Cuentas de Manager por division de Juveniles -- cada una opera solo su division (misma
// jerarquia de poderes que manager/fede, pero acotada). Correr con:
// npm run seed-managers-juveniles
// Usuario "man" + edad (ej. "manm15"), clave = la edad (ej. "m15"). Idempotente: pisa el doc y
// borra el doc con el nombre viejo ("managerm15") si quedo de una corrida anterior.

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
    const username = `man${edad.id}`; // "m15" -> "manm15"
    const usuarioViejo = `manager${edad.id}`; // "managerm15" de la version anterior
    const clave = edad.id; // "m15"
    const passwordHash = await hashPassword(clave);
    const cuenta: Omit<Cuenta, "createdAt"> = {
      rol: "manager",
      username,
      passwordHash,
      alcance: edad.id,
    };
    batch.set(adminDb.collection("cuentas").doc(username), { ...cuenta, createdAt: new Date() });
    batch.delete(adminDb.collection("cuentas").doc(usuarioViejo));
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
