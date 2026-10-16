// Carga y PUBLICA las formaciones de M15 A y M15 C vs Alumni (Fecha 7, suspendida por tormenta, ahora
// viernes 2026-10-16 19:30 en Alumni), transcriptas de las placas del club (hora de la placa: 19:30).
// Reemplaza el plantel anterior de esos partidos. Idempotente; solo "programado".
// Correr con: npx tsx src/scripts/migrate-m15-a-c-f7-alumni-formaciones.ts   (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";
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

const NUMERO_FECHA = 7;
const FECHA = "2026-10-16";
const HORA = "19:30";

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[];
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "m15-a",
    titulares: ["LLAMBI BOVINO, Felipe","SOLA, Benicio","ARAUJO, Santos","ARNAUDO LOSADA, Ignacio Javier","BENVENUTI, Vito","LOPEZ SAUBIDET, Juan Cruz","LUNA ALURRALDE, Ignacio","MIGUENS, Faustino","PECHAR, Jose","VALVERDE, Manuel","LLAVALLOL, Marcos","GARCÍA IGARZA, Joaquín","REYNAL, Abbott Juan","TISCORNIA, Félix","LOPEZ AUFRANC, Hilario"],
    suplentes: [["16","PEREZ SARTORI, Ramiro"],["17","FIORITO, Jaime"],["18","CZAR, Cristóbal"],["19","BARROS OCAMPO, Bartolome"],["20","BULLRICH, José"],["21","ARAMBURU, Iñaki"],["22","ALEGRE, Baldomero"]],
  },
  {
    categoriaId: "m15-c",
    titulares: ["MARINO, Facundo","KAUFMANN, Juan","ORDOÑEZ, Pablo","SANTAMARINA BERGADÁ, Jerónimo","CHIAPPE BECCAR VARELA, Pedro","SERANTES, Mateo","IGLESIAS ARRIETA, Beltrán","VILLAMIL, Simón","VINENT FERNANDEZ SPERONI, Benjamín","BARISIC, Milo","NAZAR, Florencio","VIGANÓ, Simon","ANZORREGUY, Rufino","LEYBA, Fermín Gabriel","BELL, Keneth"],
    suplentes: [["16","MATTA Y TREJO, Alfonso"],["17","WAISMAN, Matias"],["18","ESTRADA, José María"],["19","STODDART, Marcos"],["20","DORMAL, Santiago"],["21","POGGI, Joaquín"],["22","PALETTE PUEYRREDON, Bautista"],["23","RICHARDS, Patricio Juan"]],
  },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  if (dryRun) console.log("== DRY RUN: no se escribe nada ==");
  const batch = adminDb.batch();

  for (const eq of EQUIPOS) {
    if (eq.titulares.length !== 15) throw new Error(`${eq.categoriaId}: ${eq.titulares.length} titulares`);
    const pid = partidoId(eq.categoriaId, NUMERO_FECHA);
    const partidoRef = adminDb.collection("partidos").doc(pid);
    const snap = await partidoRef.get();
    if (!snap.exists) throw new Error(`${pid} no existe`);
    const estado = (snap.data() as { estado?: string }).estado;
    if (estado !== "programado") {
      console.warn(`SALTEADO ${pid}: estado "${estado}"`);
      continue;
    }
    const jugadores: JugadorPartido[] = [
      ...eq.titulares.map((nombre, i) => ({ nombre: titleCase(nombre), dorsal: String(i + 1), titular: true, enCancha: true })),
      ...eq.suplentes.map(([dorsal, nombre]) => ({ nombre: titleCase(nombre), dorsal, titular: false, enCancha: false })),
    ];
    const ids = new Map<string, string>();
    for (const j of jugadores) {
      const id = playerId(j.nombre);
      if (ids.has(id)) throw new Error(`${pid}: "${j.nombre}" y "${ids.get(id)}" generan el mismo id "${id}"`);
      ids.set(id, j.nombre);
    }
    const plantelSnap = await partidoRef.collection("plantel").get();
    const aBorrar = plantelSnap.docs.filter((d) => !ids.has(d.id));
    const titularesIds = jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre));
    console.log(
      `${pid}: ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl` + (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );
    if (dryRun) continue;

    for (const d of aBorrar) batch.delete(d.ref);
    for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
    batch.update(partidoRef, {
      formacionPublicada: true,
      fecha: FECHA,
      hora: HORA,
      enCanchaIds: titularesIds,
      formacionActualizadaEn: new Date(),
      updatedAt: new Date(),
    });
  }

  if (dryRun) return console.log("(DRY RUN) nada escrito.");
  await batch.commit();
  console.log("Listo. Formaciones cargadas y PUBLICADAS.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
