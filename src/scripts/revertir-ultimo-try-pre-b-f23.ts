// Deshace corregir-ultimo-try-pre-b-f23.ts: el ultimo try de Pre B F23 (2T 40') vuelve a Mignone Germán.
// Correr con: npx tsx src/scripts/revertir-ultimo-try-pre-b-f23.ts

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");

  const partidoRef = adminDb.collection("partidos").doc("pre-b-f23");
  const mignone = (await partidoRef.collection("plantel").doc("german mignone").get()).data();
  if (!mignone) throw new Error("Mignone no esta en el plantel");

  const incRef = partidoRef.collection("incidentes").doc("SDvyfxRfInawDB6DdJKO");
  const inc = (await incRef.get()).data();
  if (inc?.tipo !== "try" || inc.equipo !== "newman" || inc.jugadorId !== "bullrich simon") {
    throw new Error(`Incidente inesperado: ${JSON.stringify(inc)}`);
  }
  await incRef.update({ jugadorId: "german mignone", jugadorNombre: mignone.nombre, dorsal: mignone.dorsal });
  const d = (await incRef.get()).data();
  console.log(d?.tipo, `${d?.periodo} ${d?.minuto}'`, d?.jugadorNombre, `#${d?.dorsal}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
