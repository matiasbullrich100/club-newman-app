// Formaciones de la Fecha 8 de M19 (A/B/C/D/E), domingo 2026-10-04, como BORRADOR
// (formacionPublicada: false). Transcriptas de "Equipos M19 20261004.xlsx" (hoja ResumenEquipos):
// 15 titulares por equipo + suplentes con el dorsal de la planilla (16+). Se ignoran las listas de
// "Lesionados" / "No disponibles" / "Suplentes frescos", y la columna F de la planilla (vacia, solo
// 3 nombres sueltos; Newman no tiene M19 F).
//
// Nombres: la planilla viene "APELLIDO, Nombre". Se usa el nombre ya guardado en la base para ese
// jugador (jugadores/ o plantel de cualquier fecha) si el id coincide (ignora may/min y acentos);
// si es nuevo, se deja el apellido en Title Case y se lista al correr.
// Un jugador puede estar en 2 equipos (titular en uno, suplente en otro): son partidos distintos.
// Correr con: npx tsx src/scripts/migrate-m19-fecha8-formaciones.ts   (DRY_RUN=1 para solo mirar)
// Idempotente; solo actua sobre partidos "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 8;

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// "WALKER, Cruz" -> "Walker, Cruz"
function canonico(raw: string): string {
  const [ape, ...resto] = raw.split(",");
  return resto.length ? `${titleCase(ape.trim())}, ${resto.join(",").trim()}` : titleCase(raw.trim());
}

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[];
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "m19-a",
    titulares: [
      "WALKER, Cruz",
      "SOLA, Geronimo",
      "VON GROLMAN, Juan Pablo",
      "ANCHORENA, Zenon",
      "GALICE NAON, Rodrigo",
      "DOMINGUEZ OLIVERA, Ramon",
      "CARDONI, Beltran",
      "LASCOMBES, Facundo",
      "BOSCH, Lucas",
      "LAGOS MARMOL, Maximo",
      "BARISIC, Ivan",
      "ABERG COBO, Juan Jose",
      "LANUSSE, Faustino",
      "RIVAS, Jeronimo",
      "LANUSSE, Silvestre",
    ],
    suplentes: [
      ["16", "BOURDIEU, Carlos Maria"],
      ["17", "LYNCH, Bautista Santiago"],
      ["18", "DIAZ DE VIVAR, Joaquin"],
      ["19", "GOTI, Enzo"],
      ["20", "IBARBIA, Benito"],
      ["21", "ITURBE, Jeronimo"],
      ["22", "ULLOA, Ramon"],
      ["23", "ALTGELT, James"],
    ],
  },
  {
    categoriaId: "m19-b",
    titulares: [
      "BLAQUIER, Simon",
      "LYNCH, Bautista Santiago",
      "DIAZ DE VIVAR, Joaquin",
      "CZAR, Felix",
      "COLL, Romulo",
      "BOSCH, Emilio",
      "IBARBIA, Benito",
      "GALARRAGA, Francisco",
      "ITURBE, Jeronimo",
      "ULLOA, Ramon",
      "CORNEJO, Rufino Cruz",
      "ALTGELT, James",
      "URANGA, Felipe",
      "ACHAVAL RODRIGUEZ, Felix",
      "GOLLETTI, Sebastian",
    ],
    suplentes: [
      ["16", "VELARDE PENNELLA, Tomas"],
      ["17", "PARRONDO, Simon"],
      ["18", "MIHANOVICH, Ricardo"],
      ["19", "FEENEY, Vicente"],
      ["20", "CASTRO LACROZE, Benjamin"],
      ["21", "SOLA, Santiago"],
      ["22", "LLERENA, Froilan"],
      ["23", "LOPEZ OLACIREGUI, Cruz"],
    ],
  },
  {
    categoriaId: "m19-c",
    titulares: [
      "THAYS, Agustin",
      "PARRONDO, Simon",
      "BAEZA, Francisco",
      "CACERES, Marcos",
      "AUCHTER, Maximiliano",
      "LEONARD, Lucas",
      "RODRIGUEZ RIBAS, Simon",
      "SANTAMARINA, Miguel",
      "LUCERO TORRES, Marcos",
      "LACASE, Manuel",
      "ELIAS, Cristobal",
      "BOSCH, Simon",
      "URANGA, Jeronimo",
      "ALONSO, Tadeo",
      "BELAUSTEGUI, Vicente",
    ],
    suplentes: [
      ["16", "MIHANOVICH, Ricardo"],
      ["17", "BARBEITO, Pedro"],
      ["18", "GONZALEZ CALDERON, Isidro"],
      ["19", "HERNANDEZ SERRANO, Benjamin"],
      ["20", "FEENEY, Vicente"],
      ["21", "MCCORMICK, Colin Francis"],
      ["22", "FELLNER OTOOLE, Benjamin"],
      ["23", "LLERENA, Froilan"],
    ],
  },
  {
    categoriaId: "m19-d",
    titulares: [
      "BUCHANAN, Felipe Boyd",
      "VIALE, Ramon",
      "ALEGRE, Dalmiro",
      "MENDILAHARZU, Jose",
      "BOSCH, Pedro",
      "AUGIER, Tomas",
      "BULLRICH, Silvestre",
      "BALLESTER, Justo",
      "REYNA, Santos",
      "VIGANO, Martin",
      "ITHURALDE, Felix",
      "HOUSSAY, Tomas",
      "ERRAMUSPE, Bautista",
      "HOFFMANN, Amancio",
      "TERRADO, Indalecio",
    ],
    suplentes: [
      ["16", "BARBEITO, Pedro"],
      ["17", "GONZALEZ CALDERON, Isidro"],
      ["18", "HERNANDEZ SERRANO, Benjamin"],
      ["19", "ORDOÑEZ, Bautista"],
      ["20", "MCCORMICK, Colin Francis"],
      ["21", "VALLS, Gregorio"],
      ["22", "LACASE, Manuel"],
      ["23", "MARINO, Sebastian"],
    ],
  },
  {
    categoriaId: "m19-e",
    titulares: [
      "BROWNE, Ignacio",
      "MORESCO, Salvador",
      "VILA ECHAGUE, Ramon",
      "ONETO GAONA, Simon",
      "MACHADO MALBRAN, Santiago",
      "LOPEZ SAUBIDET, Felipe",
      "CASARES, Juan Pablo",
      "SANTAMARINA BERGADA, Eduardo",
      "LIMPENNY, Nicolas",
      "LEDESMA, Ramon Jorge",
      "PRENESTE, Americo",
      "SUNDBLAD, Simon",
      "NIELSEN, Pedro Antonio",
      "MONTOVIO, Manuel",
      "GIMENEZ ZAPIOLA, Santos",
    ],
    suplentes: [
      ["16", "CASTELLI, Bautista"],
      ["17", "KAPLUN, Francisco"],
      ["18", "VELA, Marcial"],
      ["19", "SARAVIA, Silvestre"],
      ["20", "SALESE, Silvestre Jose"],
      ["21", "COLL URIBURU, Bautista"],
      ["22", "BERTON MORENO, Gonzalo"],
      ["23", "BOSCH, Justo"],
    ],
  },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");

  // Nombres ya guardados: id -> nombre exacto (jugadores/ primero, despues plantel de cualquier fecha).
  const previos = new Map<string, string>();
  (await adminDb.collection("jugadores").get()).docs.forEach((d) => {
    const n = (d.data() as { nombre?: string }).nombre;
    if (n) previos.set(d.id, n);
  });
  for (const p of (await adminDb.collection("partidos").get()).docs) {
    (await p.ref.collection("plantel").get()).docs.forEach((d) => {
      const n = (d.data() as { nombre?: string }).nombre;
      if (n && !previos.has(d.id)) previos.set(d.id, n);
    });
  }

  const nombreFinal = (raw: string): { nombre: string; nuevo: boolean } => {
    const c = canonico(raw);
    const previo = previos.get(playerId(c));
    return previo ? { nombre: previo, nuevo: false } : { nombre: c, nuevo: true };
  };

  if (dryRun) console.log("== DRY RUN: no se escribe nada ==\n");
  const batch = adminDb.batch();
  const nuevos: string[] = [];
  const cambiados: string[] = [];

  for (const equipo of EQUIPOS) {
    const pid = partidoId(equipo.categoriaId, NUMERO_FECHA);
    const partidoRef = adminDb.collection("partidos").doc(pid);
    const snap = await partidoRef.get();
    if (!snap.exists) {
      console.warn(`SALTEADO ${pid}: no existe.`);
      continue;
    }
    const estado = (snap.data() as { estado?: string }).estado;
    if (estado !== "programado") {
      console.warn(`SALTEADO ${pid}: estado="${estado}".`);
      continue;
    }

    const jugadores: JugadorPartido[] = [];
    equipo.titulares.forEach((raw, i) => {
      const { nombre, nuevo } = nombreFinal(raw);
      if (nuevo) nuevos.push(`${pid} #${i + 1}: ${nombre}`);
      else if (nombre !== canonico(raw)) cambiados.push(`${pid} #${i + 1}: "${raw}" -> usa guardado "${nombre}"`);
      jugadores.push({ nombre, dorsal: String(i + 1), titular: true, enCancha: true });
    });
    equipo.suplentes.forEach(([dorsal, raw]) => {
      const { nombre, nuevo } = nombreFinal(raw);
      if (nuevo) nuevos.push(`${pid} #${dorsal}: ${nombre}`);
      else if (nombre !== canonico(raw)) cambiados.push(`${pid} #${dorsal}: "${raw}" -> usa guardado "${nombre}"`);
      jugadores.push({ nombre, dorsal, titular: false, enCancha: false });
    });

    if (equipo.titulares.length !== 15) throw new Error(`${pid}: ${equipo.titulares.length} titulares`);
    const ids = new Map<string, string>();
    for (const j of jugadores) {
      const id = playerId(j.nombre);
      if (ids.has(id)) throw new Error(`${pid}: "${j.nombre}" y "${ids.get(id)}" -> mismo id "${id}".`);
      ids.set(id, j.nombre);
    }
    const plantelSnap = await partidoRef.collection("plantel").get();
    const aBorrar = plantelSnap.docs.filter((d) => !ids.has(d.id));
    const titularesIds = jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre));

    console.log(
      `${pid}: ${jugadores.length} jug (${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl)` +
        (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );

    if (dryRun) continue;
    for (const d of aBorrar) batch.delete(d.ref);
    for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
    batch.update(partidoRef, { formacionPublicada: false, enCanchaIds: titularesIds, formacionActualizadaEn: new Date(), updatedAt: new Date() });
  }

  if (cambiados.length) console.log("\nNombre distinto al de la planilla (se usa el ya guardado):\n  " + cambiados.join("\n  "));
  console.log(nuevos.length ? "\nJugadores NUEVOS (revisar nombre):\n  " + nuevos.join("\n  ") : "\nSin jugadores nuevos.");
  if (dryRun) return console.log("\n(DRY RUN) nada escrito.");
  await batch.commit();
  console.log("\nListo. Formaciones como BORRADOR (sin publicar).");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
