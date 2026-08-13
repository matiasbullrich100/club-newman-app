// Reconstruye desde cero la coleccion global `jugadores/` -- hasta ahora mezclaba sin etiquetar
// jugadores de prueba (partidos demo), Plantel Superior y Juveniles. Corre una sola vez para
// sanear los datos existentes; de ahi en mas, publicarIncidente/corregirTipoIncidente/
// terminarPartido (src/lib/match/actions.ts) ya etiquetan grupo/edadId al escribir.
// Correr con: npm run rebuild-jugadores
//
// 1. Borra todos los docs actuales de jugadores/.
// 2. Repuebla Plantel Superior desde formaciones_historicas.json + tarjetas_historicas.json
//    (mismo origen que migrate-historical.ts) -- plantel completo de las 17 fechas ya jugadas.
// 3. Repuebla Juveniles recorriendo los partidos "terminado" que ya existen en Firestore, sumando
//    desde sus subcolecciones plantel (minutos, ya calculados por terminarPartido) e incidentes
//    (tarjetas) -- generico, sirve para cualquier partido de Juveniles que termine en el futuro,
//    no solo para los que ya estan jugados hoy.

import { config } from "dotenv";
import { resolve, join } from "path";
import { readFileSync } from "fs";
import { CATEGORIAS } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { Incidente, JugadorAgregado, JugadorPartido, Partido } from "../types/firestore";

interface FormacionJugador {
  dorsal: string;
  name: string;
}

interface TarjetaAgregada {
  amarillas: number;
  rojas: number;
  nombre: string;
}

const CAMPO_TARJETA: Partial<Record<string, keyof JugadorAgregado>> = {
  tarjeta_amarilla: "tarjetasAmarillas",
  tarjeta_doble_amarilla: "tarjetasDobleAmarilla",
  tarjeta_roja: "tarjetasRojas",
  tarjeta_roja_20: "tarjetasRojas20",
  tarjeta_azul: "tarjetasAzules",
};

function loadJson<T>(dir: string, file: string): T {
  return JSON.parse(readFileSync(join(dir, file), "utf8")) as T;
}

function jugadorVacio(nombre: string, grupo: JugadorAgregado["grupo"], edadId?: string): JugadorAgregado {
  return {
    nombre,
    grupo,
    ...(edadId ? { edadId } : {}),
    tarjetasAmarillas: 0,
    tarjetasDobleAmarilla: 0,
    tarjetasRojas: 0,
    tarjetasRojas20: 0,
    tarjetasAzules: 0,
    minutosJugadosTotal: 0,
  };
}

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");

  async function commitEnLotes(
    ops: { ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData; merge?: boolean }[]
  ) {
    for (let i = 0; i < ops.length; i += 450) {
      const batch = adminDb.batch();
      for (const op of ops.slice(i, i + 450)) {
        batch.set(op.ref, op.data, op.merge ? { merge: true } : {});
      }
      await batch.commit();
    }
  }

  // La carpeta "handoff" ya no existe -- los mismos JSON quedaron sueltos directo en Downloads.
  const sourceDir = process.argv[2] ?? "C:\\Users\\Matias\\Downloads";

  console.log("Borrando jugadores/ actual...");
  const actualSnap = await adminDb.collection("jugadores").get();
  for (let i = 0; i < actualSnap.docs.length; i += 450) {
    const batch = adminDb.batch();
    for (const doc of actualSnap.docs.slice(i, i + 450)) batch.delete(doc.ref);
    await batch.commit();
  }
  console.log(`  Borrados: ${actualSnap.size}`);

  console.log("Repoblando Plantel Superior desde el historico...");
  const formaciones = loadJson<
    Record<string, Record<string, { titulares: FormacionJugador[]; suplentes: FormacionJugador[] }>>
  >(sourceDir, "formaciones_historicas.json");
  const tarjetasHist = loadJson<Record<string, TarjetaAgregada>>(sourceDir, "tarjetas_historicas.json");

  const superior = new Map<string, JugadorAgregado>();
  for (const porCategoria of Object.values(formaciones)) {
    for (const { titulares, suplentes } of Object.values(porCategoria)) {
      for (const j of [...titulares, ...suplentes]) {
        const id = playerId(j.name);
        if (!superior.has(id)) superior.set(id, jugadorVacio(j.name, "superior"));
      }
    }
  }
  for (const entry of Object.values(tarjetasHist)) {
    const id = playerId(entry.nombre);
    const jugador = superior.get(id) ?? jugadorVacio(entry.nombre, "superior");
    jugador.tarjetasAmarillas = entry.amarillas;
    jugador.tarjetasRojas = entry.rojas;
    superior.set(id, jugador);
  }

  await commitEnLotes(
    [...superior.entries()].map(([id, jugador]) => ({ ref: adminDb.collection("jugadores").doc(id), data: jugador }))
  );
  console.log(`  Plantel Superior: ${superior.size} jugadores`);

  console.log("Repoblando Juveniles desde partidos ya terminados...");
  const categoriasJuveniles = new Map<string, { edadId: string }>(
    CATEGORIAS.filter((c) => c.grupo === "juveniles").map((c) => [c.id, { edadId: c.edadId }])
  );
  const partidosSnap = await adminDb.collection("partidos").where("estado", "==", "terminado").get();
  const juveniles = new Map<string, JugadorAgregado>();
  let partidosJuvenilesVistos = 0;

  for (const partidoDoc of partidosSnap.docs) {
    const partido = partidoDoc.data() as Partido;
    const cat = categoriasJuveniles.get(partido.categoriaId);
    if (!cat) continue; // no es un partido de Juveniles
    partidosJuvenilesVistos++;

    const [plantelSnap, incidentesSnap] = await Promise.all([
      partidoDoc.ref.collection("plantel").get(),
      partidoDoc.ref.collection("incidentes").get(),
    ]);

    for (const jDoc of plantelSnap.docs) {
      const data = jDoc.data() as JugadorPartido;
      const jugador = juveniles.get(jDoc.id) ?? jugadorVacio(data.nombre, "juveniles", cat.edadId);
      jugador.minutosJugadosTotal += (data.minutosJugados1T ?? 0) + (data.minutosJugados2T ?? 0);
      juveniles.set(jDoc.id, jugador);
    }

    for (const iDoc of incidentesSnap.docs) {
      const inc = iDoc.data() as Incidente;
      const campo = CAMPO_TARJETA[inc.tipo];
      if (!campo || inc.equipo !== "newman" || !inc.jugadorId) continue;
      const jugador = juveniles.get(inc.jugadorId);
      if (!jugador) continue; // toda tarjeta debería ser de alguien ya visto en el plantel
      (jugador[campo] as number) += 1;
    }
  }

  await commitEnLotes(
    [...juveniles.entries()].map(([id, jugador]) => ({ ref: adminDb.collection("jugadores").doc(id), data: jugador }))
  );
  console.log(`  Juveniles: ${juveniles.size} jugadores (de ${partidosJuvenilesVistos} partidos terminados)`);

  console.log("Listo.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
