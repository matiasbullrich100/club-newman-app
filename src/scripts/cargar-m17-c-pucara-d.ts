// M17 C vs Pucara D (local en Newman, viernes 2026-10-16 20:30): es el partido POSTERGADO de la Fecha 6
// de la zona (en la app la Fecha 6 quedo ocupada por el amistoso vs Los Pinos del 13/9), asi que se
// carga en el lugar de la "Fecha libre" (Fecha 7, el "Bye" de Newman C) -- mismo criterio que M17 A/B
// vs Los Matreros. Formacion (planilla del club) como BORRADOR (no publica).
// Idempotente; solo toca partidos "programado". Correr con: npx tsx src/scripts/cargar-m17-c-pucara-d.ts
// (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";
import { FieldValue } from "firebase-admin/firestore";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

function titleCase(nombre: string): string {
  return nombre
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const CATEGORIA = "m17-c";
const NUMERO_FECHA = 7;
const FECHA = "2026-10-16";
const HORA = "20:30";
const RIVAL = "Pucará D";
const TITULARES = ["BUCHANAN, Esteban","DE UNDURRAGA, Joaquin","DE ACHAVAL, Mateo","DIAZ HERRERA, Pedro","BAUSILI, Francisco","VEDOYA, Augusto","MONSEGUR, Geronimo","HUBER, Ramon","CIRIO, Simon","DE LA TOUR, Alejandro","CASTELLI, Joaquin","MOYANO, Nicolas","BELAUSTEGUI, Facundo","WEINERT, Antonio","GARCIA, Gael"];
const SUPLENTES: [string, string][] = [["16","PALMA CANE, Ignacio"],["17","RUIZ, Gustavo"],["18","EIJO, Juan Alejandro"],["19","LASHERAS, Juan Ignacio"],["20","MERELLO, Ignacio"],["21","URANGA, Milo"],["22","SERRA GALLO, Gonzalo"],["23","BUENADER, Ivan"],["24","LANUSSE, Ignacio"]];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  if (dryRun) console.log("== DRY RUN: no se escribe nada ==");

  const pid = partidoId(CATEGORIA, NUMERO_FECHA);
  const partidoRef = adminDb.collection("partidos").doc(pid);
  const snap = await partidoRef.get();
  if (!snap.exists) throw new Error(`${pid} no existe`);
  const d = snap.data() as { estado?: string; notaEspecial?: string };
  if (d.estado !== "programado") throw new Error(`${pid}: estado "${d.estado}"`);

  const jugadores: JugadorPartido[] = [
    ...TITULARES.map((nombre, i) => ({ nombre: titleCase(nombre), dorsal: String(i + 1), titular: true, enCancha: true })),
    ...SUPLENTES.map(([dorsal, nombre]) => ({ nombre: titleCase(nombre), dorsal, titular: false, enCancha: false })),
  ];
  if (TITULARES.length !== 15) throw new Error(`${TITULARES.length} titulares`);
  const ids = new Map<string, string>();
  for (const j of jugadores) {
    const id = playerId(j.nombre);
    if (ids.has(id)) throw new Error(`"${j.nombre}" y "${ids.get(id)}" generan el mismo id "${id}"`);
    ids.set(id, j.nombre);
  }
  const plantelSnap = await partidoRef.collection("plantel").get();
  const aBorrar = plantelSnap.docs.filter((x) => !ids.has(x.id));
  const titularesIds = jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre));
  console.log(`${pid}: ${d.notaEspecial ?? "-"} -> vs ${RIVAL} ${FECHA} ${HORA} -- ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl` + (aBorrar.length ? `, borra ${aBorrar.length} viejos` : ""));
  if (dryRun) return console.log("(DRY RUN) nada escrito.");

  const batch = adminDb.batch();
  for (const x of aBorrar) batch.delete(x.ref);
  for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
  batch.update(partidoRef, {
    fecha: FECHA,
    hora: HORA,
    rival: RIVAL,
    esLocal: true,
    cancha: "Newman",
    notaEspecial: FieldValue.delete(),
    formacionPublicada: false,
    enCanchaIds: titularesIds,
    formacionActualizadaEn: new Date(),
    updatedAt: new Date(),
  });
  await batch.commit();
  console.log("Listo. Formacion cargada como BORRADOR (sin publicar).");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
