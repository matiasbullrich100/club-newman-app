// Carga las formaciones de la Fecha 22 de Plantel Superior (vs Regatas Bella Vista, Pre F/Pre G
// vs SIC, Pre H de visitante en CUBA) como BORRADOR (formacionPublicada: false) -- transcriptas
// de "FECHA 22 - VS. REGATAS BELLA VISTA.xlsx" que pasó el club.
// Correr con: npx tsx src/scripts/migrate-superior-fecha22-formaciones.ts
// Con DRY_RUN=1 solo muestra lo que haría, sin escribir nada:
//   DRY_RUN=1 npx tsx src/scripts/migrate-superior-fecha22-formaciones.ts
//
// Reglas de esta carga (pedido explícito):
//   - Primera, Intermedia y Pre A                         -> SOLO titulares (sin suplentes)
//   - Pre B, M-22, Pre C, Pre D, Pre F, Pre G, Pre H       -> titulares + suplentes
//   - Pre E                                                -> NO se carga (Fecha libre esta semana)
//
// Dos correcciones sobre el texto crudo de la planilla:
//   - Pre F, titular #3: la celda decía "Muñoz Tomás x" -- se carga sin la "x" suelta.
//   - Pre F, suplentes: dos casilleros decían "PILAR" (posición sin jugador confirmado todavía,
//     no es un nombre) -- se descartan, quedan 6 suplentes en vez de 8.
//
// Idempotente: pisa el plantel del partido si ya existe y borra los jugadores que hayan quedado
// de una corrida anterior y no estén en esta lista. Solo actúa sobre partidos en estado
// "programado" -- si un partido ya arrancó o terminó, lo saltea con una advertencia.

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 22;

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
      "Salese, Beltran",
      "Bosch Bautista",
      "Cardinal Paul",
      "Lascombes, Francisco",
      "Montoya Mateo",
      "De la Vega, Joaquín",
      "Ureta Jerónimo",
      "Marguery Lucas",
      "Llerena Florencio",
      "Ortiz Basualdo, Justo",
      "Lanfranco Benjamin",
      "Prince Simón",
      "Ulloa Jeronimo",
      "Daireaux, Juan Bautista",
    ],
    suplentes: [], // solo titulares
  },
  {
    categoriaId: "intermedia",
    titulares: [
      "Bosch, Isidro",
      "Perkins Fermín",
      "Borio Luciano",
      "Cáceres, Tomás",
      "Ureta Tomas",
      "Bonasso Bautista",
      "Garay Teófilo",
      "Irarrázaval, Iñaki",
      "Nava, Lucas",
      "Hardoy, José",
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
      "Wright James",
      "Pueyrredón Rodrigo",
      "Roggero, Francisco",
      "Ezcurra Ramón",
      "Fortín Pablo",
      "Bruzone Justo",
      "Benedit, Juan Cruz",
      "Salinas Juan",
      "Torello, Facundo",
      "Jaca Otaño, Iñaki",
      "Silva Alfonso",
      "Uranga, Matías",
      "Casa Silvestre",
      "Pereyra, Cruz",
      "Gutierrez Taboada Santiago",
    ],
    suplentes: [], // solo titulares
  },
  {
    categoriaId: "pre-b",
    titulares: [
      "Shaw, Marcos",
      "Iribarne Gonzalo",
      "Ibarguren Tomás",
      "Browne, Benjamin",
      "Cocca Antonio",
      "Dacunto, Juan Pablo",
      "Saravia Justo",
      "Mendonça, Tomás",
      "Valls, Tomas",
      "Benedit, Juan",
      "Mignone Germán",
      "Longinotti Tomas",
      "Mc Grech, Juan",
      "Marolda Bautista",
      "Monpelat Lucas",
    ],
    suplentes: [
      "Dewey Juan Pablo",
      "De Los Heros, Miguel",
      "Rivas, Bautista",
      "Brandi Facundo",
      "Herrera, Segundo",
      "Terrado, Marcos",
      "Bollini Marcos",
      "Vivequin, Cruz",
    ],
  },
  {
    categoriaId: "m-22",
    titulares: [
      "Deane, Santiago",
      "Olmos Zenon",
      "Angelino, Alfonso",
      "Carey, Lucas",
      "Lopez Fresco, Diego",
      "Irarrázaval, Bautista",
      "Sola. Agusto",
      "Valls, José Quinto",
      "Benitez Cruz Blas",
      "Samilian, Alex",
      "Socas, Justo",
      "Keena, Manuel",
      "Martignone, Saturnino",
      "Ramos Facundo",
      "Molina Lucas",
    ],
    suplentes: ["De Elizalde, Iñaki", "Martinez Roberto", "Dupont, Mateo", "Pujato, Matías"],
  },
  {
    categoriaId: "pre-c",
    titulares: [
      "Brandi Facundo",
      "Herrera, Segundo",
      "Urtubey Santiago",
      "Sporleder Benicio",
      "Garibaldi Santiago",
      "Ferreccio, Tomas",
      "Terrado, Marcos",
      "Monpelat, Nicolás",
      "Bollini Marcos",
      "Vivequin, Cruz",
      "Zirolli Marcos",
      "Bertón Moreno, Ignacio",
      "Segura Bautista",
      "Lanza Juan",
      "Saubidet, Jerónimo",
    ],
    suplentes: ["Naveiro Joaquín", "Frias, Gonzalo", "Rauch, Facundo", "Torello, Eduardo"],
  },
  {
    categoriaId: "pre-d",
    titulares: [
      "Gassiebayle Ramón",
      "Gaviña, Segundo",
      "Shaw Santiago",
      "Cáceres, Juan Manuel",
      "Monpelat Felipe",
      "Skinner Ignacio",
      "Fellner, Francisco",
      "Lanusse Bautista",
      "Iribarne Ignacio",
      "Von Wuthenau Facundo",
      "Granato Wenceslao",
      "Iribarne, Bautista",
      "Zirolli Santiago",
      "Adrogué Tomás",
      "Massone Ramiro",
    ],
    suplentes: [
      "Aramburu Bautista",
      "Aramburu Marcos",
      "Gowland Esteban",
      "Olmos, Silvestre",
      "Tezanos Pinto, Segundo",
      "Reinwick, Federico",
      "García Zavaleta, Fermín",
      "Bosch Ramón",
    ],
  },
  // Pre E: NO se carga -- Fecha libre esta semana (ver set-horarios-superior-fecha22.ts).
  {
    categoriaId: "pre-f",
    titulares: [
      "Bosch Ramón",
      "Iribas Tomás",
      "Muñoz Tomás", // planilla decía "Muñoz Tomás x" -- "x" suelta, no es parte del nombre
      "Sbarra Bautista",
      "Cáceres, Wenceslao",
      "Ibañez Joaquín",
      "Alvarado, Juan",
      "Reyna José",
      "Lopez Saubidet Martín",
      "Otero, Benjamín",
      "Pujato Francisco",
      "Busto, José",
      "Skinner Gonzalo",
      "Santurio Pedro",
      "Adrogué Santiago",
    ],
    // La planilla tenía 8 casilleros de suplente, pero los ultimos 2 decian "PILAR" (posicion sin
    // jugador confirmado todavia, no es un nombre) -- se descartan.
    suplentes: ["Merello Santiago", "Lanusse Gerónimo", "Terán Joaquín", "Gibelli, Cruz", "Gomez Alzaga Lucio", "Prat Gay Iñaki"],
  },
  {
    categoriaId: "pre-g",
    titulares: [
      "Mc Cormick Santiago",
      "Amaral Quinto",
      "Norman Archibald",
      "Monpelat Pedro",
      "Peña Camilo",
      "Heidkamp Felipe",
      "Bianco, Simón",
      "Vallebella, Joaquín",
      "Tedin Rufino",
      "Guerrico Juan",
      "Bosch Gonzalo",
      "Pettinaroli Martin",
      "Bosch Ramón Maria",
      "Borgonovo Francisco",
      "Cirio Rufino",
    ],
    suplentes: ["Adrogué Cesar", "Badessich, Manuel", "Pahissa, Jaime", "Bonomi Matías", "González Del Solar, Santiago"],
  },
  {
    categoriaId: "pre-h",
    titulares: [
      "Adrogue Marcos",
      "Paterson Jerónimo",
      "Malaspina Emiliano",
      "Mendilaharzu, Santos",
      "Quigley Thomas",
      "Perkins, Benito",
      "Bonamico Benjamin",
      "Ithurralde Joaquín",
      "Ibañez Alfonso",
      "Pujato, Gonzalo",
      "Muxi Tomás",
      "Nolasco Francisco",
      "Blanco, Santiago",
      "Carey Máximo",
      "Thompson Santiago",
    ],
    suplentes: ["Pezet Facundo", "Vela Vicente", "Sackmann Miguel", "Wilson Felipe"],
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
