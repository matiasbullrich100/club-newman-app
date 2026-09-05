// Carga las formaciones de la Fecha 5 de M19 (A/B/C/D/E) vs San Luis/San Martín, domingo
// 2026-09-06, como BORRADOR (formacionPublicada: false). Transcriptas de "Equipos M19
// 20260906.xlsx". Correr con: npm run migrate-m19-fecha5-formaciones
// DRY_RUN=1 npm run migrate-m19-fecha5-formaciones   -> simula, no escribe.
//
// M19 F no juega esta fecha (no existe el partido m19-f-f5 y en el Excel va vacío) -> se ignora.
// Los nombres del Excel vienen en MAYÚSCULAS: se pasan a Title Case para quedar igual que las
// fechas anteriores ("Aberg Cobo, Juan Jose"). El id de jugador ignora may/min y acentos, así
// que igual cruza bien con lo ya cargado.
// Idempotente: pisa el plantel y borra los jugadores que hayan quedado de una corrida anterior.
// Solo actúa sobre partidos en estado "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 5;

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
      "BOURDIEU, Carlos Maria",
      "SOLA, Geronimo",
      "VON GROLMAN, Juan Pablo",
      "ANCHORENA, Zenon",
      "GALICE NAON, Rodrigo",
      "CHUTE, Benjamin",
      "CARDONI, Beltran",
      "LASCOMBES, Facundo",
      "BOSCH, Lucas",
      "LAGOS MARMOL, Maximo",
      "RIVAS, Jeronimo",
      "ABERG COBO, Juan Jose",
      "ALTGELT, James",
      "GONZALEZ HUGHES, Marcos",
      "LANUSSE, Silvestre",
    ],
    suplentes: [
      "WALKER, Cruz",
      "LYNCH, Bautista Santiago",
      "BLAQUIER, Simon",
      "GOTI, Enzo",
      "DOMINGUEZ OLIVERA, Ramon",
      "SOLA, Santiago",
      "ULLOA, Ramon",
    ],
  },
  {
    categoriaId: "m19-b",
    titulares: [
      "THAYS, Agustin",
      "PARRONDO, Simon",
      "BLAQUIER, Simon",
      "CZAR, Felix",
      "AUCHTER, Maximiliano",
      "GALARRAGA, Francisco",
      "IBARBIA, Benito",
      "BOSCH, Emilio",
      "LUCERO TORRES, Marcos",
      "ULLOA, Ramon",
      "BARISIC, Ivan",
      "LLERENA, Froilan",
      "BOSCH, Simon",
      "ACHAVAL RODRIGUEZ, Felix",
      "GOLLETTI, Sebastian",
    ],
    suplentes: [
      "MIHANOVICH, Ricardo",
      "LYNCH, Bautista Santiago",
      "WALKER, Cruz",
      "GOTI, Enzo",
      "CASTRO LACROZE, Benjamin",
      "SOLA, Santiago",
      "URANGA, Felipe",
    ],
  },
  {
    categoriaId: "m19-c",
    titulares: [
      "VELARDE PENNELLA, Tomas",
      "BARBEITO, Pedro",
      "BAEZA, Francisco",
      "COLL, Romulo",
      "SANTAMARINA, Miguel",
      "CASTELLI, Bautista",
      "LEONARD, Lucas",
      "RODRIGUEZ RIBAS, Simon",
      "MCCORMICK, Colin Francis",
      "FELLNER OTOOLE, Benjamin",
      "DOMINGUEZ ROVIRALTA, Tobias",
      "OTERO MONSEGUR, Ramon",
      "HOUSSAY, Tomas",
      "HOFFMANN, Amancio",
      "LOPEZ OLACIREGUI, Cruz",
    ],
    suplentes: ["VIGANO, Martin", "ALONSO, Tadeo"],
  },
  {
    categoriaId: "m19-d",
    titulares: [
      "ALEGRE, Dalmiro",
      "VIALE, Ramon",
      "GONZALEZ CALDERON, Isidro",
      "SARAVIA, Silvestre",
      "ORDOÑEZ, Bautista",
      "RICHELET, Lucas",
      "BALLESTER, Justo",
      "AUGIER, Tomas",
      "HERRERA, Marcial",
      "LACASE, Manuel",
      "TERRADO, Indalecio",
      "VALLS, Gregorio",
      "URANGA, Jeronimo",
      "CORNEJO, Rufino Cruz",
      "MONTOVIO, Manuel",
    ],
    suplentes: [
      "VIGANO, Martin",
      "ALONSO, Tadeo",
      "GIMENEZ ZAPIOLA, Santos",
      "SLUZEWSKI MONTI, Ramon",
      "BUCHANAN, Felipe Boyd",
      "ROSNER, Rufino",
      "BONINA, Bautista",
    ],
  },
  {
    categoriaId: "m19-e",
    titulares: [
      "CASARES, Juan Pablo",
      "MORESCO, Salvador",
      "VILA ECHAGUE, Ramon",
      "SANTAMARINA BERGADA, Eduardo",
      "GOWLAND, Pedro",
      "VELA, Marcial",
      "BULLRICH, Silvestre",
      "MENDILAHARZU, Jose",
      "LIMPENNY, Nicolas",
      "LEDESMA, Ramon Jorge",
      "PRENESTE, Americo",
      "LOPEZ SAUBIDET, Felipe",
      "ITHURALDE, Felix",
      "NIELSEN, Pedro Antonio",
      "MARINO, Sebastian",
    ],
    suplentes: [
      "BARBEITO ORTELLI, Federico",
      "ARENAZA, Justo",
      "LOUREIRO, Benjamin",
      "ERRAMUSPE, Bautista",
      "SEGURA, Indalecio",
      "COLL URIBURU, Bautista",
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
