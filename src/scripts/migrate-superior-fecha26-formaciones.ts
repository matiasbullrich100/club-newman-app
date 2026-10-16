// Carga las formaciones de la Fecha 26 de Plantel Superior (sabado 2026-10-17 vs CUBA en Newman; Pre F/G vs
// Los Tilos amistosos, Pre H vs Belgrano en Pinazo) como BORRADOR (formacionPublicada: false) -- transcriptas
// de "FECHA 26 - VS. CUBA.xlsx" que paso el club.
// Correr con: npx tsx src/scripts/migrate-superior-fecha26-formaciones.ts   (DRY_RUN=1 para solo mirar)
//
// Reglas (pedido explicito, standing): Primera, Intermedia y Pre A -> SOLO titulares (la planilla trae 1
// suplente de Primera -- Santarelli -- y 1 de Pre A -- Mc Grech -- que no se cargan). El resto: titulares +
// suplentes con el dorsal de la planilla.
// Correcciones sobre el texto crudo: Pre E #3 decia "Muñoz Tomás x" -> sin la "x"; los nombres de pila
// compuestos van con coma ("Dewey, Juan Pablo", "Pavlovsky, José María", "Von Wuthenau, Juan Cruz",
// "Autillio, Juan Cruz", "Bosch, Ramón Maria") para que splitNombre() los separe bien. "Sola. Agusto" y
// "Longinotii, Franco" quedan como en la planilla (ya existen asi en jugadores/).
// Idempotente; solo actua sobre partidos "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 26;

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[];
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    "categoriaId": "primera",
    "titulares": [
      "Bosch, Isidro",
      "Mackinlay, Teófilo",
      "Borio Luciano",
      "Ureta Jerónimo",
      "Lascombes, Francisco",
      "Montoya Mateo",
      "De la Vega, Joaquín",
      "Diaz de Vivar Rodrigo",
      "Nava, Lucas",
      "Llerena Florencio",
      "Ortiz Basualdo, Justo",
      "Keena Tomas",
      "Ulloa Cruz",
      "Ulloa Jeronimo",
      "Menendez, Carlos Quinto"
    ],
    "suplentes": []
  },
  {
    "categoriaId": "intermedia",
    "titulares": [
      "Wright James",
      "Pueyrredón Rodrigo",
      "Roggero, Francisco",
      "Cáceres, Tomás",
      "Fortín Pablo",
      "Bonasso Bautista",
      "Cocca Antonio",
      "Garay Teófilo",
      "Torello, Facundo",
      "Hardoy, José",
      "Vela, Carlos",
      "Uranga, Matías",
      "Longinotii, Franco",
      "Silva Alfonso",
      "Gutierrez Taboada Santiago"
    ],
    "suplentes": []
  },
  {
    "categoriaId": "pre-a",
    "titulares": [
      "Shaw, Marcos",
      "Granato, Belisario",
      "Dewey, Juan Pablo",
      "Ezcurra Ramón",
      "Ureta Tomas",
      "Dacunto, Juan Pablo",
      "Benedit, Juan Cruz",
      "Ruso Rufino",
      "Bullrich, Simón",
      "Benedit, Juan",
      "Mignone Germán",
      "Iribarren Marcos",
      "Casa Silvestre",
      "Pereyra, Cruz",
      "Monpelat Lucas"
    ],
    "suplentes": []
  },
  {
    "categoriaId": "pre-b",
    "titulares": [
      "De Elizalde, Iñaki",
      "Iribarne Gonzalo",
      "Walker Bautista",
      "Uranga Tomas",
      "Shaw Francisco",
      "Sola. Agusto",
      "Saravia Justo",
      "Monpelat, Nicolás",
      "Valls, Tomas",
      "Samilian, Alex",
      "Lanza Juan",
      "Bertón Moreno, Ignacio",
      "Longinotti Tomas",
      "Marolda Bautista",
      "Von Wuthenau, Juan Cruz"
    ],
    "suplentes": []
  },
  {
    "categoriaId": "m-22",
    "titulares": [
      "Gassiebayle Ramón",
      "Olmos Zenon",
      "Angelino, Alfonso",
      "Garibaldi Santiago",
      "Lopez Fresco, Diego",
      "Irarrázaval, Bautista",
      "Lanusse Bautista",
      "Mendonça, Tomás",
      "Martinez Roberto",
      "Otero, Benjamín",
      "Ramos Facundo",
      "Keena Manuel",
      "Ruzo Ignacio",
      "Socas, Justo",
      "Molina Lucas"
    ],
    "suplentes": [
      [
        "16",
        "Carey, Lucas"
      ],
      [
        "17",
        "Benitez Cruz Blas"
      ],
      [
        "18",
        "Pujato, Matías"
      ],
      [
        "19",
        "Dupont, Mateo"
      ]
    ]
  },
  {
    "categoriaId": "pre-c",
    "titulares": [
      "Naveiro Joaquín",
      "Herrera, Segundo",
      "Ibarguren Tomás",
      "Browne, Benjamin",
      "Sporleder Benicio",
      "Terrado, Marcos",
      "Ferreccio, Tomas",
      "Ezcurra, Felipe",
      "Bollini Marcos",
      "Vivequin, Cruz",
      "Uranga Félix",
      "Zirolli Santiago",
      "Torello Eduardo",
      "Zirolli Marcos",
      "Segura Bautista"
    ],
    "suplentes": [
      [
        "16",
        "Urtubey Santiago"
      ],
      [
        "17",
        "Gaviña, Segundo"
      ],
      [
        "18",
        "Garay, Delfin"
      ],
      [
        "19",
        "De Los Heros, Miguel"
      ],
      [
        "20",
        "Fellner, Francisco"
      ],
      [
        "21",
        "Rauch, Facundo"
      ]
    ]
  },
  {
    "categoriaId": "pre-d",
    "titulares": [
      "Deane, Santiago",
      "Aramburu Marcos",
      "Shaw Santiago",
      "Frias, Gonzalo",
      "De Larrechea, Simon",
      "Monpelat Felipe",
      "Cáceres, Juan Manuel",
      "Valls, José Quinto",
      "Iribarne Ignacio",
      "Von Wuthenau Facundo",
      "Granato Wenceslao",
      "Iribarne, Bautista",
      "Busto, José",
      "Adrogué Tomás",
      "Saubidet, Jerónimo"
    ],
    "suplentes": [
      [
        "16",
        "Aramburu Bautista"
      ],
      [
        "17",
        "Gowland Esteban"
      ],
      [
        "18",
        "Lanusse, Joaquín"
      ],
      [
        "19",
        "Tezanos Pinto, Segundo"
      ],
      [
        "20",
        "Martignone, Saturnino"
      ],
      [
        "21",
        "Bosch Alfonso"
      ]
    ]
  },
  {
    "categoriaId": "pre-e",
    "titulares": [
      "Merello Santiago",
      "Iribas Tomás",
      "Muñoz Tomás",
      "Pavlovsky, José María",
      "Bosch Fermín",
      "Alvarado, Juan",
      "Reyna José",
      "Olmos, Silvestre",
      "Davel, Lucas",
      "Tapia Valentín",
      "García Zavaleta, Fermín",
      "Reinwick, Federico",
      "Sluzewski Monto, Santiago",
      "Pommer, Felipe",
      "Massone Ramiro"
    ],
    "suplentes": [
      [
        "16",
        "Bosch Ramón"
      ],
      [
        "17",
        "Lanusse, Santiago"
      ],
      [
        "18",
        "Cáceres, Wenceslao"
      ],
      [
        "19",
        "Ibañez Joaquín"
      ],
      [
        "20",
        "Gibelli, Cruz"
      ],
      [
        "21",
        "Pernisek Federico"
      ],
      [
        "22",
        "Santurio Pedro"
      ]
    ]
  },
  {
    "categoriaId": "pre-f",
    "titulares": [
      "Lanusse Gerónimo",
      "Renati, Mateo",
      "Vallebella, Joaquín",
      "Heidkamp Felipe",
      "Sbarra Bautista",
      "Bosch Vicente",
      "Skinner Ignacio",
      "Terán Joaquín",
      "Lopez Saubidet Martín",
      "Guerrico Juan",
      "Adrogué Santiago",
      "Varela, Simón",
      "Autillio, Juan Cruz",
      "Pujato Francisco",
      "Galarraga, Simón"
    ],
    "suplentes": [
      [
        "16",
        "Bianco, Simón"
      ],
      [
        "17",
        "Tedin Rufino"
      ],
      [
        "18",
        "Daireaux, Marcos"
      ]
    ]
  },
  {
    "categoriaId": "pre-g",
    "titulares": [
      "Malaspina Emiliano",
      "Marguery, Mateo",
      "González Del Solar, Santiago",
      "Mc Cormick Santiago",
      "Gomez Alzaga Lucio",
      "Casá Fermín",
      "Prat Gay Iñaki",
      "Wilson Felipe",
      "Adrogué Cesar",
      "Amaral Quinto",
      "Cirio Rufino",
      "Skinner Gonzalo",
      "Pettinaroli Martin",
      "Bonamico Benjamin",
      "Roca Santino"
    ],
    "suplentes": [
      [
        "16",
        "Erize Bautista"
      ],
      [
        "17",
        "Ithurralde Joaquín"
      ],
      [
        "18",
        "Roca Santiago"
      ],
      [
        "19",
        "Bonomi Matías"
      ],
      [
        "20",
        "Cavanna Mateo"
      ],
      [
        "21",
        "Ibañez Alfonso"
      ],
      [
        "22",
        "Pahissa, Jaime"
      ],
      [
        "23",
        "Montovio Marcos"
      ]
    ]
  },
  {
    "categoriaId": "pre-h",
    "titulares": [
      "Adrogue Marcos",
      "Paterson Jerónimo",
      "Sackmann Miguel",
      "Mendilaharzu, Santos",
      "Busto Alejandro",
      "Monpelat Pedro",
      "Garat Ramón",
      "Pezet Facundo",
      "Vela Vicente",
      "Pujato, Gonzalo",
      "Norman Archibald",
      "Bosch, Ramón Maria",
      "Nolasco Francisco",
      "Muxi Tomás",
      "Thompson Santiago"
    ],
    "suplentes": [
      [
        "16",
        "Quigley Thomas"
      ],
      [
        "17",
        "Bosch Gonzalo"
      ],
      [
        "18",
        "Chopourian, Manuel"
      ],
      [
        "19",
        "Blanco, Santiago"
      ],
      [
        "20",
        "Busquet, Santiago"
      ],
      [
        "21",
        "Ibarzabal, Mateo"
      ]
    ]
  }
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  if (dryRun) console.log("== DRY RUN: no se escribe nada ==");
  const batch = adminDb.batch();

  for (const eq of EQUIPOS) {
    if (eq.titulares.length !== 15 || eq.titulares.some((n) => !n)) throw new Error(`${eq.categoriaId}: titulares incompletos`);
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
      ...eq.suplentes.map(([dorsal, nombre]) => ({ nombre, dorsal, titular: false, enCancha: false })),
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

  if (dryRun) return console.log("(DRY RUN) nada escrito.");
  await batch.commit();
  console.log("Listo. Formaciones cargadas como BORRADOR (sin publicar).");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
