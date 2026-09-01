// Para cada categoria de Juveniles: toma el horario mas repetido de sus partidos YA JUGADOS
// (estado "terminado", con hora cargada) y lo aplica a TODOS sus partidos "programado" que
// vienen. La idea: cada equipo suele jugar siempre a la misma hora -- se deja ese horario base
// cargado y despues, antes de cada fecha, se corrige lo que cambie desde la pantalla /programar.
//
// Empate entre horarios: gana el de la fecha jugada mas reciente. Categoria sin ningun partido
// jugado con hora: se saltea y se avisa (hay que cargarla a mano).
//
// Correr con: npm run programar-juveniles-desde-jugados

import { config } from "dotenv";
import { resolve } from "path";
import { CATEGORIAS_JUVENILES, partidoId, NUMERO_FECHAS_JUVENILES } from "../lib/categorias";
import type { Partido } from "../types/firestore";

function comoNumero(n: number | string): number {
  return typeof n === "number" ? n : Number(n);
}

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  const ops: { ref: FirebaseFirestore.DocumentReference; hora: string }[] = [];

  for (const cat of CATEGORIAS_JUVENILES) {
    const refs = Array.from({ length: NUMERO_FECHAS_JUVENILES }, (_, i) =>
      adminDb.collection("partidos").doc(partidoId(cat.id, i + 1))
    );
    const snaps = await adminDb.getAll(...refs);
    const partidos = snaps
      .filter((s) => s.exists)
      .map((s) => ({ id: s.id, ...(s.data() as Partido) }))
      .sort((a, b) => comoNumero(a.numeroFecha) - comoNumero(b.numeroFecha));

    const jugadosConHora = partidos.filter((p) => p.estado === "terminado" && typeof p.hora === "string" && p.hora);
    if (jugadosConHora.length === 0) {
      console.log(`${cat.id.padEnd(7)}  sin partidos jugados con hora -- cargar a mano`);
      continue;
    }

    // Horario mas repetido; empate -> el de la fecha jugada mas reciente.
    const conteo = new Map<string, number>();
    for (const p of jugadosConHora) conteo.set(p.hora!, (conteo.get(p.hora!) ?? 0) + 1);
    const maxVeces = Math.max(...conteo.values());
    const candidatos = [...conteo.entries()].filter(([, v]) => v === maxVeces).map(([h]) => h);
    const horaBase =
      candidatos.length === 1
        ? candidatos[0]
        : [...jugadosConHora].reverse().find((p) => candidatos.includes(p.hora!))!.hora!;

    const distribucion = [...conteo.entries()].map(([h, v]) => `${h}×${v}`).join(" ");
    const programadas = partidos.filter((p) => p.estado === "programado");
    let cambian = 0;
    for (const p of programadas) {
      if (p.hora === horaBase) continue;
      ops.push({ ref: adminDb.collection("partidos").doc(p.id), hora: horaBase });
      cambian++;
    }
    const dudoso = candidatos.length > 1 ? "  (!) horarios dispares en los jugados, revisar" : "";
    console.log(
      `${cat.id.padEnd(7)}  -> ${horaBase}  (jugados: ${distribucion})  ${cambian}/${programadas.length} programadas actualizadas${dudoso}`
    );
  }

  console.log(`\nTotal de partidos a actualizar: ${ops.length}`);
  for (let i = 0; i < ops.length; i += 450) {
    const batch = adminDb.batch();
    for (const op of ops.slice(i, i + 450)) {
      batch.update(op.ref, { hora: op.hora, updatedAt: FieldValue.serverTimestamp() });
    }
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
