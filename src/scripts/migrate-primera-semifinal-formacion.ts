// Primera vs Alumni -- SEMIFINAL de playoff, viernes 2026-10-30 20:10 en CASI (partido Fecha 27, fase "semifinal").
// Formacion de la placa del club: 15 titulares (capitan: Alejandro Urtubey) + las "Reservas" 16-23 como suplentes
// (pedido explicito del club para este partido; normalmente Primera va solo con titulares). Se carga la hora (20:10)
// y se PUBLICA. Idempotente; solo "programado".
// Correr con: npx tsx src/scripts/migrate-primera-semifinal-formacion.ts   (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const PARTIDO = "primera-f27";
const HORA = "20:10";
const TITULARES: { nombre: string; capitan?: boolean }[] = [
  { nombre: "Prince Miguel" },
  { nombre: "Salese, Beltran" },
  { nombre: "Bosch Bautista" },
  { nombre: "Cardinal Paul" },
  { nombre: "Urtubey Alejandro", capitan: true },
  { nombre: "Santarelli, Faustino" },
  { nombre: "De la Vega, Joaquín" },
  { nombre: "Diaz de Vivar Rodrigo" },
  { nombre: "Marguery Lucas" },
  { nombre: "Gutierrez Taboada Gonzalo" },
  { nombre: "Ortiz Basualdo, Justo" },
  { nombre: "Lanfranco Benjamin" },
  { nombre: "Prince Simón" },
  { nombre: "Marolda, Santiago" },
  { nombre: "Daireaux, Juan Bautista" },
];

const SUPLENTES: [string, string][] = [
  ["16", "Perkins Fermín"],
  ["17", "Bosch, Isidro"],
  ["18", "Lozano Manuel"],
  ["19", "Lascombes, Francisco"],
  ["20", "Ureta Jerónimo"],
  ["21", "Nava, Lucas"],
  ["22", "Llerena Florencio"],
  ["23", "Ulloa Jeronimo"],
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  const ref = adminDb.collection("partidos").doc(PARTIDO);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`${PARTIDO} no existe`);
  const d = snap.data() as { estado?: string; fase?: string; fecha?: string; rival?: string };
  if (d.fase !== "semifinal" || d.fecha !== "2026-10-30") throw new Error(`${PARTIDO}: no es la semifinal del 30/10`);
  if (d.estado !== "programado") throw new Error(`${PARTIDO}: estado "${d.estado}"`);

  const jugadores: JugadorPartido[] = TITULARES.map((t, i) => ({
    nombre: t.nombre,
    dorsal: String(i + 1),
    titular: true,
    enCancha: true,
    ...(t.capitan ? { capitan: true } : {}),
  })).concat(SUPLENTES.map(([dorsal, nombre]) => ({ nombre, dorsal, titular: false, enCancha: false })));
  const ids = new Set<string>();
  for (const j of jugadores) {
    const id = playerId(j.nombre);
    if (ids.has(id)) throw new Error(`"${j.nombre}" repetido (${id})`);
    ids.add(id);
  }
  const plantelSnap = await ref.collection("plantel").get();
  const aBorrar = plantelSnap.docs.filter((x) => !ids.has(x.id));
  console.log(`${PARTIDO} vs ${d.rival} ${HORA}: ${jugadores.filter((j) => j.titular).length} titulares + ${jugadores.filter((j) => !j.titular).length} suplentes` + (aBorrar.length ? `, borra ${aBorrar.length} viejos` : ""));
  if (dryRun) return console.log("(DRY RUN) nada escrito.");

  const batch = adminDb.batch();
  for (const x of aBorrar) batch.delete(x.ref);
  for (const j of jugadores) batch.set(ref.collection("plantel").doc(playerId(j.nombre)), j);
  batch.update(ref, {
    hora: HORA,
    formacionPublicada: true,
    enCanchaIds: jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre)),
    formacionActualizadaEn: new Date(),
    updatedAt: new Date(),
  });
  await batch.commit();
  console.log("Listo. Formacion cargada y PUBLICADA.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
