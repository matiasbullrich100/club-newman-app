// Fecha 3 de M17 A y B (Newman vs Los Matreros, local en Newman) -- estaba cargada como "Fecha libre"
// del 2026-08-23 y se juega hoy miercoles 2026-10-14 (B 20:00, A 21:00). Convierte el partido de "Libre"
// a "vs Los Matreros X" y carga las formaciones de la imagen del club como BORRADOR (no publica).
// Idempotente; solo toca partidos "programado". Correr con: npx tsx src/scripts/cargar-m17-a-b-fecha3-matreros.ts
// (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";
import { FieldValue } from "firebase-admin/firestore";
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

const NUMERO_FECHA = 3;
const FECHA = "2026-10-14";

interface EquipoFormacion {
  categoriaId: string;
  rival: string;
  hora: string;
  titulares: string[];
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "m17-a",
    rival: "Los Matreros A",
    hora: "21:00",
    titulares: ["SAENZ VALIENTE, Tomas","MONTOREANO, Beltran","LANFRANCO, Miguel","PERKINS, Jeronimo","MEDINGER, Marcos","BENEGAS, Felix","DOMINGUEZ OLIVERA, Jose","VALVERDE, Francisco","BUSTO CAVANAGH, Fermin","GOMEZ DE ALZAGA, Camilo","ARNAUDO, Pablo","JACA OTAÑO, Beltran","FUENTES ROCHA, Timoteo","LORO MARCHESE, Tomas","GALICE NAON, Felix"],
    suplentes: [["16","DEANE, Javier"],["17","RACCIATI, Ignacio"],["18","GARAT, Simon"],["19","BIBILONI, Rufino"]],
  },
  {
    categoriaId: "m17-b",
    rival: "Los Matreros B",
    hora: "20:00",
    titulares: ["CAREY PAEZ, Marcos","VALLEJOS, Silvestre","LOPEZ AUFRANC, Lucas","LISSARRAGUE, Pedro","ESCALANTE, Manuel","BOSCH, Justo","GOTI, Vicente","FALCON, Mateo","LEUPOLD, Francisco","MARINO AGUIRRE, Agustin","ZAVALA, Jean","POMMER, Simon","ZAVALA, Sawens","POLIZZA, Juan Diego","URANGA, Bautista"],
    suplentes: [["16","LYNCH, Gonzalo"],["17","DE UNDURRAGA, Joaquin"],["18","HUBER, Ramon"],["19","SANTAMARINA, Juan"],["20","BAUSILI, Francisco"],["21","CIRIO, Simon"],["22","GARCIA, Gael"],["23","PEREZ SARTORI, Tomas"]],
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
    console.log(`${pid}: vs ${eq.rival} ${FECHA} ${eq.hora} -- ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl` + (aBorrar.length ? `, borra ${aBorrar.length} viejos` : ""));
    if (dryRun) continue;

    for (const d of aBorrar) batch.delete(d.ref);
    for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
    batch.update(partidoRef, {
      fecha: FECHA,
      hora: eq.hora,
      rival: eq.rival,
      esLocal: true,
      cancha: "Newman",
      notaEspecial: FieldValue.delete(),
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
