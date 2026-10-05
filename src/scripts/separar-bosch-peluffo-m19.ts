// En M19 hay otro Justo Bosch: "Bosch Peluffo, Justo". La planilla del club lo escribia "Bosch, Justo"
// (igual que el de M17), y como la app identifica a los jugadores por nombre, los dos eran la misma
// ficha -- el partido de M19 E pasaba al de M17 a M19 y dejaba de aparecer en el buscador de M17.
// Esto renombra al de M19 en TODOS los plantel de M19 donde figura y le crea su propia ficha en
// jugadores/. El de M17 ("Bosch, Justo", dorsal 9 en M17 C) queda como estaba.
// Correr con: npx tsx src/scripts/separar-bosch-peluffo-m19.ts   (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  const { playerId } = await import("../lib/players");

  const NOMBRE_NUEVO = "Bosch Peluffo, Justo";
  const idViejo = playerId("Bosch, Justo");
  const idNuevo = playerId(NOMBRE_NUEVO);
  console.log(`id viejo "${idViejo}" -> id nuevo "${idNuevo}"`);

  const partidos = await adminDb.collection("partidos").get();
  const batch = adminDb.batch();
  let n = 0;
  for (const p of partidos.docs) {
    const cat = String(p.data().categoriaId);
    if (!cat.startsWith("m19-")) continue;
    const viejo = await p.ref.collection("plantel").doc(idViejo).get();
    if (!viejo.exists) continue;
    const incs = await p.ref.collection("incidentes").get();
    const usado = incs.docs.some((i) => {
      const x = i.data();
      return x.jugadorId === idViejo || x.jugadorSaleId === idViejo || x.jugadorEntraId === idViejo;
    });
    if (usado) throw new Error(`${p.id}: Bosch tiene incidencias, revisar a mano`);
    const data = viejo.data()!;
    if (data.titular || (data.minutosJugados1T ?? 0) + (data.minutosJugados2T ?? 0) > 0) {
      throw new Error(`${p.id}: Bosch jugo en este partido de M19 (${JSON.stringify(data)}), revisar a mano`);
    }
    console.log(`${p.id} (${p.data().estado}): ${JSON.stringify(data)} -> "${NOMBRE_NUEVO}"`);
    batch.delete(viejo.ref);
    batch.set(p.ref.collection("plantel").doc(idNuevo), { ...data, nombre: NOMBRE_NUEVO });
    n++;
  }

  const ficha = adminDb.collection("jugadores").doc(idNuevo);
  if (!(await ficha.get()).exists) {
    batch.set(ficha, { nombre: NOMBRE_NUEVO, grupo: "juveniles", edadId: "m19", minutosJugadosTotal: 0 });
  }
  console.log(`${n} plantel(es) a renombrar`);
  if (dryRun) return console.log("(DRY RUN) nada escrito.");
  await batch.commit();

  const m19 = await adminDb.collection("jugadores").where("grupo", "==", "juveniles").where("edadId", "==", "m19").get();
  const m17 = await adminDb.collection("jugadores").where("grupo", "==", "juveniles").where("edadId", "==", "m17").get();
  console.log("Bosch Peluffo en el buscador de M19:", m19.docs.some((d) => d.id === idNuevo));
  console.log("Bosch, Justo en el buscador de M17:", m17.docs.some((d) => d.id === idViejo));
  console.log("Bosch, Justo en el buscador de M19 (deberia ser false):", m19.docs.some((d) => d.id === idViejo));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
