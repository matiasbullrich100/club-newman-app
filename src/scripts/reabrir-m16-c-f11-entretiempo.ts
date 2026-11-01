// M16 C vs C.U.Q. A (2026-11-01): el designado apreto "Terminar partido" por error en el 1er tiempo (queria "Final 1er
// tiempo"). Se deshace el fin de partido y se deja el partido en ENTRETIEMPO, con el 1T cerrado en 2207 s (37 min, como
// lo dejo el reloj): el designado solo tiene que apretar "Iniciar 2do tiempo". Pasos (igual que retomar2T + cortar1T):
//  - borra el incidente fin_partido y agrega fin_1t en el mismo segundo;
//  - revierte el increment de minutosJugadosTotal que hizo terminarPartido (se vuelve a sumar al terminar de verdad);
//  - limpia minutosJugados1T/2T del plantel del partido (los recalcula terminarPartido);
//  - estado "entretiempo"; el reloj queda frenado, sin period2DurationSeconds.
// Correr con: npx tsx src/scripts/reabrir-m16-c-f11-entretiempo.ts   (DRY_RUN=1 para mirar)

import { config } from "dotenv";
import { resolve } from "path";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { calcularMinutos, type CambioEvento, type JugadorInput } from "../lib/match/minutes";
import type { Incidente, JugadorPartido, LiveState } from "../types/firestore";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  const partidoRef = adminDb.collection("partidos").doc("m16-c-f11");
  const liveStateRef = partidoRef.collection("liveState").doc("state");

  await adminDb.runTransaction(async (tx) => {
    const [partidoSnap, liveSnap, plantelSnap, incSnap] = await Promise.all([
      tx.get(partidoRef),
      tx.get(liveStateRef),
      tx.get(partidoRef.collection("plantel")),
      tx.get(partidoRef.collection("incidentes")),
    ]);
    const estado = partidoSnap.data()?.estado;
    const live = liveSnap.data() as LiveState;
    if (estado !== "terminado" || live.periodo !== "1T") throw new Error(`No aplica (estado ${estado}, periodo ${live.periodo})`);

    const fin = incSnap.docs.filter((d) => (d.data() as Incidente).tipo === "fin_partido");
    if (fin.length !== 1) throw new Error(`Esperaba 1 fin_partido y hay ${fin.length}`);

    const plantel: JugadorInput[] = plantelSnap.docs.map((d) => ({ jugadorId: d.id, titular: (d.data() as JugadorPartido).titular }));
    const cambios: CambioEvento[] = incSnap.docs
      .map((d) => d.data() as Incidente)
      .filter((i) => i.tipo === "cambio")
      .map((i) => ({ periodo: i.periodo, minuto: i.minuto, jugadorSaleId: i.jugadorSaleId, jugadorEntraId: i.jugadorEntraId }));
    const minutos = calcularMinutos(plantel, cambios, (live.period1DurationSeconds ?? 0) / 60, (live.period2DurationSeconds ?? 0) / 60);
    const acumulado = live.period1DurationSeconds ?? live.accumulatedSeconds;
    console.log(`1T = ${acumulado}s; ${plantel.length} jugadores; revierte ${Object.values(minutos).reduce((s, m) => s + m.minutos1T + m.minutos2T, 0)} min en total`);
    if (dryRun) return;

    tx.delete(fin[0].ref);
    const fin1t: Incidente = {
      tipo: "fin_1t",
      periodo: "1T",
      minuto: Math.floor(acumulado / 60) + 1,
      segundoAbsoluto: Math.floor(acumulado),
      publicadoPorCuentaId: "m16c",
      createdAt: Timestamp.now(),
    };
    tx.set(partidoRef.collection("incidentes").doc(), fin1t);
    for (const j of plantel) {
      const m = minutos[j.jugadorId];
      tx.set(adminDb.collection("jugadores").doc(j.jugadorId), { minutosJugadosTotal: FieldValue.increment(-(m.minutos1T + m.minutos2T)) }, { merge: true });
      tx.update(partidoRef.collection("plantel").doc(j.jugadorId), { minutosJugados1T: FieldValue.delete(), minutosJugados2T: FieldValue.delete() });
    }
    tx.update(partidoRef, { estado: "entretiempo", updatedAt: FieldValue.serverTimestamp() });
    tx.update(liveStateRef, { clockRunning: false, clockAnchor: null, accumulatedSeconds: acumulado, period1DurationSeconds: acumulado, period2DurationSeconds: FieldValue.delete() });
  });
  console.log(dryRun ? "(DRY RUN) nada escrito." : "Listo: M16 C quedo en entretiempo.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
