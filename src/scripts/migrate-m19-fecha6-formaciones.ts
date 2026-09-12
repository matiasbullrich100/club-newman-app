// Carga las formaciones de la Fecha 6 de M19 (A/B/C/D/E) vs Alumni/CASI, domingo 2026-09-13, como
// BORRADOR (formacionPublicada: false). Transcriptas de "Libro (1).xlsx". Correr con:
// npm run migrate-m19-fecha6-formaciones
// DRY_RUN=1 npm run migrate-m19-fecha6-formaciones   -> simula, no escribe.
//
// M19 F no juega esta fecha (no existe el partido m19-f-f6 y en el Excel no tiene columna) -> se
// ignora. Los nombres del Excel vienen "APELLIDO, Nombre" (apellido en mayúsculas): se pasan por
// titleCase() igual que en fechas anteriores, para quedar consistentes ("Bourdieu, Carlos Maria").
// El id de jugador ignora may/min y acentos, así que igual cruza bien con lo ya cargado.
// Idempotente: pisa el plantel y borra los jugadores que hayan quedado de una corrida anterior.
// Solo actúa sobre partidos en estado "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 6;

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
      "WALKER, Cruz",
      "GOTI, Enzo",
      "CHUTE, Benjamin",
      "DOMINGUEZ OLIVERA, Ramon",
      "CARDONI, Beltran",
      "LASCOMBES, Facundo",
      "BOSCH, Lucas",
      "LAGOS MARMOL, Maximo",
      "BARISIC, Ivan",
      "ABERG COBO, Juan Jose",
      "ALTGELT, James",
      "RIVAS, Jeronimo",
      "LANUSSE, Silvestre",
    ],
    suplentes: ["GALICE NAON, Rodrigo", "IBARBIA, Benito", "ULLOA, Ramon"],
  },
  {
    categoriaId: "m19-b",
    titulares: [
      "MIHANOVICH, Ricardo",
      "LYNCH, Bautista Santiago",
      "DIAZ DE VIVAR, Joaquin",
      "CZAR, Felix",
      "ANCHORENA, Zenon",
      "CASTRO LACROZE, Benjamin",
      "BOSCH, Emilio",
      "GALARRAGA, Francisco",
      "SOLA, Santiago",
      "LLERENA, Froilan",
      "URANGA, Felipe",
      "OTERO MONSEGUR, Ramon",
      "BOSCH, Simon",
      "ACHAVAL RODRIGUEZ, Felix",
      "GOLLETTI, Sebastian",
    ],
    suplentes: [
      "BLAQUIER, Simon",
      "PARRONDO, Simon",
      "VELARDE PENNELLA, Tomas",
      "GALICE NAON, Rodrigo",
      "IBARBIA, Benito",
      "LUCERO TORRES, Marcos",
      "ULLOA, Ramon",
      "LOPEZ OLACIREGUI, Cruz",
    ],
  },
  {
    categoriaId: "m19-c",
    titulares: [
      "THAYS, Agustin",
      "BARBEITO, Pedro",
      "BAEZA, Francisco",
      "COLL, Romulo",
      "AUCHTER, Maximiliano",
      "AUGIER, Tomas",
      "RODRIGUEZ RIBAS, Simon",
      "SANTAMARINA, Miguel",
      "MCCORMICK, Colin Francis",
      "FELLNER OTOOLE, Benjamin",
      "CORNEJO, Rufino Cruz",
      "URANGA, Jeronimo",
      "HOUSSAY, Tomas",
      "ALONSO, Tadeo",
      "DOMINGUEZ ROVIRALTA, Tobias",
    ],
    suplentes: ["BUCHANAN, Felipe Boyd", "FEENEY, Vicente"],
  },
  {
    categoriaId: "m19-d",
    titulares: [
      "ALEGRE, Dalmiro",
      "VIALE, Ramon",
      "GONZALEZ CALDERON, Isidro",
      "CACERES, Marcos",
      "ARENAZA, Justo",
      "BULLRICH, Silvestre",
      "CASTELLI, Bautista",
      "BALLESTER, Justo",
      "HERRERA, Marcial",
      "VIGANO, Martin",
      "PRENESTE, Americo",
      "MARINO, Sebastian",
      "COLL URIBURU, Bautista",
      "LOPEZ SAUBIDET, Felipe",
      "MONTOVIO, Manuel",
    ],
    suplentes: ["BUCHANAN, Felipe Boyd", "CASARES, Juan Pablo", "SARAVIA, Silvestre", "ROSNER, Rufino", "LEDESMA, Ramon Jorge"],
  },
  {
    categoriaId: "m19-e",
    titulares: [
      "VELA, Marcial",
      "MORESCO, Salvador",
      "SANTAMARINA BERGADA, Eduardo",
      "ORDOÑEZ, Bautista",
      "MENDILAHARZU, Jose",
      "RICHELET, Lucas",
      "BONINA, Bautista",
      "LASCOMBES, Santiago",
      "REYNA, Santos",
      "LACASE, Manuel",
      "ITHURALDE, Felix",
      "SEGURA, Indalecio",
      "ERRAMUSPE, Bautista",
      "NIELSEN, Pedro Antonio",
      "GIMENEZ ZAPIOLA, Santos",
    ],
    suplentes: [
      "BARBEITO ORTELLI, Federico",
      "HERNANDEZ SERRANO, Benjamin",
      "SLUZEWSKI MONTI, Ramon",
      "MACHADO MALBRAN, Santiago",
      "VILA ECHAGUE, Ramon",
      "LIMPENNY, Nicolas",
      "BOSCH, Justo",
      "GARAT NOLTING, Iñaki",
      "GOWLAND, Pedro",
      "LOUREIRO, Benjamin",
      "QUIRNO COSTA, Felipe",
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
