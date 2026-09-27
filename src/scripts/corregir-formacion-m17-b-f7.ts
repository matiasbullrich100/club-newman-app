// M17 B vs D. Francesa B (Fecha 7, domingo 2026-09-27): la formacion real difiere bastante de la
// que se habia cargado desde la planilla de URBA (que resulto no reflejar el equipo que jugo). El
// club mando la formacion verdadera ("M17 Equipos 2026", hoja de plantel con % de presentismo).
// El partido ya esta EN VIVO pero sin incidencias cargadas todavia, asi que se puede pisar el
// plantel entero sin dejar jugadas huerfanas.
// Nombres tomados con la ortografia ya existente en jugadores/ (mismo jugador usado en otras
// fechas de M17) para que el id cruce igual: Bosch Justo, Benegas Felix, Belaustegui Facundo,
// Polizza Juan Diego, Goti Vicente, Cirio Simon, Uranga Bautista, De Undurraga Joaquin, Vallejos
// Silvestre, De Achaval Mateo, Medinger Marcos, Santamarina Juan.
// Correr con: npx tsx src/scripts/corregir-formacion-m17-b-f7.ts

import { config } from "dotenv";
import { resolve } from "path";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const TITULARES = [
  "Delfino, Ignacio",
  "Vallejos, Silvestre",
  "De Achaval, Mateo",
  "Lissarrague, Pedro",
  "Medinger, Marcos",
  "Bosch, Justo",
  "Benegas, Felix",
  "Santamarina, Juan",
  "Leupold, Francisco",
  "Marino Aguirre, Agustin",
  "Zavala, Jean",
  "Belaustegui, Facundo",
  "Pommer, Simon",
  "Polizza, Juan Diego",
  "Galice Naon, Felix",
];

const SUPLENTES: [string, string][] = [
  ["16", "Buchanan, Esteban"],
  ["17", "De Undurraga, Joaquin"],
  ["18", "Huber, Ramon"],
  ["19", "Diaz Herrera, Pedro"],
  ["20", "Goti, Vicente"],
  ["21", "Cirio, Simon"],
  ["22", "Uranga, Bautista"],
  ["23", "Zavala, Sawens"],
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  const partidoRef = adminDb.collection("partidos").doc("m17-b-f7");
  const snap = await partidoRef.get();
  if (!snap.exists) throw new Error("m17-b-f7 no existe");
  const incidentes = await partidoRef.collection("incidentes").get();
  if (!incidentes.empty) throw new Error(`Hay ${incidentes.size} incidencias cargadas -- no se puede pisar el plantel a ciegas, revisar a mano.`);

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
  const batch = adminDb.batch();
  for (const d of plantelSnap.docs) batch.delete(d.ref);
  for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
  const titularesIds = jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre));
  batch.update(partidoRef, {
    enCanchaIds: titularesIds,
    formacionActualizadaEn: new Date(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  console.log(`Listo. ${jugadores.length} jugadores (${titularesIds.length} titulares).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
