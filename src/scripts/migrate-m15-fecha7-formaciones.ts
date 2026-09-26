// Carga y PUBLICA las formaciones de la Fecha 7 de M15 (A/B/C vs Alumni A/B/C, domingo 2026-09-27,
// de visitante en Alumni) -- transcriptas de las fichas del club (imagenes "M15 A/B/C"). M15 D (vs Los
// Molinos C) no vino, no se toca.
// Correr con: npx tsx src/scripts/migrate-m15-fecha7-formaciones.ts   (DRY_RUN=1 para solo mirar)
//
// M15 C, dorsal 9: la ficha corta el nombre en "Vinent Fernandez Speroni, Ben..." -- completado con
// "Benjamín" (el jugador ya existe asi en jugadores/, igual que en la Fecha 6).
// Idempotente; solo actua sobre partidos "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 7;

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[];
  suplentes: string[]; // dorsal 16, 17, ... en orden
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "m15-a",
    titulares: [
      "Zemborain, Antonio",
      "Sola, Benicio",
      "Araujo, Santos",
      "Amaral Trigo, Milo",
      "Arnaudo Losada, Ignacio Javier",
      "Lopez Saubidet, Juan Cruz",
      "Luna Alurralde, Ignacio",
      "Miguens, Faustino",
      "Pechar, Jose",
      "Bullrich, José",
      "Llavallol, Marcos",
      "García Igarza, Joaquín",
      "Reynal, Abbott Juan",
      "Tiscornia, Félix",
      "Lopez Aufranc, Hilario",
    ],
    suplentes: ["Llambi Bovino, Felipe"],
  },
  {
    categoriaId: "m15-b",
    titulares: [
      "Marino, Facundo",
      "Barros Ocampo, Bartolome",
      "Ayerza, Iván Federico",
      "Perez Sartori, Ramiro",
      "Oris de Roa, Teófilo",
      "Villamil, Simón",
      "Czar, Cristóbal",
      "Contepomi, Vicente",
      "Alegre, Baldomero",
      "Barisic, Milo",
      "Trigo de la Balze, Honorio",
      "Dormal, Santiago",
      "Aramburu, Iñaki",
      "Garat Nölting, Jaime",
      "Mendizabal, Felipe",
    ],
    suplentes: ["Rodriguez Ribas, Hilario", "Fiorito, Jaime"],
  },
  {
    categoriaId: "m15-c",
    titulares: [
      "Richards, Patricio Juan",
      "Ordoñez, Pablo",
      "Aguilar Quesada, Félix",
      "Santamarina Bergadá, Jerónimo",
      "Escalante, Ignacio",
      "Iglesias Arrieta, Beltrán",
      "Diaz Mathe, Cruz",
      "Serantes, Mateo",
      "Vinent Fernandez Speroni, Benjamín",
      "Beláustegui, Isidro",
      "Chevallier Boutell, Gonzalo",
      "Viganó, Simon",
      "Schair, Tomas",
      "Trevisán, Pedro",
      "Anzorreguy, Rufino",
    ],
    suplentes: ["Grether, Emilio", "Quigley, Mathew", "Nazar, Florencio", "Bell, Keneth", "Stoddart, Marcos", "Vallaco, Juan Cruz"],
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
      ...eq.titulares.map((nombre, i) => ({ nombre, dorsal: String(i + 1), titular: true, enCancha: true })),
      ...eq.suplentes.map((nombre, i) => ({ nombre, dorsal: String(16 + i), titular: false, enCancha: false })),
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
      `${pid}: ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl vs ${(snap.data() as { rival?: string }).rival}` +
        (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );
    if (dryRun) continue;

    for (const d of aBorrar) batch.delete(d.ref);
    for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
    batch.update(partidoRef, {
      formacionPublicada: true,
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
