// Carga las formaciones del amistoso interno Pre G vs Pre H (Fecha 23, jueves 2026-09-24) como
// BORRADOR (formacionPublicada: false). Pasadas por el club por texto; suplentes sin dorsal
// explicito -> 16, 17, ... en orden.
// Correr con: npx tsx src/scripts/migrate-pre-g-h-fecha23-formaciones.ts   (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const EQUIPOS: { categoriaId: string; titulares: string[]; suplentes: string[] }[] = [
  {
    categoriaId: "pre-g",
    titulares: [
      "Mc Cormick Santiago",
      "Amaral Quinto",
      "González Del Solar, Santiago",
      "Bosch Gonzalo",
      "Peña Camilo",
      "Heidkamp Felipe",
      "Pahissa, Jaime",
      "Vallebella, Joaquín",
      "Adrogué Cesar",
      "Guerrico Juan",
      "Gomez Alzaga Lucio",
      "Prat Gay Iñaki",
      "Pettinaroli Martin",
      "Roca Santiago",
      "Cirio Rufino",
    ],
    suplentes: [
      "Erize Bautista",
      "Leupold, Santiago",
      "Badessich, Manuel",
      "Bonomi Matías",
      "Blanco, Santiago",
      "Muxi Tomás",
      "Ithurralde Joaquín",
    ],
  },
  {
    categoriaId: "pre-h",
    titulares: [
      "Adrogue Marcos",
      "Paterson Jerónimo",
      "Malaspina Emiliano",
      "Mendilaharzu, Santos",
      "Quigley Thomas",
      "Marguery, Mateo",
      "Bonamico Benjamin",
      "Wilson Felipe",
      "Ibañez Alfonso",
      "Pujato, Gonzalo",
      "Carey Máximo",
      "Nolasco Francisco",
      "Chopourian, Manuel",
      "Montovio Marcos",
      "Thompson Santiago",
    ],
    suplentes: [
      "Pezet Facundo",
      "Vela Vicente",
      "Sackmann Miguel",
      "Saenz Valiente, Iñaki",
      "Busquet, Santiago",
      "Lozada, Juan Pablo",
      "Norman Archibald",
    ],
  },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  const batch = adminDb.batch();

  for (const eq of EQUIPOS) {
    if (eq.titulares.length !== 15) throw new Error(`${eq.categoriaId}: ${eq.titulares.length} titulares`);
    const pid = partidoId(eq.categoriaId, 23);
    const partidoRef = adminDb.collection("partidos").doc(pid);
    const snap = await partidoRef.get();
    if (!snap.exists) throw new Error(`${pid} no existe`);
    const estado = (snap.data() as { estado?: string }).estado;
    if (estado !== "programado") throw new Error(`${pid}: estado "${estado}" (solo "programado")`);

    const jugadores: JugadorPartido[] = [
      ...eq.titulares.map((nombre, i) => ({ nombre, dorsal: String(i + 1), titular: true, enCancha: true })),
      ...eq.suplentes.map((nombre, i) => ({ nombre, dorsal: String(16 + i), titular: false, enCancha: false })),
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
    console.log(`${pid}: ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl, borra ${aBorrar.length} viejos`);
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
  if (dryRun) return;
  await batch.commit();
  console.log("Listo. Cargadas como BORRADOR.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
