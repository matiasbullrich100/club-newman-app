// Carga las formaciones de la Fecha 6 de M16 (A/B/C) vs Alumni A/B/C, domingo 2026-09-13, como
// BORRADOR (formacionPublicada: false). Transcriptas de la ficha del club (imagen "M16 2026").
// M16 D no juega esta fecha (Fecha libre, ver set-libre-m16-d-fecha6.ts) -> no se carga acá.
// Correr con: npm run migrate-m16-fecha6-formaciones
// DRY_RUN=1 npm run migrate-m16-fecha6-formaciones   -> simula, no escribe.
//
// M16 C: 2 suplentes (Cardoni, Rafael / Leonard, Salvador) agregados a pedido explícito del club,
// no estaban en la ficha original.
// Idempotente: pisa el plantel y borra los jugadores que hayan quedado de una corrida anterior.
// Solo actúa sobre partidos en estado "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 6;

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[]; // 15
  suplentes: string[];
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "m16-a",
    titulares: [
      "Barletta, Santino",
      "Llavallol, Geronimo",
      "Gilligan, Jeronimo",
      "Saul, Benjamin",
      "Fabbri, Santino",
      "Müller, Santino",
      "Tessore, Benito",
      "Diaz de Vivar, Ramon",
      "Sackmann, Ramon",
      "Reynal, Jeronimo",
      "Uranga, Mateo",
      "Contepomi, Silvestre",
      "Sluzewski, Tomas",
      "Peters, Justo",
      "Rodriguez Ribas, Agustin",
    ],
    suplentes: [],
  },
  {
    categoriaId: "m16-b",
    titulares: [
      "Iribas, Ramon",
      "Miguens, Santiago",
      "Sola, Juan",
      "Fabbri, Santino",
      "Vedoya, Alfonso",
      "Castelli, Felipe",
      "Casa, Felix",
      "Richelet, Juan",
      "Puig, Salvador",
      "Suaya, Lorenzo",
      "Herrera, Rufino",
      "Renteria, Marcos",
      "Autilio, Benjamin",
      "Norman, Marcos",
      "Olivera, Diogenes",
    ],
    suplentes: [],
  },
  {
    categoriaId: "m16-c",
    titulares: [
      "Lalor, Miguel",
      "Ibarbia, Rufino",
      "Salese, Ramon",
      "Müller, Pascal",
      "Ibarguren, Santiago",
      "Gilardi, Simon",
      "Cassagne, Luis",
      "Palma, Benjamin",
      "Estrada, Ignacio",
      "Montovio, Ignacio",
      "Fravega, Jeronimo",
      "Vazquez Caputo, Agustin",
      "Merello, Simon",
      "Vila Echagüe, Juan",
      "Mammolino, Francisco",
    ],
    suplentes: [
      "Polizza, Delfin",
      "Simon Padros, Juan",
      "Moyano, Santiago",
      "Summers, Oliver",
      "Cardoni, Rafael",
      "Leonard, Salvador",
    ],
  },
];

function jugadoresDe(equipo: EquipoFormacion): JugadorPartido[] {
  const out: JugadorPartido[] = [];
  equipo.titulares.forEach((nombre, i) => {
    out.push({ nombre, dorsal: String(i + 1), titular: true, enCancha: true });
  });
  equipo.suplentes.forEach((nombre, i) => {
    out.push({ nombre, dorsal: String(16 + i), titular: false, enCancha: false });
  });
  return out;
}

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");

  if (dryRun) console.log("== DRY RUN: no se escribe nada ==\n");

  const batch = adminDb.batch();
  let totalDocs = 0;

  for (const equipo of EQUIPOS) {
    if (equipo.titulares.length !== 15) {
      throw new Error(`${equipo.categoriaId}: ${equipo.titulares.length} titulares (deben ser 15).`);
    }
    const pid = partidoId(equipo.categoriaId, NUMERO_FECHA);
    const partidoRef = adminDb.collection("partidos").doc(pid);
    const snap = await partidoRef.get();

    if (!snap.exists) {
      console.warn(`SALTEADO ${pid}: el partido no existe en Firestore.`);
      continue;
    }
    const estado = (snap.data() as { estado?: string }).estado;
    if (estado !== "programado") {
      console.warn(`SALTEADO ${pid}: estado = "${estado}" (solo "programado").`);
      continue;
    }

    const jugadores = jugadoresDe(equipo);

    const ids = new Map<string, string>();
    for (const j of jugadores) {
      const id = playerId(j.nombre);
      if (ids.has(id)) {
        throw new Error(`${pid}: "${j.nombre}" y "${ids.get(id)}" generan el mismo id ("${id}").`);
      }
      ids.set(id, j.nombre);
    }
    const nuevosIds = new Set(ids.keys());

    const plantelSnap = await partidoRef.collection("plantel").get();
    const aBorrar = plantelSnap.docs.filter((d) => !nuevosIds.has(d.id));
    const titularesIds = jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre));

    console.log(
      `${pid}: ${jugadores.length} jugadores (${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl)` +
        (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );

    if (dryRun) continue;

    for (const d of aBorrar) batch.delete(d.ref);
    for (const j of jugadores) {
      batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
      totalDocs++;
    }
    batch.update(partidoRef, {
      formacionPublicada: false,
      enCanchaIds: titularesIds,
      updatedAt: new Date(),
    });
    totalDocs++;
  }

  if (dryRun) {
    console.log("\n(DRY RUN) nada escrito.");
    return;
  }

  await batch.commit();
  console.log(`\nListo. ${totalDocs} escrituras. Formaciones cargadas como BORRADOR (sin publicar).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
