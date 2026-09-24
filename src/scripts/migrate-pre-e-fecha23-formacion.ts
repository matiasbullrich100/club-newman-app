// Carga la formacion de Pre E vs CUBA F (Fecha 23, jueves 2026-09-24) como BORRADOR
// (formacionPublicada: false). Pasada por el club por texto, con dorsales de suplentes explicitos
// (16, 19, 20, 21, 22, 23 directos; 18 "no directo" -- se carga igual como suplente, la app no
// distingue directo/no directo).
// Correr con: npx tsx src/scripts/migrate-pre-e-fecha23-formacion.ts   (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const TITULARES = [
  "Gassiebayle Ramón",
  "Aramburu Marcos",
  "Aramburu Bautista",
  "Gowland Esteban",
  "Bosch Fermín",
  "Alvarado, Juan",
  "Lanusse, Joaquín",
  "Reyna José",
  "Martinez Roberto",
  "Otero, Benjamín",
  "Pommer, Felipe",
  "Busto, José",
  "Sluzewski Monto, Santiago",
  "García Zavaleta, Fermín",
  "Massone Ramiro",
];

const SUPLENTES: [string, string][] = [
  ["16", "Deane, Santiago"],
  ["18", "Muñoz Tomás"],
  ["19", "Pavlovsky, José María"],
  ["20", "Ibañez Joaquín"],
  ["21", "Lopez Saubidet Martín"],
  ["22", "Pernisek Federico"],
  ["23", "Galarraga, Simón"],
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");

  const pid = partidoId("pre-e", 23);
  const partidoRef = adminDb.collection("partidos").doc(pid);
  const snap = await partidoRef.get();
  if (!snap.exists) throw new Error(`${pid} no existe`);
  const estado = (snap.data() as { estado?: string }).estado;
  if (estado !== "programado") throw new Error(`${pid}: estado "${estado}" (solo "programado")`);

  const jugadores: JugadorPartido[] = [
    ...TITULARES.map((nombre, i) => ({ nombre, dorsal: String(i + 1), titular: true, enCancha: true })),
    ...SUPLENTES.map(([dorsal, nombre]) => ({ nombre, dorsal, titular: false, enCancha: false })),
  ];

  const ids = new Map<string, string>();
  for (const j of jugadores) {
    const id = playerId(j.nombre);
    if (ids.has(id)) throw new Error(`"${j.nombre}" y "${ids.get(id)}" generan el mismo id "${id}"`);
    ids.set(id, j.nombre);
  }
  const plantelSnap = await partidoRef.collection("plantel").get();
  const aBorrar = plantelSnap.docs.filter((d) => !ids.has(d.id));
  const titularesIds = jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre));
  console.log(`${pid}: ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl, borra ${aBorrar.length} viejos`);
  if (dryRun) return;

  const batch = adminDb.batch();
  for (const d of aBorrar) batch.delete(d.ref);
  for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
  batch.update(partidoRef, {
    formacionPublicada: false,
    enCanchaIds: titularesIds,
    formacionActualizadaEn: new Date(),
    updatedAt: new Date(),
  });
  await batch.commit();
  console.log("Listo. Cargada como BORRADOR.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
