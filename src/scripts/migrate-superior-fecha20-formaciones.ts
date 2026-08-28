// Carga las formaciones de la Fecha 20 de Plantel Superior (vs Hindú) como BORRADOR
// (formacionPublicada: false) -- transcriptas de "FECHA 20 - VS. HINDU.xlsx" que pasó el club.
// Correr con: npm run migrate-superior-fecha20-formaciones
// Con DRY_RUN=1 solo muestra lo que haría, sin escribir nada:
//   DRY_RUN=1 npm run migrate-superior-fecha20-formaciones
//
// Reglas de esta carga (pedido explícito):
//   - Pre A, Pre B, M-22, Pre C, Pre D, Pre E, Pre H  -> titulares + suplentes
//   - Primera e Intermedia                            -> SOLO titulares (sin suplentes)
//   - Pre F y Pre G                                   -> NO se tocan (ya jugaron / ya están subidas)
//
// Idempotente: pisa el plantel del partido si ya existe y borra los jugadores que hayan quedado
// de una corrida anterior y no estén en esta lista. Solo actúa sobre partidos en estado
// "programado" -- si un partido ya arrancó o terminó, lo saltea con una advertencia.

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 20;

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[]; // 15, en orden de dorsal 1..15
  suplentes: string[]; // dorsal 16..N; vacío = no se cargan suplentes
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "primera",
    titulares: [
      "Bosch, Isidro",
      "Salese, Beltran",
      "Bosch Bautista",
      "Cardinal Paul",
      "Urtubey Alejandro",
      "Santarelli, Faustino",
      "De la Vega, Joaquín",
      "Diaz de Vivar Rodrigo",
      "Marguery Lucas",
      "Gutierrez Taboada Gonzalo",
      "Ortiz Basualdo, Justo",
      "Lanfranco Benjamin",
      "Prince Simón",
      "Marolda, Santiago",
      "Daireaux, Juan Bautista",
    ],
    suplentes: [], // solo titulares
  },
  {
    categoriaId: "intermedia",
    titulares: [
      "Wright James",
      "Mackinlay, Teófilo",
      "Borio Luciano",
      "Cáceres, Tomás",
      "Shaw Francisco",
      "Montoya Mateo",
      "Garay Teófilo",
      "Irarrázaval, Iñaki",
      "Nava, Lucas",
      "Llerena Florencio",
      "Vela, Carlos",
      "Keena Tomas",
      "Uranga, Matías",
      "Ulloa Jeronimo",
      "Menendez, Carlos Quinto",
    ],
    suplentes: [], // solo titulares
  },
  {
    categoriaId: "pre-a",
    titulares: [
      "Ibarguren Tomás",
      "Granato, Belisario",
      "Roggero, Francisco",
      "Uranga Tomas",
      "Ureta Tomas",
      "Bruzone Justo",
      "Salinas Juan",
      "Ruso Rufino",
      "Torello, Facundo",
      "Hardoy, José",
      "Silva Alfonso",
      "Iribarren Marcos",
      "Mc Grech, Juan",
      "Pereyra, Cruz",
      "Gutierrez Taboada Santiago",
    ],
    suplentes: ["Pueyrredón Rodrigo", "Bullrich, Simón", "Butler Bautista"],
  },
  {
    categoriaId: "pre-b",
    titulares: [
      "Brandi Facundo",
      "Iribarne Gonzalo",
      "Walker Bautista",
      "De Los Heros, Miguel",
      "Browne, Benjamin",
      "Demarchi Valentin",
      "Benedit, Juan Cruz",
      "Ezcurra, Felipe",
      "Valls, Tomas",
      "Jaca Otaño, Iñaki",
      "Mignone Germán",
      "Longinotti Tomas",
      "Casá Silvestre",
      "Rivas, Bautista",
      "Monpelat Lucas",
    ],
    suplentes: ["Bertón Moreno, Ignacio"],
  },
  {
    categoriaId: "m-22",
    titulares: [
      "De Elizalde, Iñaki",
      "Olmos Zenon",
      "Angelino, Alfonso",
      "Garibaldi Santiago",
      "Lopez Fresco, Diego",
      "Espinosa Segundo",
      "Sola. Agusto",
      "Mendonça, Tomás",
      "Davel, Lucas",
      "Bullrich, Marcos",
      "Socas, Justo",
      "Keena, Manuel",
      "Martignone, Saturnino",
      "Ramos Facundo",
      "Von Wuthenau Juan Cruz",
    ],
    suplentes: ["Deane, Santiago", "Saravia Justo", "Benitez Cruz Blas", "Dupont, Mateo"],
  },
  {
    categoriaId: "pre-c",
    titulares: [
      "Naveiro Joaquín",
      "Herrera, Segundo",
      "Urtubey Santiago",
      "Sporleder Benicio",
      "Frias, Gonzalo",
      "Terrado, Marcos",
      "Dacunto, Juan Pablo",
      "Ferreccio, Tomas",
      "Rauch, Facundo",
      "Benedit, Juan",
      "Lanza Juan",
      "Torello, Eduardo",
      "Segura Bautista",
      "Marolda Bautista",
      "Molina Lucas",
    ],
    suplentes: ["Dewey Juan Pablo", "Monpelat, Nicolás", "Iribarne, Bautista", "Zirolli Marcos"],
  },
  {
    categoriaId: "pre-d",
    titulares: [
      "Aramburu Bautista",
      "Gaviña, Segundo",
      "Shaw Santiago",
      "Cáceres, Juan Manuel",
      "Monpelat Felipe",
      "Irarrázaval, Bautista",
      "Fellner, Francisco",
      "Valls, José Quinto",
      "Iribarne Ignacio",
      "Samilian, Alex",
      "Granato Wenceslao",
      "Pujato, Matías",
      "Reinwick, Federico",
      "Bosch Alfonso",
      "Saubidet, Jerónimo",
    ],
    suplentes: ["Gassiebayle Ramón", "Tezanos Pinto, Segundo", "Vivequin, Cruz", "Zirolli Santiago"],
  },
  {
    categoriaId: "pre-e",
    titulares: [
      "Bosch Ramón",
      "Aramburu Marcos",
      "Muñoz Tomás x",
      "Pavlovsky José María",
      "Bosch Fermín",
      "Skinner Ignacio",
      "Olmos, Silvestre",
      "Lanusse Bautista",
      "Martinez Roberto",
      "Von Wuthenau Facundo",
      "Pommer, Felipe",
      "Autillio Juan Cruz",
      "Sluzewski Monto, Santiago",
      "Adrogué Tomás",
      "Galarraga, Simón",
    ],
    suplentes: ["Lanusse, Santiago", "Lopez Saubidet Martín", "Massone Ramiro"],
  },
  {
    categoriaId: "pre-h",
    titulares: [
      "Adrogue Marcos",
      "Paterson Jerónimo",
      "Ithurralde Joaquín",
      "Peña Camilo",
      "Quigley Thomas",
      "Carey Máximo",
      "Thompson Santiago",
      "Marguery, Mateo",
      "Vela Vicente",
      "Guerrico Juan",
      "Muxi Tomás",
      "Nolasco Francisco",
      "Bosch Ramón Maria",
      "Blanco, Santiago",
      "González Del Solar, Santiago",
    ],
    suplentes: ["Mendilaharzu, Santos", "Busquet, Santiago", "Zirolli Bautista", "Norman Archibald"],
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
    const pid = partidoId(equipo.categoriaId, NUMERO_FECHA);
    const partidoRef = adminDb.collection("partidos").doc(pid);
    const snap = await partidoRef.get();

    if (!snap.exists) {
      console.warn(`SALTEADO ${pid}: el partido no existe en Firestore.`);
      continue;
    }
    const estado = (snap.data() as { estado?: string }).estado;
    if (estado !== "programado") {
      console.warn(`SALTEADO ${pid}: estado = "${estado}" (solo se cargan partidos "programado").`);
      continue;
    }

    const jugadores = jugadoresDe(equipo);

    // Chequeo de colisión de ids dentro del mismo equipo (dos nombres que normalizan igual).
    const ids = new Map<string, string>();
    for (const j of jugadores) {
      const id = playerId(j.nombre);
      if (ids.has(id)) {
        throw new Error(`${pid}: "${j.nombre}" y "${ids.get(id)}" generan el mismo id ("${id}").`);
      }
      ids.set(id, j.nombre);
    }
    const nuevosIds = new Set(ids.keys());

    // Borrar jugadores que hayan quedado de una corrida anterior y no estén en esta lista.
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
