// Corrige el nombre de 2 jugadores en TODA la base (plantel, incidentes, enCanchaIds, jugadores/):
//  - Santiago Sluzewski: estaba como "Sluzewski Monto, Santiago" (id viejo) y tambien como
//    "Sluzewski Santiago" (sin coma). Es solo Santiago Sluzewski -> "Sluzewski, Santiago".
//  - Juan Cruz Autilio: estaba como "Autillio ..." (typo, id viejo) y "Autilio Juan Cruz" (sin
//    coma, el sistema leia apellido "Autilio Juan" y nombre "Cruz") -> "Autilio, Juan Cruz".
// Re-indexa los docs del id viejo al id canonico (playerId del nombre correcto) y suma minutos /
// tarjetas / historial en jugadores/. NO toca a otros jugadores parecidos (Sluzewski Monti Ramon,
// Sluzewski Tomas, Autilio Benjamin).
// Correr con: npx tsx src/scripts/corregir-nombres-sluzewski-autilio.ts   (DRY_RUN=1 para simular)

import { config } from "dotenv";
import { resolve } from "path";
import { playerId } from "../lib/players";

const PERSONAS: { canonNombre: string; viejosIds: string[] }[] = [
  { canonNombre: "Sluzewski, Santiago", viejosIds: ["monto santiago sluzewski"] },
  { canonNombre: "Autilio, Juan Cruz", viejosIds: ["autillio cruz juan"] },
];

