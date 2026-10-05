// Bosch, Justo es de M17 pero figura de bench en M19 E: terminarPartido() de M19 E le puso edadId
// "m19" (re-etiqueta a TODO el plantel, incluso suplentes con 0 minutos) y dejo de aparecer en
// "Buscar otro jugador" de M17. Lo devuelve a m17. Ademas da de alta a De Ezcurra, Justo (esta en el
// listado completo de M17 del club y nunca habia jugado, asi que no existia en jugadores/).
// Correr con: npx tsx src/scripts/corregir-jugadores-m17.ts

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { playerId } = await import("../lib/players");

  const bosch = adminDb.collection("jugadores").doc("bosch justo");
  if (!(await bosch.get()).exists) throw new Error("bosch justo no existe");
  await bosch.update({ edadId: "m17" });

  const idEzcurra = playerId("De Ezcurra, Justo");
  const ezcurra = adminDb.collection("jugadores").doc(idEzcurra);
  if ((await ezcurra.get()).exists) {
    console.log(idEzcurra, "ya existe, no se toca");
  } else {
    await ezcurra.set({ nombre: "De Ezcurra, Justo", grupo: "juveniles", edadId: "m17", minutosJugadosTotal: 0 });
  }

  const m17 = await adminDb.collection("jugadores").where("grupo", "==", "juveniles").where("edadId", "==", "m17").get();
  for (const id of ["bosch justo", idEzcurra]) console.log(id, "en el buscador de M17:", m17.docs.some((d) => d.id === id));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
