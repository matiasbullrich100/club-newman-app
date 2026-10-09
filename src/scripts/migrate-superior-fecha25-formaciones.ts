// Carga las formaciones de la Fecha 25 de Plantel Superior (sabado 2026-10-10 vs CASI; Pre G el viernes
// 9/10 vs SIC G) como BORRADOR (formacionPublicada: false) -- transcriptas de
// "FECHA 25 - VS. CASI.xlsx" que paso el club. Pre H tiene Fecha libre (no se carga).
// Correr con: npx tsx src/scripts/migrate-superior-fecha25-formaciones.ts   (DRY_RUN=1 para solo mirar)
//
// Reglas (pedido explicito, standing): Primera, Intermedia y Pre A -> SOLO titulares (la planilla trae
// 3 suplentes de Primera: Lascombes, Montoya, Ortiz Basualdo -- no se cargan). El resto: titulares +
// suplentes con el dorsal de la planilla (hay saltos, ej. 16, 19, 20...).
// Correcciones sobre el texto crudo: Pre F #3 decia "Muñoz Tomás x" -> sin la "x"; los nombres de pila
// compuestos van con coma ("Dewey, Juan Pablo", "Pavlovsky, José María", "Von Wuthenau, Juan Cruz",
// "Autillio, Juan Cruz") para que splitNombre() los separe bien.
// Idempotente; solo actua sobre partidos "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 25;

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[];
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    "categoriaId": "primera",
    "titulares": [
      "Prince Miguel",
      "Salese, Beltran",
      "Bosch Bautista",
      "Cardinal Paul",
      "Urtubey Alejandro",
      "Ureta Jerónimo",
      "De la Vega, Joaquín",
      "Santarelli, Faustino",
      "Marguery Lucas",
      "Llerena Florencio",
      "Ulloa Jeronimo",
      "Lanfranco Benjamin",
      "Prince Simón",
      "Marolda, Santiago",
      "Daireaux, Juan Bautista"
    ],
    "suplentes": []
  },
  {
    "categoriaId": "intermedia",
    "titulares": [
      "Bosch, Isidro",
      "Mackinlay, Teófilo",
      "Borio Luciano",
      "Cáceres, Tomás",
      "Fortín Pablo",
      "Bonasso Bautista",
      "Cocca Antonio",
      "Garay Teófilo",
      "Nava, Lucas",
      "Hardoy, José",
      "Vela, Carlos",
      "Keena Tomas",
      "Ulloa Cruz",
      "Silva Alfonso",
      "Menendez, Carlos Quinto"
    ],
    "suplentes": []
  },
  {
    "categoriaId": "pre-a",
    "titulares": [
      "Wright James",
      "Pueyrredón Rodrigo",
      "Roggero, Francisco",
      "Ezcurra Ramón",
      "Ureta Tomas",
      "Demarchi Valentin",
      "Benedit, Juan Cruz",
      "Ruso Rufino",
      "Torello, Facundo",
      "Jaca Otaño, Iñaki",
      "Mignone Germán",
      "Uranga, Matías",
      "Casa Silvestre",
      "Pereyra, Cruz",
      "Gutierrez Taboada Santiago"
    ],
    "suplentes": []
  },
  {
    "categoriaId": "pre-b",
    "titulares": [
      "Shaw, Marcos",
      "Granato, Belisario",
      "Dewey, Juan Pablo",
      "Uranga Tomas",
      "Shaw Francisco",
      "Dacunto, Juan Pablo",
      "Saravia Justo",
      "Monpelat, Nicolás",
      "Bullrich, Simón",
      "Benedit, Juan",
      "Lanza Juan",
      "Iribarren Marcos",
      "Longinotti Tomas",
      "Marolda Bautista",
      "Monpelat Lucas"
    ],
    "suplentes": [
      [
        "16",
        "Valls, Tomas"
      ],
      [
        "19",
        "De Elizalde, Iñaki"
      ],
      [
        "20",
        "Iribarne Gonzalo"
      ],
      [
        "21",
        "Walker Bautista"
      ],
      [
        "22",
        "Garibaldi Santiago"
      ],
      [
        "23",
        "Sola. Agusto"
      ],
      [
        "24",
        "Samilian, Alex"
      ],
      [
        "25",
        "Ruzo Ignacio"
      ]
    ]
  },
  {
    "categoriaId": "m-22",
    "titulares": [
      "De Elizalde, Iñaki",
      "Olmos Zenon",
      "Angelino, Alfonso",
      "Lopez Fresco, Diego",
      "Garibaldi Santiago",
      "Espinosa Segundo",
      "Sola. Agusto",
      "Lanusse Bautista",
      "Benitez Cruz Blas",
      "Samilian, Alex",
      "Dupont, Mateo",
      "Pujato, Matías",
      "Ruzo Ignacio",
      "Socas, Justo",
      "Molina Lucas"
    ],
    "suplentes": [
      [
        "16",
        "Irarrázaval, Bautista"
      ],
      [
        "17",
        "Martinez Roberto"
      ],
      [
        "18",
        "Von Wuthenau, Juan Cruz"
      ],
      [
        "19",
        "Ramos Facundo"
      ],
      [
        "22",
        "Herrera, Segundo"
      ],
      [
        "23",
        "De Los Heros, Miguel"
      ]
    ]
  },
  {
    "categoriaId": "pre-c",
    "titulares": [
      "Urtubey Santiago",
      "Iribarne Gonzalo",
      "Walker Bautista",
      "Browne, Benjamin",
      "Sporleder Benicio",
      "Fellner, Francisco",
      "Cáceres, Juan Manuel",
      "Ezcurra, Felipe",
      "Rauch, Facundo",
      "Vivequin, Cruz",
      "Uranga Félix",
      "Zirolli Santiago",
      "Bertón Moreno, Ignacio",
      "Zirolli Marcos",
      "Segura Bautista"
    ],
    "suplentes": [
      [
        "16",
        "Naveiro Joaquín"
      ],
      [
        "17",
        "Herrera, Segundo"
      ],
      [
        "18",
        "De Los Heros, Miguel"
      ],
      [
        "19",
        "Terrado, Marcos"
      ],
      [
        "20",
        "Bollini Marcos"
      ],
      [
        "21",
        "Torello Eduardo"
      ]
    ]
  },
  {
    "categoriaId": "pre-d",
    "titulares": [
      "Gassiebayle Ramón",
      "Gaviña, Segundo",
      "Garay, Delfin",
      "Frias, Gonzalo",
      "Gowland Esteban",
      "Monpelat Felipe",
      "Lanusse, Joaquín",
      "Valls, José Quinto",
      "Tezanos Pinto, Segundo",
      "Von Wuthenau Facundo",
      "Granato Wenceslao",
      "Iribarne, Bautista",
      "Martignone, Saturnino",
      "Adrogué Tomás",
      "Saubidet, Jerónimo"
    ],
    "suplentes": [
      [
        "16",
        "Reyna José"
      ],
      [
        "17",
        "De Larrechea, Simon"
      ],
      [
        "18",
        "Iribarne Ignacio"
      ],
      [
        "19",
        "Busto, José"
      ],
      [
        "20",
        "García Zavaleta, Fermín"
      ],
      [
        "23",
        "Aramburu Bautista"
      ],
      [
        "24",
        "Aramburu Marcos"
      ],
      [
        "25",
        "Shaw Santiago"
      ]
    ]
  },
  {
    "categoriaId": "pre-e",
    "titulares": [
      "Aramburu Bautista",
      "Aramburu Marcos",
      "Shaw Santiago",
      "Pavlovsky, José María",
      "Bosch Fermín",
      "Alvarado, Juan",
      "Ibañez Joaquín",
      "Olmos, Silvestre",
      "Davel, Lucas",
      "Garcia Igarza Nicolas",
      "Bosch Alfonso",
      "Reinwick, Federico",
      "Pernisek Federico",
      "Pommer, Felipe",
      "Massone Ramiro"
    ],
    "suplentes": [
      [
        "16",
        "Cáceres, Wenceslao"
      ],
      [
        "17",
        "Terán Joaquín"
      ],
      [
        "18",
        "Gibelli, Cruz"
      ],
      [
        "19",
        "Sluzewski Monto, Santiago"
      ],
      [
        "20",
        "Adrogué Santiago"
      ]
    ]
  },
  {
    "categoriaId": "pre-f",
    "titulares": [
      "Merello Santiago",
      "Iribas Tomás",
      "Muñoz Tomás",
      "Heidkamp Felipe",
      "Sbarra Bautista",
      "Bosch Vicente",
      "Lanusse Gerónimo",
      "Vallebella, Joaquín",
      "Tedin Rufino",
      "Otero, Benjamín",
      "Santurio Pedro",
      "Varela, Simón",
      "Tapia Valentín",
      "Pujato Francisco",
      "Galarraga, Simón"
    ],
    "suplentes": [
      [
        "16",
        "Renati, Mateo"
      ],
      [
        "17",
        "Mc Cormick Santiago"
      ],
      [
        "18",
        "Bianco, Simón"
      ],
      [
        "19",
        "Adrogué Cesar"
      ],
      [
        "20",
        "Autillio, Juan Cruz"
      ],
      [
        "21",
        "Daireaux, Marcos"
      ],
      [
        "23",
        "Aramburu Bautista"
      ],
      [
        "24",
        "Shaw Santiago"
      ]
    ]
  },
  {
    "categoriaId": "pre-g",
    "titulares": [
      "Bonamico Benjamin",
      "Prat Gay Iñaki",
      "González Del Solar, Santiago",
      "Leupold, Santiago",
      "Gomez Alzaga Lucio",
      "Roca Santiago",
      "Muxi Tomás",
      "Wilson Felipe",
      "Ibañez Alfonso",
      "Guerrico Juan",
      "Ithurralde Joaquín",
      "Skinner Gonzalo",
      "Pettinaroli Martin",
      "Erize Bautista",
      "Cirio Rufino"
    ],
    "suplentes": [
      [
        "16",
        "Cavanna Mateo"
      ],
      [
        "17",
        "Roca Santino"
      ],
      [
        "18",
        "Amaral Quinto"
      ],
      [
        "19",
        "Pujato, Gonzalo"
      ],
      [
        "20",
        "Montovio Marcos"
      ],
      [
        "21",
        "Pahissa, Jaime"
      ],
      [
        "22",
        "Bonomi Matías"
      ],
      [
        "23",
        "Nolasco Francisco"
      ],
      [
        "24",
        "Thompson Santiago"
      ],
      [
        "25",
        "Malaspina Emiliano"
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
