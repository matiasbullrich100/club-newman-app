// FINAL del Nacional de Clubes: Primera vs Tala RC, sabado 2026-11-21 19:40 en la cancha de Tala RC (Cordoba), Newman
// visitante. Crea el partido (Fecha 29, fase "final", torneo "Nacional de Clubes": no es del campeonato de URBA) y carga
// la formacion de la placa del club: 15 titulares (capitan: Alejandro Urtubey) + las "Reservas" 16-23 como suplentes
// (igual que en la semifinal y la final del playoff). Queda como BORRADOR (formacionPublicada: false).
// Nombres: se usa el ya guardado en la base para cada jugador (jugadores/ o plantel de Primera) si el id coincide; si es
// nuevo se lista al correr, junto con los nombres casi iguales a uno ya guardado (posible errata).
// Idempotente: si el partido ya existe no le pisa nada salvo la formacion; solo actua si esta "programado".
// Correr con: npx tsx src/scripts/cargar-final-nacional-primera.ts   (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const PARTIDO = partidoId("primera", 29);

const TITULARES: { nombre: string; capitan?: boolean }[] = [
  { nombre: "Prince, Miguel" },
  { nombre: "Salese, Beltrán" },
  { nombre: "Bosch, Bautista" },
  { nombre: "Cardinal, Paul" },
  { nombre: "Urtubey, Alejandro", capitan: true },
  { nombre: "Santarelli, Faustino" },
  { nombre: "De la Vega, Joaquín" },
  { nombre: "Diaz de Vivar, Rodrigo" },
  { nombre: "Marguery, Lucas" },
  { nombre: "Gutierrez Taboada, Gonzalo" }, // la placa dice "G. Taboada"
  { nombre: "Ulloa, Jerónimo" },
  { nombre: "Lanfranco, Benjamín" },
  { nombre: "Ulloa, Cruz" },
  { nombre: "Marolda, Santiago" },
  { nombre: "Daireaux, Juan Bautista" },
];
const SUPLENTES: [string, string][] = [
  ["16", "Bosch, Isidro"],
  ["17", "Perkins, Fermín"],
  ["18", "Lozano, Manuel"],
  ["19", "Lascombes, Francisco"],
  ["20", "Ureta, Jerónimo"],
  ["21", "Bonasso, Bautista"],
  ["22", "Nava, Lucas"],
  ["23", "Ortiz Basualdo, Justo"],
];

function distancia(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  if (dryRun) console.log("== DRY RUN: no se escribe nada ==\n");

  // Nombres ya guardados: id -> nombre exacto (jugadores/ y el plantel de todas las fechas de Primera).
  const previos = new Map<string, string>();
  (await adminDb.collection("jugadores").get()).docs.forEach((d) => {
    const n = (d.data() as { nombre?: string }).nombre;
    if (n) previos.set(d.id, n);
  });
  await Promise.all(
    Array.from({ length: 28 }, (_, i) => adminDb.collection("partidos").doc(partidoId("primera", i + 1))).map(async (r) => {
      (await r.collection("plantel").get()).docs.forEach((d) => {
        const n = (d.data() as { nombre?: string }).nombre;
        if (n && !previos.has(d.id)) previos.set(d.id, n);
      });
    })
  );

  const nuevos: string[] = [];
  const parecidos: string[] = [];
  const jugadores: JugadorPartido[] = [];
  const agregar = (raw: string, dorsal: string, titular: boolean, capitan?: boolean) => {
    const previo = previos.get(playerId(raw));
    const nombre = previo ?? raw;
    if (!previo) {
      nuevos.push(`#${dorsal}: ${nombre}`);
      const id = playerId(nombre);
      const cerca = [...previos.entries()].filter(([otro]) => distancia(id, otro) <= 2).map(([, n]) => n);
      if (cerca.length) parecidos.push(`#${dorsal}: "${nombre}" se parece a guardado: ${cerca.join(" | ")}`);
    }
    jugadores.push({ nombre, dorsal, titular, enCancha: titular, ...(capitan ? { capitan: true } : {}) });
  };
  TITULARES.forEach((t, i) => agregar(t.nombre, String(i + 1), true, t.capitan));
  SUPLENTES.forEach(([dorsal, n]) => agregar(n, dorsal, false));

  const ids = new Map<string, string>();
  for (const j of jugadores) {
    const id = playerId(j.nombre);
    if (ids.has(id)) throw new Error(`"${j.nombre}" y "${ids.get(id)}" generan el mismo id "${id}"`);
    ids.set(id, j.nombre);
  }
  const titularesIds = jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre));

  const ref = adminDb.collection("partidos").doc(PARTIDO);
  const snap = await ref.get();
  if (snap.exists && (snap.data() as { estado?: string }).estado !== "programado") {
    console.warn(`SALTEADO ${PARTIDO}: estado "${(snap.data() as { estado?: string }).estado}"`);
    return;
  }
  console.log(`${PARTIDO}: ${snap.exists ? "ya existe" : "SE CREA"} | Primera vs Tala RC, 2026-11-21 19:40, visitante | ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl`);
  console.log(nuevos.length ? "\nJugadores NUEVOS (revisar nombre):\n  " + nuevos.join("\n  ") : "\nSin jugadores nuevos.");
  if (parecidos.length) console.log("\nPARECIDOS a un nombre ya guardado (posible errata):\n  " + parecidos.join("\n  "));
  if (dryRun) return console.log("\n(DRY RUN) nada escrito.");

  if (!snap.exists) {
    await ref.set({
      categoriaId: "primera",
      numeroFecha: 29,
      fase: "final",
      torneo: "Nacional de Clubes",
      fecha: "2026-11-21",
      hora: "19:40",
      rival: "Tala RC",
      esLocal: false,
      cancha: "Tala RC (Córdoba)",
      estado: "programado",
      resultado: { newman: 0, rival: 0 },
      enCanchaIds: [],
      formacionPublicada: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  const plantelSnap = await ref.collection("plantel").get();
  const batch = adminDb.batch();
  for (const d of plantelSnap.docs) if (!ids.has(d.id)) batch.delete(d.ref);
  for (const j of jugadores) batch.set(ref.collection("plantel").doc(playerId(j.nombre)), j);
  batch.update(ref, { formacionPublicada: false, enCanchaIds: titularesIds, formacionActualizadaEn: new Date(), updatedAt: new Date() });
  await batch.commit();
  console.log("\nListo. Partido creado y formacion cargada como BORRADOR (sin publicar).");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
