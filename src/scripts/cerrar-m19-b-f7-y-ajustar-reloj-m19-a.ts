// M19 B f7 vs BACRC B (2026-09-27): estaba "suspendido" por clima con 12-7 pero el partido SI se jugo
// completo ese dia y gano Newman 12-7 -> pasa a "terminado" (bonus/tries recalculados desde las
// incidencias, como terminarPartido). No se tocan minutos de jugadores/fichas: se desconoce la duracion
// real del 2do tiempo.
// M19 A f7 vs BACRC A: queda "suspendido" (se retoma el domingo 2026-10-18 12:30) pero con el reloj
// retrocedido a 13:00 (el club reinicia en el minuto 13, 7-0 arriba; el try+conversion fueron al 12').
// Correr con: npx tsx src/scripts/cerrar-m19-b-f7-y-ajustar-reloj-m19-a.ts

import { config } from "dotenv";
import { resolve } from "path";
import type { Incidente, Partido } from "../types/firestore";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");
  const { calcularBonus } = await import("../lib/match/bonus");

  // --- M19 B -> terminado
  const refB = adminDb.collection("partidos").doc("m19-b-f7");
  const snapB = await refB.get();
  const b = snapB.data() as Partido;
  if (b.estado !== "suspendido") throw new Error(`m19-b-f7: estado ${b.estado}`);
  if (b.resultado.newman !== 12 || b.resultado.rival !== 7) throw new Error(`m19-b-f7: resultado ${JSON.stringify(b.resultado)}`);
  const incB = (await refB.collection("incidentes").get()).docs.map((d) => d.data() as Incidente);
  const { bonusNewman, bonusRival } = calcularBonus(incB, b.resultado);
  const esTry = (t: string) => t === "try" || t === "try_scrum" || t === "try_penal";
  const triesNewman = incB.filter((i) => esTry(i.tipo) && i.equipo === "newman").length;
  const triesRival = incB.filter((i) => esTry(i.tipo) && i.equipo === "rival").length;
  await refB.update({
    estado: "terminado",
    "resultado.bonusNewman": bonusNewman,
    "resultado.bonusRival": bonusRival,
    "resultado.triesNewman": triesNewman,
    "resultado.triesRival": triesRival,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await refB.collection("liveState").doc("state").update({ motivoInterrupcion: null, clockRunning: false, clockAnchor: null });
  console.log("m19-b-f7 -> terminado", JSON.stringify((await refB.get()).data()!.resultado));

  // --- M19 A: reloj a 13:00
  const refA = adminDb.collection("partidos").doc("m19-a-f7");
  const a = (await refA.get()).data() as Partido;
  if (a.estado !== "suspendido") throw new Error(`m19-a-f7: estado ${a.estado}`);
  await refA.collection("liveState").doc("state").update({ accumulatedSeconds: 780, clockRunning: false, clockAnchor: null });
  console.log("m19-a-f7 reloj -> 13:00, resultado", JSON.stringify(a.resultado), a.fecha, a.hora);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
