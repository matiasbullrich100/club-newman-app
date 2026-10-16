// M19 A / C / D vs BACRC (Fecha 7, postergada: domingo 2026-10-18 en Newman; A 12:30, C y D 11:00), formaciones
// pasadas por el club ("Equipos M19 20261018.xlsx", hoja ResumenEquipos: titulares dorsal 1-15 + suplentes con el
// dorsal de la planilla, hay saltos). Se cargan como BORRADOR (formacionPublicada: false) -- se publican cuando el
// club lo pida. M19 A es el partido que se suspendio por clima con 7-0 (1T) y se retoma: no se tocan
// incidencias ni reloj, solo el plantel y quienes arrancan en cancha. Idempotente; solo "programado" (C, D) o
// "suspendido" (A). Correr con: npx tsx src/scripts/migrate-m19-fecha7-bacrc-formaciones.ts   (DRY_RUN=1 para mirar)

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 7;
const FECHA = "2026-10-18";

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
      "WALKER, Cruz",
      "LYNCH, Bautista Santiago",
      "VON GROLMAN, Juan Pablo",
      "GALICE NAON, Rodrigo",
      "CHUTE, Benjamin",
      "DOMINGUEZ OLIVERA, Ramon",
      "IBARBIA, Benito",
      "LASCOMBES, Facundo",
      "BOSCH, Lucas",
      "ULLOA, Ramon",
      "BARISIC, Ivan",
      "LAGOS MARMOL, Maximo",
      "RIVAS, Jeronimo",
      "GONZALEZ HUGHES, Marcos",
      "LANUSSE, Silvestre"
    ],
    "suplentes": [
      [
        "16",
        "BOURDIEU, Carlos Maria"
      ],
      [
        "17",
        "BLAQUIER, Simon"
      ],
      [
        "18",
        "GONZALEZ CALDERON, Isidro"
      ],
      [
        "19",
        "GOTI, Enzo"
      ],
      [
        "20",
        "CARDONI, Beltran"
      ],
      [
        "21",
        "ITURBE, Jeronimo"
      ],
      [
        "22",
        "URANGA, Felipe"
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
      "BAEZA, Francisco",
      "CACERES, Marcos",
      "HERNANDEZ SERRANO, Benjamin",
      "RODRIGUEZ RIBAS, Simon",
      "LEONARD, Lucas",
      "SANTAMARINA, Miguel",
      "SOLA, Santiago",
      "FELLNER OTOOLE, Benjamin",
      "ELIAS, Cristobal",
      "HOUSSAY, Tomas",
      "VALLS, Gregorio",
      "ALONSO, Tadeo",
      "LOPEZ OLACIREGUI, Cruz"
    ],
    "suplentes": [
      [
        "16",
        "PARRONDO, Simon"
      ],
      [
        "17",
        "MIHANOVICH, Ricardo"
      ],
      [
        "18",
        "DIAZ DE VIVAR, Joaquin"
      ],
      [
        "19",
        "FEENEY, Vicente"
      ],
      [
        "20",
        "COLL, Romulo"
      ],
      [
        "21",
        "MCCORMICK, Colin Francis"
      ],
      [
        "22",
        "LACASE, Manuel"
      ],
      [
        "23",
        "HOFFMANN, Amancio"
      ]
    ]
  },
  {
    "categoriaId": "m19-d",
    "titulares": [
      "ALEGRE, Dalmiro",
      "VIALE, Ramon",
      "BUCHANAN, Felipe Boyd",
      "LASCOMBES, Santiago",
      "SARAVIA, Silvestre",
      "ORDOÑEZ, Bautista",
      "AUGIER, Tomas",
      "BALLESTER, Justo",
      "REYNA, Santos",
      "VIGANO, Martin",
      "ITHURALDE, Felix",
      "URANGA, Jeronimo",
      "ERRAMUSPE, Bautista",
      "MARINO, Sebastian",
      "GIMENEZ ZAPIOLA, Santos"
    ],
    "suplentes": [
      [
        "17",
        "BROWNE, Ignacio"
      ],
      [
        "18",
        "CORNEJO, Rufino Cruz"
      ],
      [
        "19",
        "MACHADO MALBRAN, Santiago"
      ],
      [
        "20",
        "MENDILAHARZU, Jose"
      ],
      [
        "21",
        "PRENESTE, Americo"
      ],
      [
        "22",
        "DOMINGUEZ ROVIRALTA, Tobias"
      ],
      [
        "23",
        "MONTOVIO, Manuel"
      ],
      [
        "24",
        "SANTAMARINA BERGADA, Eduardo"
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
    if (eq.titulares.length !== 15) throw new Error(`${eq.categoriaId}: ${eq.titulares.length} titulares`);
    const pid = partidoId(eq.categoriaId, NUMERO_FECHA);
    const partidoRef = adminDb.collection("partidos").doc(pid);
    const snap = await partidoRef.get();
    if (!snap.exists) throw new Error(`${pid} no existe`);
    const d = snap.data() as { estado?: string; fecha?: string; rival?: string };
    if (d.fecha !== FECHA) throw new Error(`${pid}: fecha "${d.fecha}" (esperaba ${FECHA})`);
    if (d.estado !== "programado" && !(eq.categoriaId === "m19-a" && d.estado === "suspendido")) {
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
    console.log(
      `${pid} vs ${d.rival} [${d.estado}]: ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl` + (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );
    if (dryRun) continue;
    for (const x of aBorrar) batch.delete(x.ref);
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
