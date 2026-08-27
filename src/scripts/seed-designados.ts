// Cuentas reales de Designado, una por categoria. Correr con: npm run seed-designados
// Usuario = id de la categoria sin guion ni espacio (ej. "pre-a" -> "prea", "m-22" -> "m22"),
// mismo patron que los designados de Juveniles. "intermedia" es caso especial: usuario "inter".
// Misma clave para las 11. Idempotente: pisa el doc si ya existe y borra el doc con el nombre
// viejo (con espacio) si quedo de una corrida anterior.

import { config } from "dotenv";
import { resolve } from "path";
import { CATEGORIAS_SUPERIOR } from "../lib/categorias";
import type { Cuenta } from "../types/firestore";

const CLAVE_DESIGNADOS = "dalebordo";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { hashPassword } = await import("../lib/auth/passwords");

  const passwordHash = await hashPassword(CLAVE_DESIGNADOS);

  console.log("Sembrando cuentas Designado (una por categoria)...");
  const batch = adminDb.batch();
  for (const cat of CATEGORIAS_SUPERIOR) {
    const username = cat.id === "intermedia" ? "inter" : cat.id.replace("-", "");
    const usuarioViejo = cat.id.replace("-", " "); // nombre con espacio de la version anterior
    const cuenta: Omit<Cuenta, "createdAt"> = {
      rol: "designado",
      username,
      passwordHash,
      categoriaId: cat.id,
    };
    batch.set(adminDb.collection("cuentas").doc(username), { ...cuenta, createdAt: new Date() });
    if (usuarioViejo !== username) {
      batch.delete(adminDb.collection("cuentas").doc(usuarioViejo));
    }
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
