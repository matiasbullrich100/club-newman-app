// Rellena resultado.triesNewman / resultado.triesRival en partidos/{id} ya "terminado" que se
// jugaron ANTES de que match/actions.ts empezara a llevar ese contador (ver contarTries y las
// llamadas en publicarIncidente/corregirTipoIncidente/eliminarIncidente/terminarPartido). Corre
// una sola vez; de ahi en mas el contador se mantiene solo y terminarPartido lo recalcula exacto.
//
// Recorre partidoId por partidoId via partidoIdsDeGrupo (superior + las 4 edades de Juveniles),
// filtra "terminado" y cuenta los try/try_scrum/try_penal de la subcoleccion incidentes.
//
// Correr con: npm run backfill-tries-resultado

import { config } from "dotenv";
import { resolve } from "path";
import { EDADES, partidoIdsDeGrupo } from "../lib/categorias";
import type { Incidente, Partido, TipoIncidente } from "../types/firestore";

const TIPOS_TRY: TipoIncidente[] = ["try", "try_scrum", "try_penal"];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  const grupos = ["superior", ...EDADES.map((e) => e.id)];
  const ops: { ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData }[] = [];
  let terminadosVistos = 0;

  for (const grupo of grupos) {
    const idsPartidos = partidoIdsDeGrupo(grupo);
    const partidoSnaps = await adminDb.getAll(...idsPartidos.map((id) => adminDb.collection("partidos").doc(id)));
    const terminados = partidoSnaps.filter((s) => s.exists && (s.data() as Partido).estado === "terminado");
    console.log(`Grupo "${grupo}": ${terminados.length} partidos terminados de ${idsPartidos.length} posibles`);

    for (const snap of terminados) {
      terminadosVistos++;
      const incSnap = await snap.ref.collection("incidentes").where("tipo", "in", TIPOS_TRY).get();
      let triesNewman = 0;
      let triesRival = 0;
      for (const incDoc of incSnap.docs) {
        const inc = incDoc.data() as Incidente;
        if (inc.equipo === "newman") triesNewman++;
        else if (inc.equipo === "rival") triesRival++;
      }
      const actual = snap.data() as Partido;
      if (actual.resultado?.triesNewman === triesNewman && actual.resultado?.triesRival === triesRival) continue;
      ops.push({
        ref: snap.ref,
        data: { "resultado.triesNewman": triesNewman, "resultado.triesRival": triesRival, updatedAt: FieldValue.serverTimestamp() },
      });
    }
  }

  console.log(`\nPartidos terminados escaneados: ${terminadosVistos}`);
  console.log(`Partidos a actualizar: ${ops.length}`);

  for (let i = 0; i < ops.length; i += 450) {
    const batch = adminDb.batch();
    for (const op of ops.slice(i, i + 450)) batch.update(op.ref, op.data);
    await batch.commit();
  }
  console.log("Listo.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
