// Carga las formaciones de la Fecha 24 de Plantel Superior (sabado 2026-10-03, vs Los Tilos; Pre H es
// amistoso vs Delta en el Club) como BORRADOR (formacionPublicada: false) -- transcriptas de
// "FECHA 24 - VS. LOS TILOS.xlsx" que paso el club.
// Correr con: npx tsx src/scripts/migrate-superior-fecha24-formaciones.ts
// Con DRY_RUN=1 solo muestra lo que haria:
//   DRY_RUN=1 npx tsx src/scripts/migrate-superior-fecha24-formaciones.ts
//
// Reglas de esta carga (pedido explicito, standing):
//   - Primera, Intermedia y Pre A -> SOLO titulares (sin suplentes)
//   - Resto (Pre B, M-22, Pre C..Pre H) -> titulares + suplentes, con el dorsal que trae la planilla
//     (Pre D y Pre H tienen huecos de dorsal en los suplentes: se respetan)
// Correcciones sobre el texto crudo: Pre F #3 decia "Muñoz Tomás x" -> sin la "x" suelta.
// "Sola. Agusto" (M-22 #7) se deja tal cual esta en la planilla (asi esta guardado en fechas
// anteriores; cambiarlo partiria el historial del jugador).
//
// Idempotente: pisa el plantel si ya existe y borra jugadores que hayan quedado de una corrida
// anterior. Solo actua sobre partidos en estado "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 24;

