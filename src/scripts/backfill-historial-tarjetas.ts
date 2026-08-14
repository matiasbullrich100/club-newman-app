// Rellena fechasAmarillas/fechasDobleAmarilla/fechasRojas/fechasRojas20/fechasAzules en
// jugadores/{id} para las tarjetas cargadas ANTES de que match/actions.ts empezara a mantener ese
// historial de forma incremental (ver CAMPO_HISTORIAL_TARJETA en actions.ts). Corre una sola vez;
// de ahi en mas publicarIncidente/corregirTipoIncidente/eliminarIncidente ya escriben esos arrays
// al vuelo, asi que /estadisticas/[grupoId] no necesita volver a escanear Firestore.
//
// Hace el MISMO escaneo caro que hacia la vieja obtenerHistorialTarjetas (recorrer partidoId por
// partidoId via partidoIdsDeGrupo, filtrar "terminado", leer la subcoleccion incidentes de cada
// uno) pero UNA sola vez, para los 5 grupos (superior + las 4 edades de Juveniles) en una sola
// corrida -- no en cada visita a la pagina.
//
// Correr con: npm run backfill-historial-tarjetas

import { config } from "dotenv";
import { resolve } from "path";
import { partidoIdsDeGrupo } from "../lib/categorias";
import { EDADES } from "../lib/categorias";
import type { FilaHistorialTarjeta, Incidente, Partido, TipoIncidente } from "../types/firestore";

const TIPOS_TARJETA: TipoIncidente[] = [
  "tarjeta_amarilla",
  "tarjeta_doble_amarilla",
  "tarjeta_roja",
  "tarjeta_roja_20",
  "tarjeta_azul",
];

const CAMPO_HISTORIAL_TARJETA: Partial<Record<TipoIncidente, string>> = {
  tarjeta_amarilla: "fechasAmarillas",
  tarjeta_doble_amarilla: "fechasDobleAmarilla",
  tarjeta_roja: "fechasRojas",
  tarjeta_roja_20: "fechasRojas20",
  tarjeta_azul: "fechasAzules",
};

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");

  async function commitEnLotes(ops: { ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData }[]) {
    for (let i = 0; i < ops.length; i += 450) {
      const batch = adminDb.batch();
      for (const op of ops.slice(i, i + 450)) batch.set(op.ref, op.data, { merge: true });
      await batch.commit();
    }
  }

  const grupos = ["superior", ...EDADES.map((e) => e.id)];

  // jugadorId -> campo historial -> lista de filas
  const porJugador = new Map<string, Partial<Record<TipoIncidente, FilaHistorialTarjeta[]>>>();
  let partidosTerminadosVistos = 0;
  let tarjetasVistas = 0;

  for (const grupo of grupos) {
    console.log(`Escaneando grupo "${grupo}"...`);
    const idsPartidos = partidoIdsDeGrupo(grupo);
    const partidoSnaps = await adminDb.getAll(...idsPartidos.map((id) => adminDb.collection("partidos").doc(id)));
    const terminados = partidoSnaps.filter((s) => s.exists && (s.data() as Partido).estado === "terminado");
    console.log(`  ${terminados.length} partidos terminados de ${idsPartidos.length} posibles`);

    for (const snap of terminados) {
      const p = snap.data() as Partido;
      partidosTerminadosVistos++;
      const incSnap = await snap.ref.collection("incidentes").where("tipo", "in", TIPOS_TARJETA).get();

      for (const incDoc of incSnap.docs) {
        const inc = incDoc.data() as Incidente;
        if (inc.equipo !== "newman" || !inc.jugadorId) continue;
        const campo = CAMPO_HISTORIAL_TARJETA[inc.tipo];
        if (!campo) continue;

        tarjetasVistas++;
        const porTipo = porJugador.get(inc.jugadorId) ?? {};
        const lista = porTipo[inc.tipo] ?? [];
        lista.push({ numeroFecha: p.numeroFecha, rival: p.rival, incidenteId: incDoc.id });
        porTipo[inc.tipo] = lista;
        porJugador.set(inc.jugadorId, porTipo);
      }
    }
  }

  console.log(`\nPartidos terminados escaneados: ${partidosTerminadosVistos}`);
  console.log(`Tarjetas encontradas: ${tarjetasVistas}`);
  console.log(`Jugadores con al menos una tarjeta: ${porJugador.size}`);

  const ops: { ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData }[] = [];
  for (const [jugadorId, porTipo] of porJugador) {
    const data: FirebaseFirestore.DocumentData = {};
    for (const tipo of Object.keys(porTipo) as TipoIncidente[]) {
      const campo = CAMPO_HISTORIAL_TARJETA[tipo]!;
      // Orden cronologico, igual que hacia la vieja obtenerHistorialTarjetas.
      data[campo] = [...porTipo[tipo]!].sort((a, b) => Number(a.numeroFecha) - Number(b.numeroFecha));
    }
    ops.push({ ref: adminDb.collection("jugadores").doc(jugadorId), data });
  }

  console.log(`\nEscribiendo historial en ${ops.length} docs de jugadores/...`);
  await commitEnLotes(ops);
  console.log("Listo.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
