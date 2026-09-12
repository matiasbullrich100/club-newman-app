// Carga las formaciones de la Fecha 6 de M17 (A/B/C) domingo 2026-09-13 en Newman, como BORRADOR
// (formacionPublicada: false). M17 A vs SITAS A, M17 B vs SITAS B, M17 C vs Los Pinos -- fichas de
// equipo pasadas por el club (imagen). Correr con: npm run migrate-m17-fecha6-formaciones
// DRY_RUN=1 npm run migrate-m17-fecha6-formaciones   -> simula, no escribe.
//
// Nombres ya vienen "Apellido, Nombre" bien capitalizados en la ficha -- se cargan tal cual, sin
// pasar por titleCase.
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
    categoriaId: "m17-a",
    titulares: [
      "Racciati, Ignacio",
      "Montoreano, Beltran",
      "Lanfranco, Miguel",
      "Lynch, Gonzalo",
      "Dominguez Olivera, Jose",
      "Deane, Javier",
      "Perkins, Jeronimo",
      "Steverlynck, Liam",
      "Busto Cavanagh, Fermin",
      "Gomez de Alzaga, Camilo",
      "Arnaudo, Pablo",
      "Jaca Otaño, Beltran",
      "Zavala, Sawens",
      "Loro Marchese, Tomas",
      "Garat, Simon",
    ],
    suplentes: [
      "Lopez Aufranc, Lucas",
      "Carey Paez, Marcos",
      "Saenz Valiente, Tomas",
      "Valverde, Francisco",
      "Falcon, Mateo",
      "Leupold, Francisco",
      "Fuentes Rocha, Timoteo",
      "Bibiloni, Rufino",
    ],
  },
  {
    categoriaId: "m17-b",
    titulares: [
      "Lopez Aufranc, Lucas",
      "Carey Paez, Marcos",
      "Saenz Valiente, Tomas",
      "Escalante, Manuel",
      "Lissarrague, Pedro",
      "Bosch, Justo",
      "Buenader, Pedro",
      "Santamarina, Juan",
      "Leupold, Francisco",
      "Marino Aguirre, Agustin",
      "Zavala, Jean",
      "Perez Sartori, Tomas",
      "Pommer, Simon",
      "Polizza, Juan Diego",
      "Galice Naon, Felix",
    ],
    suplentes: ["Delfino, Ignacio", "Diaz Herrera, Pedro", "Buchanan, Esteban", "Moyano, Nicolas", "Belaustegui, Facundo"],
  },
  {
    categoriaId: "m17-c",
    titulares: [
      "Bausili, Francisco",
      "Vallejos, Silvestre",
      "Merello, Ignacio",
      "Vedoya, Augusto",
      "Medinger, Marcos",
      "Goti, Vicente",
      "Benegas, Felix",
      "Huber, Ramon",
      "Cirio, Simon",
      "De la Tour, Alejandro",
      "Eijo, Juan Alejandro",
      "Anchorena, Santos",
      "Uranga, Milo",
      "Buenader, Ivan",
      "Uranga, Bautista",
    ],
    suplentes: [
      "Preneste, Beltran",
      "Ruiz, Gustavo",
      "Weinert, Antonio",
      "Monsegur, Geronimo",
      "De Achaval, Mateo",
      "Lanusse, Ignacio",
      "Palma Cane, Ignacio",
      "Serra Gallo, Gonzalo",
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
