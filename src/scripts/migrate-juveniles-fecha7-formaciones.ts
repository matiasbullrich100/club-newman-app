// Carga las formaciones de la Fecha 7 de M19 (A-E, vs BACRC) y M16 (A-D, vs SIC), domingo 2026-09-27,
// como BORRADOR (formacionPublicada: false). M19: "Equipos M19 20260927.xlsx" (hoja ResumenEquipos;
// M19 F no juega). M16: imagen "M16 2026" (el rotulo decia "DOMINGO 13/9" pero horarios y rivales
// SIC A/B/C/D de local coinciden con la Fecha 7). M16 no trae suplentes.
// Correr con: npx tsx src/scripts/migrate-juveniles-fecha7-formaciones.ts   (DRY_RUN=1 para solo mirar)
//
// Los nombres vienen "APELLIDO, Nombre": se pasan por titleCase() igual que en fechas anteriores.
// Suplentes de M19 con el dorsal de la planilla (16-23; los casilleros vacios se saltean).
// Idempotente; solo actua sobre partidos "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 7;

function titleCase(nombre: string): string {
  return nombre
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[]; // 15
  suplentes: [string, string][]; // [dorsal, nombre] o vacio
}

const EQUIPOS_RAW = [
  {
    "categoriaId": "m19-a",
    "titulares": [
      "BOURDIEU, Carlos Maria",
      "SOLA, Geronimo",
      "VON GROLMAN, Juan Pablo",
      "ANCHORENA, Zenon",
      "GALICE NAON, Rodrigo",
      "DOMINGUEZ OLIVERA, Ramon",
      "CARDONI, Beltran",
      "LASCOMBES, Facundo",
      "BOSCH, Lucas",
      "ULLOA, Ramon",
      "BARISIC, Ivan",
      "ABERG COBO, Juan Jose",
      "ALTGELT, James",
      "RIVAS, Jeronimo",
      "LANUSSE, Silvestre"
    ],
    "suplentes": [
      [
        "16",
        "WALKER, Cruz"
      ],
      [
        "17",
        "LYNCH, Bautista Santiago"
      ],
      [
        "18",
        "DIAZ DE VIVAR, Joaquin"
      ],
      [
        "19",
        "GOTI, Enzo"
      ],
      [
        "20",
        "CHUTE, Benjamin"
      ],
      [
        "21",
        "LUCERO TORRES, Marcos"
      ],
      [
        "22",
        "LAGOS MARMOL, Maximo"
      ]
    ]
  },
  {
    "categoriaId": "m19-b",
    "titulares": [
      "BLAQUIER, Simon",
      "PARRONDO, Simon",
      "DIAZ DE VIVAR, Joaquin",
      "CZAR, Felix",
      "COLL, Romulo",
      "CASTRO LACROZE, Benjamin",
      "IBARBIA, Benito",
      "GALARRAGA, Francisco",
      "ITURBE, Jeronimo",
      "LLERENA, Froilan",
      "BELAUSTEGUI, Vicente",
      "URANGA, Felipe",
      "BOSCH, Simon",
      "ALONSO, Tadeo",
      "LOPEZ OLACIREGUI, Cruz"
    ],
    "suplentes": [
      [
        "16",
        "VELARDE PENNELLA, Tomas"
      ],
      [
        "17",
        "LYNCH, Bautista Santiago"
      ],
      [
        "18",
        "WALKER, Cruz"
      ],
      [
        "19",
        "FEENEY, Vicente"
      ],
      [
        "20",
        "BOSCH, Emilio"
      ],
      [
        "21",
        "LUCERO TORRES, Marcos"
      ],
      [
        "22",
        "FELLNER OTOOLE, Benjamin"
      ],
      [
        "23",
        "GOLLETTI, Sebastian"
      ]
    ]
  },
  {
    "categoriaId": "m19-c",
    "titulares": [
      "VELARDE PENNELLA, Tomas",
      "BARBEITO, Pedro",
      "GONZALEZ CALDERON, Isidro",
      "CACERES, Marcos",
      "AUCHTER, Maximiliano",
      "LEONARD, Lucas",
      "RODRIGUEZ RIBAS, Simon",
      "SANTAMARINA, Miguel",
      "SOLA, Santiago",
      "LACASE, Manuel",
      "CORNEJO, Rufino Cruz",
      "OTERO MONSEGUR, Ramon",
      "URANGA, Jeronimo",
      "ACHAVAL RODRIGUEZ, Felix",
      "ELIAS, Cristobal"
    ],
    "suplentes": [
      [
        "16",
        "THAYS, Agustin"
      ],
      [
        "17",
        "BAEZA, Francisco"
      ],
      [
        "18",
        "MIHANOVICH, Ricardo"
      ],
      [
        "19",
        "FEENEY, Vicente"
      ],
      [
        "20",
        "BOSCH, Emilio"
      ],
      [
        "21",
        "MCCORMICK, Colin Francis"
      ],
      [
        "22",
        "FELLNER OTOOLE, Benjamin"
      ],
      [
        "23",
        "CASTELLI, Bautista"
      ]
    ]
  },
  {
    "categoriaId": "m19-d",
    "titulares": [
      "BUCHANAN, Felipe Boyd",
      "VIALE, Ramon",
      "ALEGRE, Dalmiro",
      "MENDILAHARZU, Jose",
      "HERNANDEZ SERRANO, Benjamin",
      "AUGIER, Tomas",
      "BULLRICH, Silvestre",
      "BALLESTER, Justo",
      "REYNA, Santos",
      "VIGANO, Martin",
      "HOFFMANN, Amancio",
      "HOUSSAY, Tomas",
      "ERRAMUSPE, Bautista",
      "TERRADO, Indalecio",
      "GIMENEZ ZAPIOLA, Santos"
    ],
    "suplentes": [
      [
        "17",
        "CASTELLI, Bautista"
      ],
      [
        "18",
        "LEONARD, Lucas"
      ],
      [
        "19",
        "DOMINGUEZ ROVIRALTA, Tobias"
      ],
      [
        "20",
        "ITHURALDE, Felix"
      ]
    ]
  },
  {
    "categoriaId": "m19-e",
    "titulares": [
      "VILA ECHAGUE, Ramon",
      "SLUZEWSKI MONTI, Ramon",
      "SARAVIA, Silvestre",
      "ARENAZA, Justo",
      "MACHADO MALBRAN, Santiago",
      "SANTAMARINA BERGADA, Eduardo",
      "ORDOÑEZ, Bautista",
      "ROSNER, Rufino",
      "LIMPENNY, Nicolas",
      "MARINO, Sebastian",
      "PRENESTE, Americo",
      "SEGURA, Indalecio",
      "LOPEZ SAUBIDET, Felipe",
      "NIELSEN, Pedro Antonio",
      "GARAT NOLTING, Iñaki"
    ],
    "suplentes": [
      [
        "16",
        "LEDESMA, Ramon Jorge"
      ],
      [
        "17",
        "BOSCH, Justo"
      ],
      [
        "18",
        "SUNDBLAD, Simon"
      ],
      [
        "19",
        "MORESCO, Salvador"
      ],
      [
        "20",
        "CASARES, Juan Pablo"
      ],
      [
        "22",
        "LOUREIRO, Benjamin"
      ],
      [
        "23",
        "BROWNE, Ignacio"
      ]
    ]
  },
  {
    "categoriaId": "m16-a",
    "titulares": [
      "BARLETTA, SANTINO",
      "LLAVALLOL, GERONIMO",
      "GILLIGAN, JERONIMO",
      "SAUL, BENJAMIN",
      "TESSORE, BENITO",
      "NORES, FELIPE",
      "MÜLLER, SANTINO",
      "DIAZ DE VIVAR, RAMON",
      "SACKMANN, RAMON",
      "SLUZEWSKI, TOMAS",
      "URANGA, MATEO",
      "CONTEPOMI, SILVESTRE",
      "RODRIGUEZ RIBAS, AGUSTIN",
      "PETERS, JUSTO",
      "AUTILIO, BENJAMIN"
    ],
    "suplentes": []
  },
  {
    "categoriaId": "m16-b",
    "titulares": [
      "SOLA, JUAN",
      "MIGUENS, SANTIAGO",
      "SALESE, RAMON",
      "CASTELLI, FELIPE",
      "FABBRI, SANTINO",
      "PALMA, BENJAMIN",
      "CASA, FELIX",
      "RICHELET, JUAN",
      "PUIG, SALVADOR",
      "SUAYA, LORENZO",
      "HERRERA, RUFINO",
      "RENTERIA, MARCOS",
      "MERELLO, SIMON",
      "NORMAN, MARCOS",
      "OLIVERA, DIOGENES"
    ],
    "suplentes": []
  },
  {
    "categoriaId": "m16-c",
    "titulares": [
      "LALOR, MIGUEL",
      "IBARBIA, RUFINO",
      "POLIZZA, DELFIN",
      "VELARDE, PEDRO",
      "IBARGUREN, SANTIAGO",
      "OLMOS, FELIPE",
      "CARDONI, RAFAEL",
      "CASSAGNE, LUIS",
      "ESTRADA, IGNACIO",
      "MAQUEDA, RAFAEL",
      "MOYANO, SANTIAGO",
      "SUMMERS, OLIVER",
      "VAZQUEZ CAPUTO, AGUSTIN",
      "VILA ECHAGÜE, JUAN",
      "MAMMOLINO, FRANCISCO"
    ],
    "suplentes": []
  },
  {
    "categoriaId": "m16-d",
    "titulares": [
      "KEMP, CRUZ",
      "ALVEAR, FRANCISCO",
      "Mc CORMICK, ALFONSO",
      "MÜLLER, PASCAL",
      "ARAMBURU, SANTIAGO",
      "SOUTHALL, GALO",
      "BOCCARDO, MATEO",
      "GILARDI, SIMON",
      "LEONARD, SALVADOR",
      "MONTOVIO, IGNACIO",
      "CASTELLI, PEDRO",
      "OCAMPO, SALVADOR",
      "SIMON PADROS, JUAN",
      "ACHAVAL, RUFINO",
      "GUYOT, LUCAS"
    ],
    "suplentes": []
  }
] as unknown as { categoriaId: string; titulares: string[]; suplentes: (string[] | [string, string])[] }[];

const EQUIPOS: EquipoFormacion[] = EQUIPOS_RAW.map((e) => ({
  categoriaId: e.categoriaId,
  titulares: e.titulares,
  suplentes: e.suplentes as [string, string][],
}));

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
