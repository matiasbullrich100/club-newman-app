// M19 Fecha 9 (domingo 2026-10-11, de local vs Pucara A/B/C/D y Los Molinos C), pasada por el club
// ("Libro (2).xlsx"): carga y PUBLICA las formaciones de M19 A/B/C/E (titulares + suplentes con el
// dorsal de la planilla); M19 D gano por WO (Pucara D no se presento -> Newman 8-0); M19 F tiene
// Fecha libre (se crea el partido f9 como Fecha libre, igual que sus fechas 1-3).
// "BOSCH, Justo" de M19 E es OTRO jugador que el de M17: se carga como "Bosch Peluffo, Justo".
// Correr con: npx tsx src/scripts/migrate-m19-fecha9.ts   (DRY_RUN=1 para solo mirar)
// Idempotente; solo actua sobre partidos "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 9;
const FECHA = "2026-10-11";

function titleCase(nombre: string): string {
  return nombre
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[];
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    "categoriaId": "m19-a",
    "titulares": [
      "BOURDIEU, Carlos Maria",
      "WALKER, Cruz",
      "VON GROLMAN, Juan Pablo",
      "ANCHORENA, Zenon",
      "GALICE NAON, Rodrigo",
      "DOMINGUEZ OLIVERA, Ramon",
      "CARDONI, Beltran",
      "LASCOMBES, Facundo",
      "ITURBE, Jeronimo",
      "ULLOA, Ramon",
      "BARISIC, Ivan",
      "ABERG COBO, Juan Jose",
      "LANUSSE, Faustino",
      "RIVAS, Jeronimo",
      "LANUSSE, Silvestre"
    ],
    "suplentes": [
      [
        "16",
        "BLAQUIER, Simon"
      ],
      [
        "17",
        "LYNCH, Bautista Santiago"
      ],
      [
        "18",
        "MIHANOVICH, Ricardo"
      ],
      [
        "19",
        "CHUTE, Benjamin"
      ],
      [
        "20",
        "IBARBIA, Benito"
      ],
      [
        "21",
        "BOSCH, Lucas"
      ],
      [
        "22",
        "LAGOS MARMOL, Maximo"
      ],
      [
        "23",
        "GOLLETTI, Sebastian"
      ]
    ]
  },
  {
    "categoriaId": "m19-b",
    "titulares": [
      "VELARDE PENNELLA, Tomas",
      "MIHANOVICH, Ricardo",
      "GONZALEZ CALDERON, Isidro",
      "CZAR, Felix",
      "COLL, Romulo",
      "SANTAMARINA, Miguel",
      "CASTRO LACROZE, Benjamin",
      "BOSCH, Emilio",
      "LUCERO TORRES, Marcos",
      "FELLNER OTOOLE, Benjamin",
      "GONZALEZ HUGHES, Marcos",
      "LLERENA, Froilan",
      "BOSCH, Simon",
      "ACHAVAL RODRIGUEZ, Felix",
      "GOLLETTI, Sebastian"
    ],
    "suplentes": [
      [
        "16",
        "THAYS, Agustin"
      ],
      [
        "17",
        "BARBEITO, Pedro"
      ],
      [
        "18",
        "BAEZA, Francisco"
      ],
      [
        "19",
        "HERNANDEZ SERRANO, Benjamin"
      ],
      [
        "20",
        "LEONARD, Lucas"
      ],
      [
        "21",
        "SOLA, Santiago"
      ],
      [
        "23",
        "LOPEZ OLACIREGUI, Cruz"
      ]
    ]
  },
  {
    "categoriaId": "m19-c",
    "titulares": [
      "THAYS, Agustin",
      "BARBEITO, Pedro",
      "BAEZA, Francisco",
      "CACERES, Marcos",
      "HERNANDEZ SERRANO, Benjamin",
      "BULLRICH, Silvestre",
      "ORDOÑEZ, Bautista",
      "AUGIER, Tomas",
      "SOLA, Santiago",
      "LACASE, Manuel",
      "ITHURALDE, Felix",
      "HOUSSAY, Tomas",
      "TERRADO, Indalecio",
      "HOFFMANN, Amancio",
      "LOPEZ OLACIREGUI, Cruz"
    ],
    "suplentes": [
      [
        "16",
        "ALEGRE, Dalmiro"
      ],
      [
        "17",
        "BROWNE, Ignacio"
      ],
      [
        "18",
        "ROSNER, Rufino"
      ],
      [
        "19",
        "RODRIGUEZ RIBAS, Simon"
      ],
      [
        "20",
        "LEONARD, Lucas"
      ],
      [
        "21",
        "REYNA, Santos"
      ],
      [
        "22",
        "VALLS, Gregorio"
      ],
      [
        "23",
        "ALONSO, Tadeo"
      ],
      [
        "24",
        "LASCOMBES, Santiago"
      ]
    ]
  },
  {
    "categoriaId": "m19-e",
    "titulares": [
      "ARENAZA, Justo",
      "VILA ECHAGUE, Ramon",
      "SALESE, Silvestre Jose",
      "ONETO GAONA, Simon",
      "SARAVIA, Silvestre",
      "LOPEZ SAUBIDET, Felipe",
      "SANTAMARINA BERGADA, Eduardo",
      "MENDILAHARZU, Jose",
      "MCCORMICK, Colin Francis",
      "VIGANO, Martin",
      "PRENESTE, Americo",
      "SUNDBLAD, Simon",
      "MARINO, Sebastian",
      "BOSCH PELUFFO, Justo",
      "GIMENEZ ZAPIOLA, Santos"
    ],
    "suplentes": [
      [
        "16",
        "BALLESTER, Justo"
      ],
      [
        "17",
        "CASARES, Juan Pablo"
      ],
      [
        "18",
        "RICHELET, Lucas"
      ],
      [
        "19",
        "LOUREIRO, Benjamin"
      ],
      [
        "20",
        "ERRAMUSPE, Bautista"
      ],
      [
        "21",
        "BERTON MORENO, Gonzalo"
      ],
      [
        "22",
        "MORESCO, Salvador"
      ],
      [
        "23",
        "HERRERA, Marcial"
      ]
    ]
  }
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue, Timestamp } = await import("firebase-admin/firestore");
  if (dryRun) console.log("== DRY RUN: no se escribe nada ==");
  const batch = adminDb.batch();

  for (const eq of EQUIPOS) {
    if (eq.titulares.length !== 15) throw new Error(`${eq.categoriaId}: ${eq.titulares.length} titulares`);
    const pid = partidoId(eq.categoriaId, NUMERO_FECHA);
    const partidoRef = adminDb.collection("partidos").doc(pid);
    const snap = await partidoRef.get();
    if (!snap.exists) throw new Error(`${pid} no existe`);
    const d = snap.data() as { estado?: string; fecha?: string; rival?: string };
    if (d.fecha !== FECHA) throw new Error(`${pid}: fecha "${d.fecha}" (esperaba ${FECHA})`);
    if (d.estado !== "programado") {
      console.warn(`SALTEADO ${pid}: estado "${d.estado}"`);
      continue;
    }
    const jugadores: JugadorPartido[] = [
      ...eq.titulares.map((n, i) => ({ nombre: titleCase(n), dorsal: String(i + 1), titular: true, enCancha: true })),
      ...eq.suplentes.map(([dorsal, n]) => ({ nombre: titleCase(n), dorsal, titular: false, enCancha: false })),
    ];
    const ids = new Map<string, string>();
    for (const j of jugadores) {
      const id = playerId(j.nombre);
      if (ids.has(id)) throw new Error(`${pid}: "${j.nombre}" y "${ids.get(id)}" generan el mismo id "${id}"`);
      ids.set(id, j.nombre);
    }
    const plantelSnap = await partidoRef.collection("plantel").get();
    const aBorrar = plantelSnap.docs.filter((x) => !ids.has(x.id));
    const titularesIds = jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre));
    console.log(`${pid} vs ${d.rival}: ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl` + (aBorrar.length ? `, borra ${aBorrar.length} viejos` : ""));
    if (dryRun) continue;
    for (const x of aBorrar) batch.delete(x.ref);
    for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
    batch.update(partidoRef, {
      formacionPublicada: true,
      enCanchaIds: titularesIds,
      formacionActualizadaEn: new Date(),
      updatedAt: new Date(),
    });
  }

  // M19 D: WO de Pucara D -> gana Newman 8-0 (replica registrarWalkover()).
  const refD = adminDb.collection("partidos").doc(partidoId("m19-d", NUMERO_FECHA));
  const dD = (await refD.get()).data() as { estado?: string; rival?: string } | undefined;
  if (dD?.estado === "programado") {
    console.log(`m19-d-f9 vs ${dD.rival}: W.O. del rival -> Newman 8-0`);
    if (!dryRun) {
      batch.update(refD, { estado: "terminado", "resultado.newman": 8, "resultado.rival": 0, updatedAt: FieldValue.serverTimestamp() });
      batch.set(refD.collection("incidentes").doc(), {
        tipo: "walkover",
        equipo: "rival",
        periodo: "1T",
        minuto: 0,
        segundoAbsoluto: 0,
        publicadoPorCuentaId: "script",
        createdAt: Timestamp.now(),
      });
    }
  } else {
    console.warn(`m19-d-f9 se saltea (estado "${dD?.estado}")`);
  }

  // M19 F: Fecha libre (el doc f9 no existia).
  const refF = adminDb.collection("partidos").doc(partidoId("m19-f", NUMERO_FECHA));
  if (!(await refF.get()).exists) {
    console.log("m19-f-f9: se crea como Fecha libre");
    if (!dryRun) {
      batch.set(refF, {
        categoriaId: "m19-f",
        numeroFecha: NUMERO_FECHA,
        fecha: FECHA,
        estado: "programado",
        resultado: { newman: 0, rival: 0 },
        cancha: "-",
        esLocal: true,
        notaEspecial: "Fecha libre",
        rival: "Libre",
        enCanchaIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } else {
    console.log("m19-f-f9 ya existe, no se toca");
  }

  if (dryRun) return console.log("(DRY RUN) nada escrito.");
  await batch.commit();
  console.log("Listo.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
