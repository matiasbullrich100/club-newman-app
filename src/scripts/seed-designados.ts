// Cuentas reales de Designado, una por categoria. Correr con: npm run seed-designados
// Usuario = nombre de la categoria en minuscula (espacio en vez de guion), misma clave para
// las 11. Idempotente: pisa el doc si ya existe (permite recorrer de nuevo si cambia la clave).

import { config } from "dotenv";
import { resolve } from "path";
import { CATEGORIAS } from "../lib/categorias";
import type { Cuenta } from "../types/firestore";

const CLAVE_DESIGNADOS = "dalebordo";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { hashPassword } = await import("../lib/auth/passwords");

  const passwordHash = await hashPassword(CLAVE_DESIGNADOS);

  console.log("Sembrando cuentas Designado (una por categoria)...");
  const batch = adminDb.batch();
  for (const cat of CATEGORIAS) {
    const username = cat.id.replace("-", " ");
    const cuenta: Omit<Cuenta, "createdAt"> = {
      rol: "designado",
      username,
      passwordHash,
      categoriaId: cat.id,
    };
    batch.set(adminDb.collection("cuentas").doc(username), { ...cuenta, createdAt: new Date() });
    console.log(`  usuario: "${username}"  ->  categoria: ${cat.nombre}`);
  }
  await batch.commit();

  console.log(`Listo. Clave para las 11 cuentas: ${CLAVE_DESIGNADOS}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