type Supl = string | [string, string]; // nombre, o [dorsal, nombre]

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[];
  suplentes: Supl[];
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
      "Santarelli, Faustino",
      "Montoya Mateo",
      "Diaz de Vivar Rodrigo",
      "Marguery Lucas",
      "Gutierrez Taboada Gonzalo",
      "Ulloa Jeronimo",
      "Keena Tomas",
      "Prince Simón",
      "Ortiz Basualdo, Justo",
      "Daireaux, Juan Bautista",
    ],
    suplentes: [], // planilla: Mackinlay, Teófilo, Borio Luciano, Urtubey Alejandro, Marolda, Santiago -- no se cargan (regla: Primera sin suplentes)
  },
  {
    categoriaId: "intermedia",
    titulares: [
      "Bosch, Isidro",
      "Pueyrredón Rodrigo",
      "Roggero, Francisco",
      "Cáceres, Tomás",
      "Fortín Pablo",
      "Bonasso Bautista",
      "Cocca Antonio",
      "Garay Teófilo",
      "Nava, Lucas",
      "Llerena Florencio",
      "Vela, Carlos",
      "Uranga, Matías",
      "Ulloa Cruz",
      "Longinotii, Franco",
      "Menendez, Carlos Quinto",
    ],
    suplentes: [],
  },
  {
    categoriaId: "pre-a",
    titulares: [
      "Wright James",
      "Granato, Belisario",
      "Dewey Juan Pablo",
      "Ezcurra Ramón",
      "Ureta Tomas",
      "Demarchi Valentin",
      "Benedit, Juan Cruz",
      "Ruso Rufino",
      "Torello, Facundo",
      "Hardoy, José",
      "Silva Alfonso",
      "Iribarren Marcos",
      "Casa Silvestre",
      "Pereyra, Cruz",
      "Gutierrez Taboada Santiago",
    ],
    suplentes: [], // planilla: Walker Bautista, Bullrich, Simón -- no se cargan (regla: Pre A sin suplentes)
  },
  {
    categoriaId: "pre-b",
    titulares: [
      "Shaw, Marcos",
      "Iribarne Gonzalo",
      "Angelino, Alfonso",
      "Uranga Tomas",
      "Shaw Francisco",
      "Dacunto, Juan Pablo",
      "Saravia Justo",
      "Monpelat, Nicolás",
      "Valls, Tomas",
      "Jaca Otaño, Iñaki",
      "Mignone Germán",
      "Longinotti Tomas",
      "Mc Grech, Juan",
      "Marolda Bautista",
      "Monpelat Lucas",
    ],
    suplentes: [

    ],
  },
  {
    categoriaId: "m-22",
    titulares: [
      "Deane, Santiago",
      "Olmos Zenon",
      "De Elizalde, Iñaki",
      "Lopez Fresco, Diego",
      "Garibaldi Santiago",
      "Irarrázaval, Bautista",
      "Sola. Agusto",
      "Lanusse Bautista",
      "Martinez Roberto",
      "Samilian, Alex",
      "Dupont, Mateo",
      "Keena, Manuel",
      "Ruzo Ignacio",
      "Ramos Facundo",
      "Von Wuthenau Juan Cruz",
    ],
    suplentes: [
      ["16", "Benitez Cruz Blas"],
      ["17", "Molina Lucas"],
      ["18", "Socas, Justo"],
    ],
  },
  {
    categoriaId: "pre-c",
    titulares: [
      "Naveiro Joaquín",
      "Herrera, Segundo",
      "Urtubey Santiago",
      "Browne, Benjamin",
      "De Los Heros, Miguel",
      "Ferreccio, Tomas",
      "Terrado, Marcos",
      "Fellner, Francisco",
      "Bollini Marcos",
      "Benedit, Juan",
      "Lanza Juan",
      "Torello, Eduardo",
      "Bertón Moreno, Ignacio",
      "Zirolli Marcos",
      "Segura Bautista",
    ],
    suplentes: [
      ["16", "Sporleder Benicio"],
      ["17", "Rauch, Facundo"],
      ["18", "Zirolli Santiago"],
    ],
  },
  {
    categoriaId: "pre-d",
    titulares: [
      "Gassiebayle Ramón",
      "Gaviña, Segundo",
      "Garay, Delfin",
      "Frias, Gonzalo",
      "Monpelat Felipe",
      "Cáceres, Juan Manuel",
      "Skinner Ignacio",
      "Valls, José Quinto",
      "Iribarne Ignacio",
      "Vivequin, Cruz",
      "Adrogué Tomás",
      "Iribarne, Bautista",
      "Martignone, Saturnino",
      "Uranga Félix",
      "Saubidet, Jerónimo",
    ],
    suplentes: [
      ["16", "Gowland Esteban"],
      ["18", "Tezanos Pinto, Segundo"],
      ["19", "Pujato, Matías"],
      ["20", "Granato Wenceslao"],
    ],
  },
  {
    categoriaId: "pre-e",
    titulares: [
      "Aramburu Bautista",
      "Aramburu Marcos",
      "Shaw Santiago",
      "Bosch Fermín",
      "De Larrechea, Simon",
      "Alvarado, Juan",
      "Lanusse, Joaquín",
      "Olmos, Silvestre",
      "Lopez Saubidet Martín",
      "Garcia Igarza Nicolas",
      "Bosch Alfonso",
      "Busto, José",
      "Reinwick, Federico",
      "García Zavaleta, Fermín",
      "Massone Ramiro",
    ],
    suplentes: [
      ["16", "Pavlovsky José María"],
      ["17", "Reyna José"],
      ["18", "Von Wuthenau Facundo"],
      ["19", "Pernisek Federico"],
      ["20", "Pommer, Felipe"],
    ],
  },
  {
    categoriaId: "pre-f",
    titulares: [
      "Merello Santiago",
      "Iribas Tomás",
      "Muñoz Tomás",
      "Cáceres, Wenceslao",
      "Sbarra Bautista",
      "Ibañez Joaquín",
      "Lanusse Gerónimo",
      "Terán Joaquín",
      "Tedin Rufino",
      "Otero, Benjamín",
      "Pujato Francisco",
      "Varela, Simón",
      "Sluzewski, Santiago",
      "Santurio Pedro",
      "Galarraga, Simón",
    ],
    suplentes: [
      ["16", "Renati, Mateo"],
      ["17", "Monpelat Pedro"],
      ["18", "Bosch Vicente"],
      ["19", "Gibelli, Cruz"],
      ["20", "Adrogué Santiago"],
      ["21", "Tapia Valentín"],
    ],
  },
  {
    categoriaId: "pre-g",
    titulares: [
      "Mc Cormick Santiago",
      "Pettinaroli Martin",
      "González Del Solar, Santiago",
      "Prat Gay Iñaki",
      "Peña Camilo",
      "Heidkamp Felipe",
      "Bouquet, Esteban",
      "Vallebella, Joaquín",
      "Adrogué Cesar",
      "Guerrico Juan",
      "Gomez Alzaga Lucio",
      "Autilio, Juan Cruz",
      "Skinner Gonzalo",
      "Roca Santiago",
      "Daireaux, Marcos",
    ],
    suplentes: [
      ["16", "Cirio Rufino"],
      ["17", "Erize Bautista"],
      ["18", "Leupold, Santiago"],
      ["19", "Bonomi Matías"],
      ["20", "Blanco, Santiago"],
      ["21", "Muxi Tomás"],
      ["22", "Ithurralde Joaquín"],
      ["23", "Pahissa, Jaime"],
      ["24", "Ibañez Alfonso"],
      ["25", "Bonamico Benjamin"],
    ],
  },
  {
    categoriaId: "pre-h",
    titulares: [
      "Adrogue Marcos",
      "Paterson Jerónimo",
      "Malaspina Emiliano",
      "Mendilaharzu, Santos",
      "Quigley Thomas",
      "Marguery, Mateo",
      "Pezet Facundo",
      "Wilson Felipe",
      "Nolasco Francisco",
      "Pujato, Gonzalo",
      "Roca Santino",
      "Norman Archibald",
      "Chopourian, Manuel",
      "Montovio Marcos",
      "Thompson Santiago",
    ],
    suplentes: [
      ["16", "Bosch Ramón Maria"],
      ["17", "Sackmann Miguel"],
      ["22", "Busquet, Santiago"],
      ["23", "Saenz Valiente, Iñaki"],
      ["24", "Casellini Pedro"],
      ["25", "Medinger, Agustín"],
    ],
  },
];

function jugadoresDe(eq: EquipoFormacion): JugadorPartido[] {
  const out: JugadorPartido[] = eq.titulares.map((nombre, i) => ({
    nombre,
    dorsal: String(i + 1),
    titular: true,
    enCancha: true,
  }));
  eq.suplentes.forEach((s, i) => {
    const [dorsal, nombre] = typeof s === "string" ? [String(16 + i), s] : s;
    out.push({ nombre, dorsal, titular: false, enCancha: false });
  });
  return out;
}

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  if (dryRun) console.log("== DRY RUN: no se escribe nada ==\n");
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

    const jugadores = jugadoresDe(eq);
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
      `${pid}: ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl` +
        (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );
    if (dryRun) continue;

    for (const d of aBorrar) batch.delete(d.ref);
    for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
    batch.update(partidoRef, {
      formacionPublicada: false,
      enCanchaIds: titularesIds,
      formacionActualizadaEn: new Date(),
      updatedAt: new Date(),
    });
  }

  if (dryRun) {
    console.log("\n(DRY RUN) nada escrito.");
    return;
  }
  await batch.commit();
  console.log("\nListo. Formaciones cargadas como BORRADOR (sin publicar).");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
