// Acota la cuenta historica "manager"/"fede" a Plantel Superior unicamente -- antes no tenia
// `alcance` y por eso operaba las 5 divisiones; ahora hay un manager por division, sin
// superposicion. Correr con: npm run set-alcance-manager-superior (idempotente).

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  await adminDb.collection("cuentas").doc("manager").update({ alcance: "superior" });
  console.log('Listo: cuenta "manager" (fede) acotada a alcance "superior".');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
