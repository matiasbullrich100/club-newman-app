// Pre B Fecha 23 (vs Atl. del Rosario): el ultimo try (2T 40') lo hizo Bullrich, Simón, no Mignone Germán.
// Equivale a corregirJugadorIncidente() de la app: para un try solo cambia el nombre que muestra el feed
// (no hay acumulado por jugador). Correr con: npx tsx src/scripts/corregir-ultimo-try-pre-b-f23.ts

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");

  const partidoRef = adminDb.collection("partidos").doc("pre-b-f23");
  const nuevo = (await partidoRef.collection("plantel").doc("bullrich simon").get()).data();
  if (!nuevo) throw new Error("Bullrich no esta en el plantel");

  const incRef = partidoRef.collection("incidentes").doc("SDvyfxRfInawDB6DdJKO");
  const inc = (await incRef.get()).data();
  if (inc?.tipo !== "try" || inc.equipo !== "newman" || inc.jugadorId !== "german mignone") {
    throw new Error(`Incidente inesperado: ${JSON.stringify(inc)}`);
  }
  await incRef.update({ jugadorId: "bullrich simon", jugadorNombre: nuevo.nombre, dorsal: nuevo.dorsal });
  const d = (await incRef.get()).data();
  console.log(d?.tipo, `${d?.periodo} ${d?.minuto}'`, d?.jugadorNombre, `#${d?.dorsal}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
