// Pre F vs CASI F (Fecha 25, sabado 2026-10-10): termino Newman 111 - 12, pero en la app solo se
// cargaron 3 tries (+3 conversiones) = 21-0. Completa hasta 17 tries y 13 conversiones de Newman
// (17*5 + 13*2 = 111) y 2 tries + 1 conversion del rival (12), a pedido del club:
//  - todos los tries de Newman a Tedin Rufino, uno por minuto (desde el 13 del 1T);
//  - las conversiones al mismo pateador ya anotado (Merello Santiago), en el mismo minuto del try.
// Las jugadas del rival van sin jugador (como las ya cargadas). Correr con:
// npx tsx src/scripts/completar-pre-f-f25.ts   (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";

const TRIES_NUEVOS = 14; // 3 existentes + 14 = 17
const CONVERSIONES_NUEVAS = 10; // 3 existentes + 10 = 13
const PRIMER_MINUTO = 13;
// De los 14 tries nuevos (por orden), los que NO llevan conversion (4 de 14): quedan 10 convertidos.
const SIN_CONVERSION = new Set([4, 8, 11, 14]);

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue, Timestamp } = await import("firebase-admin/firestore");

  const partidoRef = adminDb.collection("partidos").doc("pre-f-f25");
  const partido = (await partidoRef.get()).data()!;
  if (partido.estado !== "terminado" || partido.resultado?.newman !== 21 || partido.resultado?.rival !== 0) {
    throw new Error(`Estado inesperado: ${JSON.stringify(partido.resultado)} / ${partido.estado}`);
  }
  const incSnap = await partidoRef.collection("incidentes").orderBy("createdAt").get();
  type Inc = Record<string, any> & { id: string };
  const incs: Inc[] = incSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, any>) }));
  const tryBase = incs.find((i) => i.tipo === "try" && i.equipo === "newman");
  const convBase = incs.find((i) => i.tipo === "conversion" && i.equipo === "newman");
  const fin = incs.find((i) => i.tipo === "fin_partido");
  if (!tryBase || !convBase || !fin) throw new Error("Faltan incidencias base");
  const ultima = incs.filter((i) => i.tipo !== "fin_partido").at(-1)!;
  // El feed se ordena por createdAt. En este partido el fin_partido se cargo ANTES que los 3 tries/conversiones
  // (se agregaron despues, como correccion), asi que las nuevas siguen a la ultima cargada, de a 1 segundo.
  const N_NUEVAS = 14 + 10 + 3;
  let t = (ultima.createdAt as FirebaseFirestore.Timestamp).toMillis();
  const sigCreatedAt = () => Timestamp.fromMillis((t += 1000));

  const base = { periodo: "1T", publicadoPorCuentaId: "script" };
  const nuevos: Record<string, unknown>[] = [];
  const jug = (b: Record<string, any>) => ({ jugadorId: b.jugadorId, jugadorNombre: b.jugadorNombre, ...(b.dorsal ? { dorsal: b.dorsal } : {}) });
  const seg = (m: number) => (m - 1) * 60 + 30;

  for (let i = 1; i <= TRIES_NUEVOS; i++) {
    const minuto = PRIMER_MINUTO + i - 1;
    nuevos.push({ ...base, tipo: "try", equipo: "newman", minuto, segundoAbsoluto: seg(minuto), puntos: 5, ...jug(tryBase), createdAt: sigCreatedAt() });
    if (!SIN_CONVERSION.has(i)) {
      nuevos.push({ ...base, tipo: "conversion", equipo: "newman", minuto, segundoAbsoluto: seg(minuto) + 20, puntos: 2, ...jug(convBase), createdAt: sigCreatedAt() });
    }
  }
  // Rival: 2 tries (40' y 70') y 1 conversion (40'), sin jugador.
  nuevos.push({ ...base, tipo: "try", equipo: "rival", minuto: 40, segundoAbsoluto: seg(40), puntos: 5, createdAt: sigCreatedAt() });
  nuevos.push({ ...base, tipo: "conversion", equipo: "rival", minuto: 40, segundoAbsoluto: seg(40) + 20, puntos: 2, createdAt: sigCreatedAt() });
  nuevos.push({ ...base, tipo: "try", equipo: "rival", minuto: 70, segundoAbsoluto: seg(70), puntos: 5, createdAt: sigCreatedAt() });

  const tN = nuevos.filter((n) => n.equipo === "newman" && n.tipo === "try").length;
  const cN = nuevos.filter((n) => n.equipo === "newman" && n.tipo === "conversion").length;
  if (tN !== TRIES_NUEVOS || cN !== CONVERSIONES_NUEVAS) throw new Error(`Cuentas: ${tN} tries / ${cN} conversiones`);
  if (nuevos.length !== N_NUEVAS) throw new Error(`Esperaba ${N_NUEVAS} nuevas, hay ${nuevos.length}`);

  const ptsNewman = 21 + nuevos.filter((n) => n.equipo === "newman").reduce((a, n) => a + (n.puntos as number), 0);
  const ptsRival = nuevos.filter((n) => n.equipo === "rival").reduce((a, n) => a + (n.puntos as number), 0);
  console.log(`Newman ${ptsNewman} - ${ptsRival} rival; ${nuevos.length} incidencias nuevas`);
  if (ptsNewman !== 111 || ptsRival !== 12) throw new Error("No da 111-12");
  if (dryRun) return console.log("(DRY RUN) nada escrito.");

  const batch = adminDb.batch();
  for (const n of nuevos) batch.set(partidoRef.collection("incidentes").doc(), n);
  batch.update(partidoRef, {
    "resultado.newman": 111,
    "resultado.rival": 12,
    "resultado.triesNewman": 17,
    "resultado.triesRival": 2,
    "resultado.bonusNewman": true,
    "resultado.bonusRival": false,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  const r = (await partidoRef.get()).data()!.resultado;
  console.log("Listo:", JSON.stringify(r));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
