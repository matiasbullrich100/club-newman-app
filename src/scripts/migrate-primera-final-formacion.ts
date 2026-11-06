// Primera vs Hindu -- FINAL de playoff, sabado 2026-11-07 17:10 en CASI (partido Fecha 28, fase "final").
// Formacion de la placa del club: 15 titulares (capitan: Alejandro Urtubey) + las "Reservas" 16-23 como suplentes
// (igual que en la semifinal). Se carga la hora (17:10) y la cancha (CASI) y se PUBLICA (pedido explicito).
// Los nombres que ya tenian ficha de la semifinal se escriben igual para no partir al jugador en dos: "Gutierrez
// Taboada, Gonzalo" (la placa dice "G. Taboada") y "Marolda, Santiago" (revisar contra la placa, ver DRY_RUN).
// Idempotente; solo "programado".
// Correr con: npx tsx src/scripts/migrate-primera-final-formacion.ts   (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const PARTIDO = "primera-f28";
const HORA = "17:10";
const CANCHA = "CASI";
const TITULARES: { nombre: string; capitan?: boolean }[] = [
  { nombre: "Prince Miguel" },
  { nombre: "Salese, Beltran" },
  { nombre: "Bosch Bautista" },
  { nombre: "Lascombes, Francisco" },
  { nombre: "Urtubey Alejandro", capitan: true },
  { nombre: "Santarelli, Faustino" },
  { nombre: "Cardinal Paul" },
  { nombre: "Diaz de Vivar Rodrigo" },
  { nombre: "Marguery Lucas" },
  { nombre: "Gutierrez Taboada Gonzalo" },
  { nombre: "Ulloa Jeronimo" },
  { nombre: "Lanfranco Benjamin" },
  { nombre: "Prince Simón" },
  { nombre: "Marolda, Santiago" },
  { nombre: "Daireaux, Juan Bautista" },
];

const SUPLENTES: [string, string][] = [
  ["16", "Perkins Fermín"],
  ["17", "Bosch, Isidro"],
  ["18", "Lozano Manuel"],
  ["19", "Bonasso Bautista"],
  ["20", "Ureta Jerónimo"],
  ["21", "Nava, Lucas"],
  ["22", "Llerena Florencio"],
  ["23", "Ortiz Basualdo, Justo"],
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  const ref = adminDb.collection("partidos").doc(PARTIDO);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`${PARTIDO} no existe`);
  const d = snap.data() as { estado?: string; fase?: string; fecha?: string; rival?: string };
  if (d.fase !== "final" || d.fecha !== "2026-11-07") throw new Error(`${PARTIDO}: no es la final del 7/11`);
  if (d.estado !== "programado") throw new Error(`${PARTIDO}: estado "${d.estado}"`);

  const jugadores: JugadorPartido[] = TITULARES.map((t, i) => ({
    nombre: t.nombre,
    dorsal: String(i + 1),
    titular: true,
    enCancha: true,
    ...(t.capitan ? { capitan: true } : {}),
  })).concat(SUPLENTES.map(([dorsal, nombre]) => ({ nombre, dorsal, titular: false, enCancha: false })));
  const ids = new Set<string>();
  for (const j of jugadores) {
    const id = playerId(j.nombre);
    if (ids.has(id)) throw new Error(`"${j.nombre}" repetido (${id})`);
    ids.add(id);
  }
  const plantelSnap = await ref.collection("plantel").get();
  const aBorrar = plantelSnap.docs.filter((x) => !ids.has(x.id));
  console.log(`${PARTIDO} vs ${d.rival} ${HORA} @ ${CANCHA}: ${jugadores.filter((j) => j.titular).length} titulares + ${jugadores.filter((j) => !j.titular).length} suplentes` + (aBorrar.length ? `, borra ${aBorrar.length} viejos` : ""));
  if (dryRun) {
    // Que jugadores ya tienen ficha (para detectar nombres nuevos o mal escritos).
    const fichas = await adminDb.getAll(...jugadores.map((j) => adminDb.collection("jugadores").doc(playerId(j.nombre))));
    for (const [i, f] of fichas.entries()) if (!f.exists) console.log(`  sin ficha todavia: ${jugadores[i].nombre}`);
    return console.log("(DRY RUN) nada escrito.");
  }

  const batch = adminDb.batch();
  for (const x of aBorrar) batch.delete(x.ref);
  for (const j of jugadores) batch.set(ref.collection("plantel").doc(playerId(j.nombre)), j);
  batch.update(ref, {
    hora: HORA,
    cancha: CANCHA,
    formacionPublicada: true,
    enCanchaIds: jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre)),
    formacionActualizadaEn: new Date(),
    updatedAt: new Date(),
  });
  await batch.commit();
  console.log("Listo. Formacion cargada y PUBLICADA.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
