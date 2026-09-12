// Carga las formaciones de la Fecha 6 de M15 (A/B/C/D) vs La Plata A/B/C / Los Pinos, domingo
// 2026-09-13 en Newman, como BORRADOR (formacionPublicada: false). Transcriptas de la ficha del
// club (imágenes "M15 A/B/C/D") -- esas fichas traían la fecha vieja pegada ("23 de agosto",
// plantilla reciclada de una fecha anterior), pero el rival de cada una (La Plata A/B/C, Los
// Pinos) coincide exacto con la Fecha 6 actual en Firestore, así que se cargan ahí.
// Correr con: npm run migrate-m15-fecha6-formaciones
// DRY_RUN=1 npm run migrate-m15-fecha6-formaciones   -> simula, no escribe.
//
// M15 C, dorsal 9: la ficha corta el nombre en "Vinent Fernandez Speroni, Ben..." (borde de la
// imagen) -- completado con "Benjamín" por la misma persona en la ficha de M15 B (suplente 20).
// M15 C también tenía el horario mal en Firestore (fixture: 11:00, ficha del club: 10:30) --
// corregido a mano, aparte de este script (que solo toca formación, no horario/rival/local).
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
    categoriaId: "m15-a",
    titulares: [
      "Llambi Bovino, Felipe",
      "Sola, Benicio",
      "Araujo, Santos",
      "Benvenuti, Vito",
      "Arnaudo Losada, Ignacio Javier",
      "Lopez Saubidet, Juan Cruz",
      "Luna Alurralde, Ignacio",
      "Miguens, Faustino",
      "Pechar, Jose",
      "Valverde, Manuel",
      "Llavallol, Marcos",
      "García Igarza, Joaquín",
      "Reynal, Abbott Juan",
      "Tiscornia, Félix",
      "Lopez Aufranc, Hilario",
    ],
    suplentes: [],
  },
  {
    categoriaId: "m15-b",
    titulares: [
      "Ayerza, Iván Federico",
      "Barros Ocampo, Bartolome",
      "Zemborain, Antonio",
      "Amaral Trigo, Milo",
      "Oris de Roa, Teófilo",
      "Diaz Mathe, Cruz",
      "Villamil, Simón",
      "Contepomi, Vicente",
      "Alegre, Baldomero",
      "Bullrich, José",
      "Trigo de la Balze, Honorio",
      "Dormal, Santiago",
      "Aramburu, Iñaki",
      "Garat Nölting, Jaime",
      "Mendizabal, Felipe",
    ],
    suplentes: [
      "Czar, Cristóbal",
      "Ordoñez, Pablo",
      "Kaufmann, Juan",
      "Marino, Facundo",
      "Vinent Fernandez Speroni, Benjamín",
      "Rodriguez Ribas, Hilario",
      "Barisic, Milo",
      "Bell, Keneth",
    ],
  },
  {
    categoriaId: "m15-c",
    titulares: [
      "Marino, Facundo",
      "Kaufmann, Juan",
      "Ordoñez, Pablo",
      "Santamarina Bergadá, Jerónimo",
      "Perez Sartori, Ramiro",
      "Zimmermann, Francisco",
      "Serantes, Mateo",
      "Estrada, José María",
      "Vinent Fernandez Speroni, Benjamín",
      "Barisic, Milo",
      "Chevallier Boutell, Gonzalo",
      "Rodriguez Ribas, Hilario",
      "Anzorreguy, Rufino",
      "Berasategui, Fernando",
      "Bell, Keneth",
    ],
    suplentes: ["Fiorito, Jaime"],
  },
  {
    categoriaId: "m15-d",
    titulares: [
      "Matta y Trejo, Alfonso",
      "Quigley, Mathew",
      "Richards, Patricio Juan",
      "Escalante, Ignacio",
      "Chiappe Beccar Varela, Pedro",
      "Stoddart, Marcos",
      "Iglesias Arrieta, Beltrán",
      "Polizza, Vicente",
      "Palette Pueyrredon, Bautista",
      "Viganó, Simon",
      "Trevisán, Pedro",
      "Poggi, Joaquín",
      "Bosch Holmberg, Lucio",
      "Ibarzabal, Tomás",
      "Vallaco, Juan Cruz",
    ],
    suplentes: [
      "Waisman, Matías",
      "Oneto Gaona, Alejandro Blas",
      "Bonadeo, Santos",
      "Grether, Emilio",
      "Morando, Aldo",
      "Beláustegui, Isidro",
      "Nazar, Florencio",
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
