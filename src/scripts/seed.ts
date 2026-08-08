// Datos de prueba minimos para validar el motor en vivo de punta a punta.
// Correr con: npm run seed
// Idempotente: si ya existe el partido de prueba, no reescribe nada.

import { config } from "dotenv";
import { resolve } from "path";
import type { Cuenta, JugadorPartido, LiveState, Partido } from "../types/firestore";

const CATEGORIA_ID = "demo";
const PARTIDO_ID = "demo-partido-1";

async function main() {
  // dotenv.config() debe correr antes de importar firebase-admin.ts (que lee process.env
  // apenas se carga el módulo) — un `import` estático se hoistea antes de este código,
  // así que estos requieren `await import()` en vez de imports normales.
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { hashPassword } = await import("../lib/auth/passwords");
  const { playerId } = await import("../lib/players");

  const partidoRef = adminDb.collection("partidos").doc(PARTIDO_ID);
  const existente = await partidoRef.get();
  if (existente.exists) {
    console.log(`Ya existe ${PARTIDO_ID}, no se vuelve a sembrar. Borralo en Firestore si queres regenerarlo.`);
    return;
  }

  console.log("Sembrando categoria de prueba...");
  await adminDb.collection("categorias").doc(CATEGORIA_ID).set({
    nombre: "Categoria Test",
    orden: 0,
    isTest: true,
  });

  console.log("Sembrando cuentas (designado/entrenador/manager)...");
  const cuentas: Record<string, Omit<Cuenta, "createdAt">> = {
    demo: { rol: "designado", username: "demo", passwordHash: await hashPassword("dalebordo"), categoriaId: CATEGORIA_ID },
    coach: { rol: "entrenador", username: "coach", passwordHash: await hashPassword("pica") },
    manager: { rol: "manager", username: "manager", passwordHash: await hashPassword("fede") },
  };
  await Promise.all(
    Object.entries(cuentas).map(([id, cuenta]) =>
      adminDb
        .collection("cuentas")
        .doc(id)
        .set({ ...cuenta, createdAt: new Date() })
    )
  );

  console.log("Sembrando plantel de prueba (15 titulares + 8 suplentes)...");
  const titulares = Array.from({ length: 15 }, (_, i) => ({
    nombre: `Jugador ${String(i + 1).padStart(2, "0")}`,
    dorsal: String(i + 1),
    titular: true,
  }));
  const suplentes = Array.from({ length: 8 }, (_, i) => ({
    nombre: `Jugador ${String(i + 16).padStart(2, "0")}`,
    dorsal: String(i + 16),
    titular: false,
  }));
  const plantel = [...titulares, ...suplentes];

  const batch = adminDb.batch();

  const partido: Partido = {
    categoriaId: CATEGORIA_ID,
    numeroFecha: "demo",
    rival: "Beromama",
    esLocal: true,
    cancha: "Cancha 1",
    estado: "programado",
    resultado: { newman: 0, rival: 0 },
    enCanchaIds: titulares.map((j) => playerId(j.nombre)),
  };
  batch.set(partidoRef, { ...partido, createdAt: new Date(), updatedAt: new Date() });

  const liveState: LiveState = {
    periodo: null,
    clockRunning: false,
    clockAnchor: null,
    accumulatedSeconds: 0,
  };
  batch.set(partidoRef.collection("liveState").doc("state"), liveState);

  for (const jugador of plantel) {
    const id = playerId(jugador.nombre);
    const doc: JugadorPartido = {
      nombre: jugador.nombre,
      dorsal: jugador.dorsal,
      titular: jugador.titular,
      enCancha: jugador.titular,
    };
    batch.set(partidoRef.collection("plantel").doc(id), doc);
  }

  await batch.commit();

  console.log("Listo. Cuentas de prueba:");
  console.log("  Designado -> usuario: demo       contraseña: dalebordo");
  console.log("  Entrenador -> usuario: coach      contraseña: pica");
  console.log("  Manager    -> usuario: manager    contraseña: fede");
  console.log(`Partido de prueba: /partido/${PARTIDO_ID}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
