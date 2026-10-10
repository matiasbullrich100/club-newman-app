// Carga y PUBLICA las formaciones de la Fecha 9 de M17 (A vs Los Molinos A 14:00, B vs Los Molinos B 12:30,
// ambos en Los Molinos; C vs Regatas BV C 11:00, en Regatas -- domingo 2026-10-11), transcriptas de la
// imagen del club (hoja "M17 Equipos 2026"). Nombres con la ortografia del listado oficial de M17 del club
// (ej. "Racciati", "Carey Paez, Marcos", "Lopez Aufranc, Lucas"). Suplentes con el dorsal de la planilla
// (los casilleros amarillos/vacios se saltean). Tambien carga el horario. Idempotente; solo "programado".
// Correr con: npx tsx src/scripts/migrate-m17-fecha9-formaciones.ts   (DRY_RUN=1 para solo mirar)

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
const HORAS: Record<string, string> = { "m17-a": "14:00", "m17-b": "12:30", "m17-c": "11:00" };

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[];
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "m17-a",
    titulares: ["RACCIATI, Ignacio","MONTOREANO, Beltran","SAENZ VALIENTE, Tomas","BENEGAS, Felix","MEDINGER, Marcos","DEANE, Javier","DOMINGUEZ OLIVERA, Jose","VALVERDE, Francisco","BUSTO CAVANAGH, Fermin","GOMEZ DE ALZAGA, Camilo","ARNAUDO, Pablo","JACA OTAÑO, Beltran","FUENTES ROCHA, Timoteo","LORO MARCHESE, Tomas","GARAT, Simon"],
    suplentes: [["16","PERKINS, Jeronimo"],["17","LANFRANCO, Miguel"]],
  },
  {
    categoriaId: "m17-b",
    titulares: ["CAREY PAEZ, Marcos","VALLEJOS, Silvestre","LOPEZ AUFRANC, Lucas","LISSARRAGUE, Pedro","ESCALANTE, Manuel","BOSCH, Justo","FALCON, Mateo","HUBER, Ramon","LEUPOLD, Francisco","MARINO AGUIRRE, Agustin","ZAVALA, Jean","POMMER, Simon","ZAVALA, Sawens","URANGA, Bautista","GALICE NAON, Felix"],
    suplentes: [["16","BIBILONI, Rufino"],["17","DE UNDURRAGA, Joaquin"],["18","GOTI, Vicente"]],
  },
  {
    categoriaId: "m17-c",
    titulares: ["MERELLO, Ignacio","MONSEGUR, Geronimo","RUIZ, Gustavo","WEINERT, Antonio","BAUSILI, Francisco","VEDOYA, Augusto","DIAZ HERRERA, Pedro","DE ACHAVAL, Mateo","CIRIO, Simon","DE LA TOUR, Alejandro","CASTELLI, Joaquin","MOYANO, Nicolas","EIJO, Juan Alejandro","POLIZZA, Juan Diego","GARCIA, Gael"],
    suplentes: [["16","LASHERAS, Juan Ignacio"],["17","PRENESTE, Beltran"],["18","SERRA GALLO, Gonzalo"],["19","DEL CARRIL, Rufino"],["20","DOMINGUEZ, Benjamin"]],
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
    const estado = (snap.data() as { estado?: string }).estado;
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
      formacionPublicada: true,
      hora: HORAS[eq.categoriaId],
      enCanchaIds: titularesIds,
      formacionActualizadaEn: new Date(),
      updatedAt: new Date(),
    });
  }

  if (dryRun) return console.log("(DRY RUN) nada escrito.");
  await batch.commit();
  console.log("Listo. Formaciones cargadas y PUBLICADAS.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