const PARES_INC: [string, string][] = [
  ["jugadorId", "jugadorNombre"],
  ["jugadorEntraId", "jugadorEntraNombre"],
  ["jugadorSaleId", "jugadorSaleNombre"],
];
const CONTADORES = ["tarjetasAmarillas", "tarjetasDobleAmarilla", "tarjetasRojas", "tarjetasRojas20", "tarjetasAzules"] as const;
const HISTORIALES = ["fechasAmarillas", "fechasDobleAmarilla", "fechasRojas", "fechasRojas20", "fechasAzules"] as const;
const EN_CURSO = new Set(["en_juego", "entretiempo", "suspendido"]);

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");

  const personas = PERSONAS.map((p) => ({ ...p, canonId: playerId(p.canonNombre) }));
  const todosViejos = new Set(personas.flatMap((p) => p.viejosIds));
  const interesa = new Set([...todosViejos, ...personas.map((p) => p.canonId)]);
  const personaDeId = (id: string) => personas.find((p) => p.canonId === id || p.viejosIds.includes(id));

  type Op = () => void;
  const ops: Op[] = [];
  const batch = adminDb.batch();
  const log: string[] = [];
  const conflictos: string[] = [];
  const enCurso: string[] = [];
  const otrosRastros: string[] = [];
  let nOps = 0;
  const add = (fn: Op) => {
    ops.push(fn);
    nOps++;
  };
  void batch;

  const partidos = await adminDb.collection("partidos").get();
  for (const p of partidos.docs) {
    const pd = p.data() as Record<string, unknown>;
    const [plantelSnap, incSnap] = await Promise.all([p.ref.collection("plantel").get(), p.ref.collection("incidentes").get()]);

    const afectado =
      plantelSnap.docs.some((d) => interesa.has(d.id)) ||
      incSnap.docs.some((d) => PARES_INC.some(([f]) => interesa.has((d.data() as Record<string, string>)[f]))) ||
      ((pd.enCanchaIds as string[] | undefined) ?? []).some((i) => interesa.has(i)) ||
      interesa.has(pd.pateadorHabitualId as string);
    if (!afectado) continue;
    if (EN_CURSO.has(pd.estado as string)) enCurso.push(`${p.id} (${pd.estado})`);

    // 1) plantel
    const idsPlantel = new Set(plantelSnap.docs.map((d) => d.id));
    for (const per of personas) {
      const viejos = plantelSnap.docs.filter((d) => per.viejosIds.includes(d.id));
      const canon = plantelSnap.docs.find((d) => d.id === per.canonId);
      if (viejos.length && canon) conflictos.push(`${p.id}: tiene doc viejo Y canonico de ${per.canonNombre}`);
      for (const v of viejos) {
        log.push(`${p.id}/plantel/${v.id} -> ${per.canonId} ("${(v.data() as { nombre: string }).nombre}" -> "${per.canonNombre}")`);
        add(() => {
          batch.set(p.ref.collection("plantel").doc(per.canonId), { ...v.data(), nombre: per.canonNombre });
          batch.delete(v.ref);
        });
        idsPlantel.add(per.canonId);
      }
      if (canon && (canon.data() as { nombre: string }).nombre !== per.canonNombre) {
        log.push(`${p.id}/plantel/${canon.id} nombre "${(canon.data() as { nombre: string }).nombre}" -> "${per.canonNombre}"`);
        add(() => batch.update(canon.ref, { nombre: per.canonNombre }));
      }
    }

    // 2) enCanchaIds / pateadorHabitualId
    const upd: Record<string, unknown> = {};
    const enCancha = (pd.enCanchaIds as string[] | undefined) ?? [];
    if (enCancha.some((i) => todosViejos.has(i))) {
      const nuevo = [...new Set(enCancha.map((i) => personaDeId(i)?.canonId ?? i))];
      upd.enCanchaIds = nuevo;
      log.push(`${p.id}.enCanchaIds: ${enCancha.filter((i) => todosViejos.has(i)).join(",")} -> id canonico`);
    }
    if (typeof pd.pateadorHabitualId === "string" && todosViejos.has(pd.pateadorHabitualId)) {
      upd.pateadorHabitualId = personaDeId(pd.pateadorHabitualId)!.canonId;
      log.push(`${p.id}.pateadorHabitualId -> id canonico`);
    }
    if (Object.keys(upd).length) add(() => batch.update(p.ref, upd));

    // rastros del id viejo en OTROS campos del partido (solo se reportan)
    const json = JSON.stringify(pd);
    for (const v of todosViejos) if (json.includes(v) && !upd.enCanchaIds && !upd.pateadorHabitualId) otrosRastros.push(`${p.id}: el doc del partido menciona "${v}"`);

    // 3) incidentes
    for (const d of incSnap.docs) {
      const x = d.data() as Record<string, string>;
      const cambios: Record<string, string> = {};
      for (const [fId, fNombre] of PARES_INC) {
        const per = personaDeId(x[fId]);
        if (!per) continue;
        if (x[fId] !== per.canonId) cambios[fId] = per.canonId;
        if (x[fNombre] !== per.canonNombre) cambios[fNombre] = per.canonNombre;
      }
      if (Object.keys(cambios).length) {
        log.push(`${p.id}/inc/${d.id} ${x.tipo}: ${JSON.stringify(cambios)}`);
        add(() => batch.update(d.ref, cambios));
      }
    }
  }

  // 4) jugadores/ (agregado): sumar viejos en el canonico
  for (const per of personas) {
    const refCanon = adminDb.collection("jugadores").doc(per.canonId);
    const snaps = await Promise.all([refCanon.get(), ...per.viejosIds.map((id) => adminDb.collection("jugadores").doc(id).get())]);
    const existentes = snaps.filter((s) => s.exists);
    if (!existentes.length) continue;
    const base = (snaps[0].exists ? snaps[0].data() : existentes[0].data()) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...base, nombre: per.canonNombre };
    merged.minutosJugadosTotal = existentes.reduce((a, s) => a + (((s.data() as Record<string, number>).minutosJugadosTotal) ?? 0), 0);
    for (const c of CONTADORES) merged[c] = existentes.reduce((a, s) => a + (((s.data() as Record<string, number>)[c]) ?? 0), 0);
    for (const h of HISTORIALES) {
      const filas = existentes.flatMap((s) => ((s.data() as Record<string, { incidenteId: string }[]>)[h]) ?? []);
      if (filas.length) merged[h] = [...new Map(filas.map((f) => [f.incidenteId, f])).values()];
    }
    log.push(
      `jugadores/${per.canonId}: fusiona ${existentes.map((s) => s.id).join(" + ")} -> min=${merged.minutosJugadosTotal} amarillas=${merged.tarjetasAmarillas}`
    );
    add(() => {
      batch.set(refCanon, merged);
      for (const id of per.viejosIds) if (snaps.find((s) => s.id === id)?.exists) batch.delete(adminDb.collection("jugadores").doc(id));
    });
  }

  console.log(log.join("\n"));
  console.log(`\n${nOps} operaciones.`);
  if (conflictos.length) console.log("\nCONFLICTOS:\n  " + conflictos.join("\n  "));
  if (otrosRastros.length) console.log("\nOTROS RASTROS (revisar):\n  " + otrosRastros.join("\n  "));
  if (enCurso.length) console.log("\nPARTIDOS EN CURSO afectados (no se escribe):\n  " + enCurso.join("\n  "));
  if (conflictos.length || enCurso.length) throw new Error("Hay conflictos / partidos en curso: se aborta.");
  if (dryRun) return console.log("\n(DRY RUN) nada escrito.");

  for (const op of ops) op();
  await batch.commit();
  console.log("\nListo.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
