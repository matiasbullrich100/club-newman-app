// Carga las formaciones de la Fecha 21 de Plantel Superior (vs La Plata) como BORRADOR
// (formacionPublicada: false) -- transcriptas de "FECHA 21 - VS. LA PLATA.xlsx" que pasó el club.
// Correr con: npx tsx src/scripts/migrate-superior-fecha21-formaciones.ts
// Con DRY_RUN=1 solo muestra lo que haría, sin escribir nada:
//   DRY_RUN=1 npx tsx src/scripts/migrate-superior-fecha21-formaciones.ts
//
// Reglas de esta carga (pedido explícito):
//   - Primera, Intermedia y Pre A          -> SOLO titulares (sin suplentes)
//   - Pre B, M-22, Pre C, Pre D, Pre E,
//     Pre F, Pre G                          -> titulares + suplentes
//   - Pre H                                 -> NO se carga (queda "Fecha libre", Champa no presenta)
//
// Idempotente: pisa el plantel del partido si ya existe y borra los jugadores que hayan quedado
// de una corrida anterior y no estén en esta lista. Solo actúa sobre partidos en estado
// "programado" -- si un partido ya arrancó o terminó, lo saltea con una advertencia.

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 21;

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[]; // 15, en orden de dorsal 1..15
  suplentes: string[]; // dorsal 16..N; vacío = no se cargan suplentes
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "primera",
    titulares: [
      "Prince Miguel",
      "Mackinlay, Teófilo",
      "Bosch Bautista",
      "Cardinal Paul",
      "Urtubey Alejandro",
      "Santarelli, Faustino",
      "Ureta Jerónimo",
      "Diaz de Vivar Rodrigo",
      "Nava, Lucas",
      "Gutierrez Taboada Gonzalo",
      "Ortiz Basualdo, Justo",
      "Lanfranco Benjamin",
      "Prince Simón",
      "Ulloa Jeronimo",
      "Marolda, Santiago",
    ],
    suplentes: [], // solo titulares
  },
  {
    categoriaId: "intermedia",
    titulares: [
      "Bosch, Isidro",
      "Perkins Fermín",
      "Lozano Manuel",
      "Cáceres, Tomás",
      "Ureta Tomas",
      "Bonasso Bautista",
      "Montoya Mateo",
      "Garay Teófilo",
      "Torello, Facundo",
      "Llerena Florencio",
      "Vela, Carlos",
      "Keena Tomas",
      "Ulloa Cruz",
      "Longinotii, Franco",
      "Menendez, Carlos Quinto",
    ],
    suplentes: [], // solo titulares
  },
  {
    categoriaId: "pre-a",
    titulares: [
      "Shaw, Marcos",
      "Pueyrredón Rodrigo",
      "Roggero, Francisco",
      "Ezcurra Ramón",
      "Uranga Tomas",
      "Bruzone Justo",
      "Demarchi Valentin",
      "Salinas Juan",
      "Bullrich, Simón",
      "Hardoy, José",
      "Silva Alfonso",
      "Iribarren Marcos",
      "Casá Silvestre",
      "Pereyra, Cruz",
      "Gutierrez Taboada Santiago",
    ],
    suplentes: [], // solo titulares
  },
  {
    categoriaId: "pre-b",
    titulares: [
      "Brandi Facundo",
      "Iribarne Gonzalo",
      "Walker Bautista",
      "De Los Heros, Miguel",
      "Browne, Benjamin",
      "Dacunto, Juan Pablo",
      "Benedit, Juan Cruz",
      "Ezcurra, Felipe",
      "Valls, Tomas",
      "Jaca Otaño, Iñaki",
      "Mignone Germán",
      "Bertón Moreno, Ignacio",
      "Mc Grech, Juan",
      "Rivas, Bautista",
      "Monpelat Lucas",
    ],
    suplentes: [
      "Longinotti Tomas",
      "Marolda Bautista",
      "Deane, Santiago",
      "Herrera, Segundo",
      "Dewey Juan Pablo",
      "Frias, Gonzalo",
      "Terrado, Marcos",
      "Rauch, Facundo",
    ],
  },
  {
    categoriaId: "m-22",
    titulares: [
      "De Elizalde, Iñaki",
      "Olmos Zenon",
      "Angelino, Alfonso",
      "Carey, Lucas",
      "Lopez Fresco, Diego",
      "Saravia Justo",
      "Sola. Agusto",
      "Mendonça, Tomás",
      "Benitez Cruz Blas",
      "Bullrich, Marcos",
      "Socas, Justo",
      "Keena, Manuel",
      "Martignone, Saturnino",
      "Dupont, Mateo",
      "Von Wuthenau Juan Cruz",
    ],
    suplentes: [
      "Davel, Lucas",
      "Ramos Facundo",
      "Gassiebayle Ramón",
      "Gaviña, Segundo",
      "Bosch Ramón",
      "Valls, José Quinto",
      "Irarrázaval, Bautista",
      "Samilian, Alex",
    ],
  },
  {
    categoriaId: "pre-c",
    titulares: [
      "Deane, Santiago",
      "Herrera, Segundo",
      "Dewey Juan Pablo",
      "Sporleder Benicio",
      "Frias, Gonzalo",
      "Ferreccio, Tomas",
      "Terrado, Marcos",
      "Monpelat, Nicolás",
      "Rauch, Facundo",
      "Benedit, Juan",
      "Zirolli Marcos",
      "Torello, Eduardo",
      "Iribarne, Bautista",
      "Lanza Juan",
      "Molina Lucas",
    ],
    suplentes: ["Naveiro Joaquín", "Bollini Marcos", "Segura Bautista"],
  },
  {
    categoriaId: "pre-d",
    titulares: [
      "Gassiebayle Ramón",
      "Gaviña, Segundo",
      "Urtubey Santiago",
      "Cáceres, Juan Manuel",
      "Monpelat Felipe",
      "Irarrázaval, Bautista",
      "Fellner, Francisco",
      "Valls, José Quinto",
      "Tezanos Pinto, Segundo",
      "Vivequin, Cruz",
      "Granato Wenceslao",
      "Pujato, Matías",
      "Zirolli Santiago",
      "Adrogué Tomás",
      "Saubidet, Jerónimo",
    ],
    suplentes: ["Lanusse Bautista", "Reinwick, Federico", "Iribarne Ignacio", "Samilian, Alex"],
  },
  {
    categoriaId: "pre-e",
    titulares: [
      "Aramburu Bautista",
      "Aramburu Marcos",
      "Shaw Santiago",
      "Pavlovsky José María",
      "Gowland Esteban",
      "Skinner Ignacio",
      "Lanusse, Joaquín",
      "Olmos, Silvestre",
      "Martinez Roberto",
      "Von Wuthenau Facundo",
      "Pommer, Felipe",
      "Pujato Francisco",
      "Sluzewski Monto, Santiago",
      "García Zavaleta, Fermín",
      "Massone Ramiro",
    ],
    suplentes: [
      "Bosch Fermín",
      "Galarraga, Simón",
      "Merello Santiago",
      "Iribas Tomás",
      "Muñoz Tomás",
      "Reyna José",
      "Iribarne Ignacio",
      "Otero, Benjamín",
    ],
  },
  {
    categoriaId: "pre-f",
    titulares: [
      "Bosch Ramón",
      "Iribas Tomás",
      "Muñoz Tomás",
      "Sbarra Bautista",
      "Cáceres, Wenceslao",
      "Ibañez Joaquín",
      "Alvarado, Juan",
      "Reyna José",
      "Lopez Saubidet Martín",
      "Otero, Benjamín",
      "Roca Santiago",
      "Tapia Valentín",
      "Skinner Gonzalo",
      "Santurio Pedro",
      "Adrogué Santiago",
    ],
    suplentes: [
      "Merello Santiago",
      "Lanusse Gerónimo",
      "Terán Joaquín",
      "Gibelli, Cruz",
      "Prat Gay Iñaki",
      "Gomez Alzaga Lucio",
    ],
  },
  {
    categoriaId: "pre-g",
    titulares: [
      "Mc Cormick Santiago",
      "Amaral Quinto",
      "Ibañez Alfonso",
      "Monpelat Pedro",
      "Peña Camilo",
      "Bosch Vicente",
      "Bianco, Simón",
      "Vallebella, Joaquín",
      "Tedin Rufino",
      "Guerrico Juan",
      "Borgonovo Francisco",
      "Pettinaroli Martin",
      "Chopourian, Manuel",
      "Pahissa, Jaime",
      "Cirio Rufino",
    ],
    suplentes: [
      "Adrogué Cesar",
      "Badessich, Manuel",
      "Ithurralde Joaquín",
      "Bonomi Matías",
      "González Del Solar, Santiago",
      "Bosch Ramón Maria",
      "Blanco, Santiago",
      "Nolasco Francisco",
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
      formacionActualizadaEn: new Date(),
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
