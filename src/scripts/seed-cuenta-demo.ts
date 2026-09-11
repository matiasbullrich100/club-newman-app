// Cuenta de PRÁCTICA dedicada: un `designado` atado a `categoriaId: "demo"`. Es la única cuenta
// (además del admin/manager sin alcance) que ve "Partidos de Prueba" y puede operar los partidos
// de esa familia (ver lib/partidosPrueba.ts) -- sin tocar ninguna categoría real ni ver el resto
// de la app operativa. Pensada para entrenar designados nuevos sin arriesgar un partido real: cada
// login se lleva su propia copia privada del partido de prueba (ver lib/match/practicaInstancias.ts),
// así que varias personas pueden practicar a la vez sin pisarse.
//
// Correr con: npm run seed-cuenta-demo            (clave por defecto: "demo1234")
//             npm run seed-cuenta-demo -- <clave> (clave a medida)
//
// Idempotente: pisa la cuenta si ya existía (útil para rotar la clave).

import { config } from "dotenv";
import { resolve } from "path";

const CATEGORIA_ID = "demo";
const USERNAME = "demo";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { hashPassword } = await import("../lib/auth/passwords");

  const clave = process.argv[2] ?? "demo1234";

  // Categoría "demo" (marcada isTest -> no aparece en navegación real). Sin esto, la sesión del
  // designado tendría un categoriaId que no resuelve a nada.
  await adminDb.collection("categorias").doc(CATEGORIA_ID).set(
    { nombre: "Demo / Práctica", orden: 99, isTest: true },
    { merge: true }
  );

  await adminDb.collection("cuentas").doc(USERNAME).set({
    rol: "designado",
    username: USERNAME,
    passwordHash: await hashPassword(clave),
    categoriaId: CATEGORIA_ID,
    createdAt: new Date(),
  });

  console.log(`Listo: usuario "${USERNAME}"  clave "${clave}"  -> ve solo Partidos de Prueba.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
