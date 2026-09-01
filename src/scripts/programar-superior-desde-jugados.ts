// Para cada categoria de Plantel Superior: toma el horario del ULTIMO partido jugado de local y
// el del ultimo jugado de visitante, y lo deja pre-cargado en los partidos "programado" que
// vienen (local -> horario de local, visitante -> horario de visitante). Para los de local
// tambien pre-carga el numero de cancha del ultimo de local, salvo que ya tenga uno.
//
// Es solo una base para que el resumen de Proxima Fecha no salga vacio -- los horarios reales de
// Plantel Superior cambian fecha a fecha, asi que despues se corrigen desde la pantalla /programar.
//
// Correr con: npm run programar-superior-desde-jugados

import { config } from "dotenv";
import { resolve } from "path";
import { CATEGORIAS_SUPERIOR, partidoId, NUMERO_FECHAS_SUPERIOR } from "../lib/categorias";
import type { Partido } from "../types/firestore";

function comoNumero(n: number | string): number {
  return typeof n === "number" ? n : Number(n);
}

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  const ops: { ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData }[] = [];

  for (const cat of CATEGORIAS_SUPERIOR) {
    const refs = Array.from({ length: NUMERO_FECHAS_SUPERIOR }, (_, i) =>
      adminDb.collection("partidos").doc(partidoId(cat.id, i + 1))
    );
    const snaps = await adminDb.getAll(...refs);
    const partidos = snaps
      .filter((s) => s.exists)
      .map((s) => ({ id: s.id, ...(s.data() as Partido) }))
      .sort((a, b) => comoNumero(a.numeroFecha) - comoNumero(b.numeroFecha));

    const conHora = partidos.filter((p) => typeof p.hora === "string" && p.hora);
    const ultimoLocal = [...conHora].reverse().find((p) => p.esLocal);
    const ultimoVisita = [...conHora].reverse().find((p) => !p.esLocal);

    if (!ultimoLocal && !ultimoVisita) {
      console.log(`${cat.id.padEnd(10)} sin partidos jugados con hora -- se saltea`);
      continue;
    }

    const programadas = partidos.filter((p) => p.estado === "programado");
    let cambios = 0;
    for (const p of programadas) {
      const ref = ultimoLocal && p.esLocal ? ultimoLocal : !p.esLocal ? ultimoVisita : undefined;
      if (!ref?.hora) continue;
      const data: FirebaseFirestore.DocumentData = {};
      if (p.hora !== ref.hora) data.hora = ref.hora;
      // Numero de cancha: solo de local, y solo si el partido todavia no tiene uno.
      if (p.esLocal && ultimoLocal?.numeroCancha && !p.numeroCancha) data.numeroCancha = ultimoLocal.numeroCancha;
      if (Object.keys(data).length === 0) continue;
      data.updatedAt = FieldValue.serverTimestamp();
      ops.push({ ref: adminDb.collection("partidos").doc(p.id), data });
      cambios++;
    }

    console.log(
      `${cat.id.padEnd(10)} local -> ${ultimoLocal?.hora ?? "--"}${ultimoLocal?.numeroCancha ? " c" + ultimoLocal.numeroCancha : ""}` +
        `  visitante -> ${ultimoVisita?.hora ?? "--"}  (${cambios} programadas actualizadas)`
    );
  }

  console.log(`\nTotal de partidos a actualizar: ${ops.length}`);
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
