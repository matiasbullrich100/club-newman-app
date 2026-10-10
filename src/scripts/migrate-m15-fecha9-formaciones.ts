// Carga las formaciones de la Fecha 9 de M15 (A/B/C vs Champa A/B/C, domingo 2026-10-11, en Champa) como
// BORRADOR (formacionPublicada: false, salvo que el partido ya la tuviera publicada), transcriptas de las fichas del club (imagenes "M15 A/B/C"). M15 D
// no vino, no se toca. Nombres "APELLIDO, Nombre" -> titleCase() como en las otras cargas de juveniles;
// M15 C #9: la ficha corta "VINENT FERNANDEZ SPERONI, BEN..." -> "Benjamin" (como en las fechas 6 y 7).
// Suplentes con el dorsal de la ficha (M15 A y B no traen). Tambien carga el horario de la ficha.
// Correr con: npx tsx src/scripts/migrate-m15-fecha9-formaciones.ts   (DRY_RUN=1 para solo mirar)
// Idempotente; solo actua sobre partidos "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

function titleCase(nombre: string): string {
  return nombre
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const NUMERO_FECHA = 9;
const HORAS: Record<string, string> = { "m15-a": "11:00", "m15-b": "09:30", "m15-c": "09:30" };

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[];
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "m15-a",
    titulares: ["LLAMBI BOVINO, FELIPE","SOLA, BENICIO","ARAUJO, SANTOS","AMARAL TRIGO, MILO","BENVENUTI, VITO","LOPEZ SAUBIDET, JUAN CRUZ","LUNA ALURRALDE, IGNACIO","MIGUENS, FAUSTINO","PECHAR, JOSE","VALVERDE, MANUEL","LLAVALLOL, MARCOS","GARCÍA IGARZA, JOAQUÍN","REYNAL, ABBOTT JUAN","TISCORNIA, FÉLIX","LOPEZ AUFRANC, HILARIO"],
    suplentes: [],
  },
  {
    categoriaId: "m15-b",
    titulares: ["ZEMBORAIN, ANTONIO","BARROS OCAMPO, BARTOLOME","AYERZA, IVÁN FEDERICO","PEREZ SARTORI, RAMIRO","ARNAUDO LOSADA, IGNACIO JAVIER","FIORITO, JAIME","CZAR, CRISTÓBAL","DIAZ MATHE, CRUZ","ALEGRE, BALDOMERO","BULLRICH, JOSÉ","GARAT NÖLTING, JAIME","ARAMBURU, IÑAKI","RODRIGUEZ RIBAS, HILARIO","TRIGO DE LA BALZE, HONORIO","MENDIZABAL, FELIPE"],
    suplentes: [],
  },
  {
    categoriaId: "m15-c",
    titulares: ["ORDOÑEZ, PABLO","KAUFMANN, JUAN","MARINO, FACUNDO","SANTAMARINA BERGADÁ, JERÓNIMO","ESTRADA, JOSÉ MARÍA","SERANTES, MATEO","IGLESIAS ARRIETA, BELTRÁN","VILLAMIL, SIMÓN","VINENT FERNANDEZ SPERONI, BENJAMÍN","BARISIC, MILO","ANZORREGUY, RUFINO","DORMAL, SANTIAGO","VIGANÓ, SIMON","LEYBA, FERMÍN GABRIEL","BELL, KENETH"],
    suplentes: [["16","PALETTE PUEYRREDON, BAUTISTA"],["17","CHEVALLIER BOUTELL, GONZALO"],["18","POGGI, JOAQUÍN"],["19","WAISMAN, MATIAS"],["20","MORANDO, ALDO"],["21","RESTUCCI MICHELI, LUCIO"],["22","MATTA Y TREJO, ALFONSO"],["23","RICHARDS, PATRICIO JUAN"]],
  },
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
    const d = snap.data() as { estado?: string; formacionPublicada?: boolean };
    const estado = d.estado;
    if (estado !== "programado") {
      console.warn(`SALTEADO ${pid}: estado "${estado}"`);
      continue;
    }
    const jugadores: JugadorPartido[] = [
      ...eq.titulares.map((nombre, i) => ({ nombre: titleCase(nombre), dorsal: String(i + 1), titular: true, enCancha: true })),
      ...eq.suplentes.map(([dorsal, nombre]) => ({ nombre: titleCase(nombre), dorsal, titular: false, enCancha: false })),
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
      // Si ya estaba publicada (M15 C traia otra formacion publicada) se mantiene; si no, queda en borrador.
      formacionPublicada: d.formacionPublicada ?? false,
      hora: HORAS[eq.categoriaId],
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
