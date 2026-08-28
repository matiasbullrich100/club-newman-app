// Carga las formaciones de la Fecha 4 de M19 (A/B/C/D/E) vs Champagnat, domingo 2026-08-30,
// como BORRADOR (formacionPublicada: false). Transcriptas de "Equipos M19 20260830.xlsx".
// Correr con: npm run migrate-m19-fecha4-formaciones
// DRY_RUN=1 npm run migrate-m19-fecha4-formaciones   -> simula, no escribe.
//
// M19 F no juega esta fecha (no existe el partido m19-f-f4 y en el Excel va vacío) -> se ignora.
// Los nombres del Excel vienen en MAYÚSCULAS: se pasan a Title Case para quedar igual que las
// fechas 1-3 ya cargadas ("Aberg Cobo, Juan Jose"). El id de jugador ignora may/min y acentos,
// así que igual cruza bien con lo ya cargado.
// Idempotente: pisa el plantel y borra los jugadores que hayan quedado de una corrida anterior.
// Solo actúa sobre partidos en estado "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 4;

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
  suplentes: string[];
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "m19-a",
    titulares: [
      "WALKER, Cruz",
      "SOLA, Geronimo",
      "VON GROLMAN, Juan Pablo",
      "GALICE NAON, Rodrigo",
      "GOTI, Enzo",
      "CHUTE, Benjamin",
      "DOMINGUEZ OLIVERA, Ramon",
      "LASCOMBES, Facundo",
      "BOSCH, Lucas",
      "LAGOS MARMOL, Maximo",
      "LANUSSE, Faustino",
      "ABERG COBO, Juan Jose",
      "LANUSSE, Tomas Andres",
      "GONZALEZ HUGHES, Marcos",
      "LANUSSE, Silvestre",
    ],
    suplentes: [
      "BOURDIEU, Carlos Maria",
      "LYNCH, Bautista Santiago",
      "BLAQUIER, Simon",
      "BOSCH, Emilio",
      "CARDONI, Beltran",
      "LUCERO TORRES, Marcos",
      "ULLOA, Ramon",
      "BARISIC, Ivan",
    ],
  },
  {
    categoriaId: "m19-b",
    titulares: [
      "BOURDIEU, Carlos Maria",
      "LYNCH, Bautista Santiago",
      "BLAQUIER, Simon",
      "CZAR, Felix",
      "ANCHORENA, Zenon",
      "CASTRO LACROZE, Benjamin",
      "IBARBIA, Benito",
      "BOSCH, Emilio",
      "LUCERO TORRES, Marcos",
      "ULLOA, Ramon",
      "RIVAS, Jeronimo",
      "ALTGELT, James",
      "URANGA, Felipe",
      "BARISIC, Ivan",
      "GOLLETTI, Sebastian",
    ],
    suplentes: [
      "MIHANOVICH, Ricardo",
      "PARRONDO, Simon",
      "ALEGRE, Dalmiro",
      "AUCHTER, Maximiliano",
      "CARDONI, Beltran",
      "SOLA, Santiago",
      "FELLNER OTOOLE, Benjamin",
      "BOSCH, Simon",
    ],
  },
  {
    categoriaId: "m19-c",
    titulares: [
      "THAYS, Agustin",
      "VIALE, Ramon",
      "ALEGRE, Dalmiro",
      "COLL, Romulo",
      "AUCHTER, Maximiliano",
      "RODRIGUEZ RIBAS, Simon",
      "LEONARD, Lucas",
      "SANTAMARINA, Miguel",
      "SOLA, Santiago",
      "LACASE, Manuel",
      "DOMINGUEZ ROVIRALTA, Tobias",
      "LLERENA, Froilan",
      "OTERO MONSEGUR, Ramon",
      "ACHAVAL RODRIGUEZ, Felix",
      "LOPEZ OLACIREGUI, Cruz",
    ],
    suplentes: [
      "MIHANOVICH, Ricardo",
      "PARRONDO, Simon",
      "VELARDE PENNELLA, Tomas",
      "LASCOMBES, Santiago",
      "CASTELLI, Bautista",
      "HOFFMANN, Amancio",
      "FELLNER OTOOLE, Benjamin",
      "BOSCH, Simon",
    ],
  },
  {
    categoriaId: "m19-d",
    titulares: [
      "BUCHANAN, Felipe Boyd",
      "BARBEITO, Pedro",
      "BAEZA, Francisco",
      "SARAVIA, Silvestre",
      "CACERES, Marcos",
      "RICHELET, Lucas",
      "BALLESTER, Justo",
      "AUGIER, Tomas",
      "MCCORMICK, Colin Francis",
      "VIGANO, Martin",
      "ALONSO, Tadeo",
      "VALLS, Gregorio",
      "URANGA, Jeronimo",
      "CORNEJO, Rufino Cruz",
      "MONTOVIO, Manuel",
    ],
    suplentes: [
      "GONZALEZ CALDERON, Isidro",
      "VIALE, Ramon",
      "VELARDE PENNELLA, Tomas",
      "LASCOMBES, Santiago",
      "CASTELLI, Bautista",
      "HOFFMANN, Amancio",
      "TERRADO, Indalecio",
      "HOUSSAY, Tomas",
    ],
  },
  {
    categoriaId: "m19-e",
    titulares: [
      "SLUZEWSKI MONTI, Ramon",
      "MORESCO, Salvador",
      "VILA ECHAGUE, Ramon",
      "ROSNER, Rufino",
      "BARBEITO ORTELLI, Federico",
      "CASARES, Juan Pablo",
      "LOUREIRO, Benjamin",
      "ORDOÑEZ, Bautista",
      "BULLRICH, Silvestre",
      "HERRERA, Marcial",
      "PRENESTE, Americo",
      "LOPEZ SAUBIDET, Felipe",
      "ITHURALDE, Felix",
      "NIELSEN, Pedro Antonio",
      "GARAT NOLTING, Iñaki",
    ],
    suplentes: [
      "BROWNE, Ignacio",
      "SANTAMARINA BERGADA, Eduardo",
      "MENDILAHARZU, Jose",
      "GOWLAND, Pedro",
      "ERRAMUSPE, Bautista",
      "LEDESMA, Ramon Jorge",
      "COLL URIBURU, Bautista",
      "GIMENEZ ZAPIOLA, Santos",
      "VELA, Marcial",
      "MARINO, Sebastian",
      "LIMPENNY, Nicolas",
    ],
  },
];

function jugadoresDe(equipo: EquipoFormacion): JugadorPartido[] {
  const out: JugadorPartido[] = [];
  equipo.titulares.forEach((nombre, i) => {
    out.push({ nombre: titleCase(nombre), dorsal: String(i + 1), titular: true, enCancha: true });
  });
  equipo.suplentes.forEach((nombre, i) => {
    out.push({ nombre: titleCase(nombre), dorsal: String(16 + i), titular: false, enCancha: false });
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
