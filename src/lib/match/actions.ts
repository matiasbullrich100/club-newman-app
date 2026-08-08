"use server";

import { revalidatePath } from "next/cache";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSession, puedeOperarCategoria } from "@/lib/auth/session";
import { elapsedSeconds, minutoActual } from "./clock";
import { calcularMinutos, type CambioEvento, type JugadorInput } from "./minutes";
import { requierePlayerSelection } from "@/lib/incidentes";
import {
  PUNTOS_POR_TIPO,
  type Equipo,
  type Incidente,
  type JugadorPartido,
  type LiveState,
  type Partido,
  type TipoIncidente,
} from "@/types/firestore";

function refs(partidoId: string) {
  const partidoRef = adminDb.collection("partidos").doc(partidoId);
  return { partidoRef, liveStateRef: partidoRef.collection("liveState").doc("state") };
}

// Lista blanca a proposito -- resetearPartidoDemo nunca debe poder tocar un partido real,
// pase lo que pase con el argumento que le llegue del cliente. Tambien se usa para no
// contabilizar en jugadores/ las tarjetas azules cargadas en partidos simulados.
const PARTIDOS_DEMO_IDS = ["demo-partido-1", "demo-partido-2", "demo-partido-3"];

// ---- Máquina de estados del partido -------------------------------------------------

export async function iniciarPartido(partidoId: string): Promise<void> {
  const session = await getSession();
  const { partidoRef, liveStateRef } = refs(partidoId);

  await adminDb.runTransaction(async (tx) => {
    const partidoSnap = await tx.get(partidoRef);
    if (!partidoSnap.exists) throw new Error("Partido no encontrado");
    const partido = partidoSnap.data() as Partido;
    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if (partido.estado !== "programado") throw new Error("El partido ya fue iniciado");

    tx.update(partidoRef, { estado: "en_juego", updatedAt: FieldValue.serverTimestamp() });
    tx.set(liveStateRef, {
      periodo: "1T",
      clockRunning: true,
      clockAnchor: Timestamp.now(),
      accumulatedSeconds: 0,
    });
  });

  revalidatePath("/");
  revalidatePath(`/partido/${partidoId}`);
}

export async function cortar1T(partidoId: string): Promise<void> {
  const session = await getSession();
  const { partidoRef, liveStateRef } = refs(partidoId);
  const incidenteRef = partidoRef.collection("incidentes").doc();

  await adminDb.runTransaction(async (tx) => {
    const [partidoSnap, liveSnap] = await Promise.all([tx.get(partidoRef), tx.get(liveStateRef)]);
    if (!partidoSnap.exists || !liveSnap.exists) throw new Error("Partido no encontrado");
    const partido = partidoSnap.data() as Partido;
    const liveState = liveSnap.data() as LiveState;
    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if (partido.estado !== "en_juego" || liveState.periodo !== "1T") {
      throw new Error("El partido no está en el 1er tiempo");
    }

    const accumulated = elapsedSeconds(liveState);
    tx.update(partidoRef, { estado: "entretiempo", updatedAt: FieldValue.serverTimestamp() });
    tx.update(liveStateRef, {
      clockRunning: false,
      clockAnchor: null,
      accumulatedSeconds: accumulated,
      period1DurationSeconds: accumulated,
    });

    const incidente: Incidente = {
      tipo: "fin_1t",
      periodo: "1T",
      minuto: Math.round(accumulated / 60),
      segundoAbsoluto: Math.floor(accumulated),
      publicadoPorCuentaId: session!.cuentaId,
      createdAt: Timestamp.now(),
    };
    tx.set(incidenteRef, incidente);
  });

  revalidatePath(`/partido/${partidoId}`);
}

export async function iniciar2T(partidoId: string): Promise<void> {
  const session = await getSession();
  const { partidoRef, liveStateRef } = refs(partidoId);

  await adminDb.runTransaction(async (tx) => {
    const partidoSnap = await tx.get(partidoRef);
    if (!partidoSnap.exists) throw new Error("Partido no encontrado");
    const partido = partidoSnap.data() as Partido;
    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if (partido.estado !== "entretiempo") throw new Error("El partido no está en el entretiempo");

    tx.update(partidoRef, { estado: "en_juego", updatedAt: FieldValue.serverTimestamp() });
    tx.update(liveStateRef, {
      periodo: "2T",
      clockRunning: true,
      clockAnchor: Timestamp.now(),
      accumulatedSeconds: 0,
    });
  });

  revalidatePath(`/partido/${partidoId}`);
}

export async function suspender(partidoId: string): Promise<void> {
  const session = await getSession();
  const { partidoRef, liveStateRef } = refs(partidoId);

  await adminDb.runTransaction(async (tx) => {
    const [partidoSnap, liveSnap] = await Promise.all([tx.get(partidoRef), tx.get(liveStateRef)]);
    if (!partidoSnap.exists || !liveSnap.exists) throw new Error("Partido no encontrado");
    const partido = partidoSnap.data() as Partido;
    const liveState = liveSnap.data() as LiveState;
    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if (partido.estado !== "en_juego") throw new Error("Solo se puede suspender un partido en juego");

    const accumulated = elapsedSeconds(liveState);
    tx.update(partidoRef, { estado: "suspendido", updatedAt: FieldValue.serverTimestamp() });
    tx.update(liveStateRef, { clockRunning: false, clockAnchor: null, accumulatedSeconds: accumulated });
  });

  revalidatePath(`/partido/${partidoId}`);
}

export async function reanudar(partidoId: string): Promise<void> {
  const session = await getSession();
  const { partidoRef, liveStateRef } = refs(partidoId);

  await adminDb.runTransaction(async (tx) => {
    const partidoSnap = await tx.get(partidoRef);
    if (!partidoSnap.exists) throw new Error("Partido no encontrado");
    const partido = partidoSnap.data() as Partido;
    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if (partido.estado !== "suspendido") throw new Error("El partido no está suspendido");

    tx.update(partidoRef, { estado: "en_juego", updatedAt: FieldValue.serverTimestamp() });
    tx.update(liveStateRef, { clockRunning: true, clockAnchor: Timestamp.now() });
  });

  revalidatePath(`/partido/${partidoId}`);
}

export async function terminarPartido(partidoId: string): Promise<void> {
  const session = await getSession();
  const { partidoRef, liveStateRef } = refs(partidoId);

  const partidoSnap = await partidoRef.get();
  if (!partidoSnap.exists) throw new Error("Partido no encontrado");
  const partido = partidoSnap.data() as Partido;
  if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
  if (partido.estado !== "en_juego" && partido.estado !== "entretiempo") {
    throw new Error("El partido no se puede terminar desde este estado");
  }

  const liveSnap = await liveStateRef.get();
  const liveState = liveSnap.data() as LiveState;
  const accumulated = liveState.clockRunning ? elapsedSeconds(liveState) : liveState.accumulatedSeconds;
  const period1DurationSeconds =
    liveState.periodo === "1T" ? accumulated : liveState.period1DurationSeconds ?? 0;
  const period2DurationSeconds =
    liveState.periodo === "2T" ? accumulated : liveState.period2DurationSeconds ?? 0;

  const [plantelSnap, cambiosSnap] = await Promise.all([
    partidoRef.collection("plantel").get(),
    partidoRef.collection("incidentes").where("tipo", "==", "cambio").get(),
  ]);

  const plantel: JugadorInput[] = plantelSnap.docs.map((d) => ({
    jugadorId: d.id,
    titular: (d.data() as JugadorPartido).titular,
  }));
  const cambios: CambioEvento[] = cambiosSnap.docs.map((d) => {
    const data = d.data() as Incidente;
    return {
      periodo: data.periodo,
      minuto: data.minuto,
      jugadorSaleId: data.jugadorSaleId,
      jugadorEntraId: data.jugadorEntraId,
    };
  });

  const minutos = calcularMinutos(plantel, cambios, period1DurationSeconds / 60, period2DurationSeconds / 60);

  const batch = adminDb.batch();
  batch.update(partidoRef, { estado: "terminado", updatedAt: FieldValue.serverTimestamp() });
  batch.update(liveStateRef, {
    clockRunning: false,
    clockAnchor: null,
    accumulatedSeconds: accumulated,
    period1DurationSeconds,
    period2DurationSeconds,
  });

  if (liveState.periodo) {
    const finIncidente: Incidente = {
      tipo: liveState.periodo === "1T" ? "fin_1t" : "fin_2t",
      periodo: liveState.periodo,
      minuto: Math.round(accumulated / 60),
      segundoAbsoluto: Math.floor(accumulated),
      publicadoPorCuentaId: session!.cuentaId,
      createdAt: Timestamp.now(),
    };
    batch.set(partidoRef.collection("incidentes").doc(), finIncidente);
  }

  for (const jugador of plantel) {
    const m = minutos[jugador.jugadorId];
    batch.update(partidoRef.collection("plantel").doc(jugador.jugadorId), {
      minutosJugados1T: m.minutos1T,
      minutosJugados2T: m.minutos2T,
    });

    const nombre = plantelSnap.docs.find((d) => d.id === jugador.jugadorId)?.data().nombre ?? "";
    batch.set(
      adminDb.collection("jugadores").doc(jugador.jugadorId),
      { nombre, minutosJugadosTotal: FieldValue.increment(m.minutos1T + m.minutos2T) },
      { merge: true }
    );
  }

  await batch.commit();
  revalidatePath(`/partido/${partidoId}`);
  revalidatePath("/");
}

// ---- Incidencias ----------------------------------------------------------------------

export interface PublicarIncidenteInput {
  tipo: Exclude<TipoIncidente, "cambio">;
  equipo: Equipo;
  jugadorId?: string;
}

export async function publicarIncidente(partidoId: string, input: PublicarIncidenteInput): Promise<void> {
  const session = await getSession();
  const { partidoRef, liveStateRef } = refs(partidoId);
  const incidenteRef = partidoRef.collection("incidentes").doc();

  await adminDb.runTransaction(async (tx) => {
    const [partidoSnap, liveSnap] = await Promise.all([tx.get(partidoRef), tx.get(liveStateRef)]);
    if (!partidoSnap.exists || !liveSnap.exists) throw new Error("Partido no encontrado");
    const partido = partidoSnap.data() as Partido;
    const liveState = liveSnap.data() as LiveState;
    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if (partido.estado !== "en_juego" || !liveState.periodo) throw new Error("El partido no está en juego");

    let jugadorNombre: string | undefined;
    let dorsal: string | undefined;
    if (input.equipo === "newman" && requierePlayerSelection(input.tipo)) {
      if (!input.jugadorId) throw new Error("Falta el jugador");
      if (!partido.enCanchaIds.includes(input.jugadorId)) throw new Error("El jugador no está en cancha");
      const jugadorSnap = await tx.get(partidoRef.collection("plantel").doc(input.jugadorId));
      if (!jugadorSnap.exists) throw new Error("Jugador no encontrado en el plantel");
      const jugador = jugadorSnap.data() as JugadorPartido;
      jugadorNombre = jugador.nombre;
      dorsal = jugador.dorsal;
    }

    const minuto = minutoActual(liveState);
    const segundoAbsoluto = Math.floor(elapsedSeconds(liveState));
    const puntos = (PUNTOS_POR_TIPO as Record<string, number>)[input.tipo];

    const incidente: Incidente = {
      tipo: input.tipo,
      equipo: input.equipo,
      periodo: liveState.periodo,
      minuto,
      segundoAbsoluto,
      publicadoPorCuentaId: session!.cuentaId,
      createdAt: Timestamp.now(),
      ...(puntos !== undefined ? { puntos } : {}),
      ...(input.jugadorId ? { jugadorId: input.jugadorId } : {}),
      ...(jugadorNombre ? { jugadorNombre } : {}),
      ...(dorsal ? { dorsal } : {}),
    };
    tx.set(incidenteRef, incidente);

    if (puntos !== undefined) {
      const campo = input.equipo === "newman" ? "resultado.newman" : "resultado.rival";
      tx.update(partidoRef, { [campo]: FieldValue.increment(puntos), updatedAt: FieldValue.serverTimestamp() });
    }

    const campoTarjeta: Partial<Record<TipoIncidente, string>> = {
      tarjeta_amarilla: "tarjetasAmarillas",
      tarjeta_doble_amarilla: "tarjetasDobleAmarilla",
      tarjeta_roja: "tarjetasRojas",
      tarjeta_azul: "tarjetasAzules",
    };
    // Las tarjetas azules de partidos simulados no se contabilizan en las estadisticas reales.
    const esAzulSimulada = input.tipo === "tarjeta_azul" && PARTIDOS_DEMO_IDS.includes(partidoId);
    if (campoTarjeta[input.tipo] && input.equipo === "newman" && input.jugadorId && !esAzulSimulada) {
      tx.set(
        adminDb.collection("jugadores").doc(input.jugadorId),
        { nombre: jugadorNombre, [campoTarjeta[input.tipo]!]: FieldValue.increment(1) },
        { merge: true }
      );
    }
  });

  revalidatePath(`/partido/${partidoId}`);
}

export interface PublicarCambioInput {
  jugadorSaleId: string;
  jugadorEntraId: string;
}

export async function publicarCambio(partidoId: string, input: PublicarCambioInput): Promise<void> {
  const session = await getSession();
  const { partidoRef, liveStateRef } = refs(partidoId);
  const saleRef = partidoRef.collection("plantel").doc(input.jugadorSaleId);
  const entraRef = partidoRef.collection("plantel").doc(input.jugadorEntraId);
  const incidenteRef = partidoRef.collection("incidentes").doc();

  await adminDb.runTransaction(async (tx) => {
    const [partidoSnap, liveSnap, saleSnap, entraSnap] = await Promise.all([
      tx.get(partidoRef),
      tx.get(liveStateRef),
      tx.get(saleRef),
      tx.get(entraRef),
    ]);
    if (!partidoSnap.exists || !liveSnap.exists || !saleSnap.exists || !entraSnap.exists) {
      throw new Error("Datos del partido incompletos");
    }
    const partido = partidoSnap.data() as Partido;
    const liveState = liveSnap.data() as LiveState;
    const sale = saleSnap.data() as JugadorPartido;
    const entra = entraSnap.data() as JugadorPartido;

    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if (partido.estado !== "en_juego" || !liveState.periodo) throw new Error("El partido no está en juego");
    if (!sale.enCancha) throw new Error("Ese jugador no está en cancha");
    if (entra.enCancha) throw new Error("Ese jugador ya está en cancha");

    const minuto = minutoActual(liveState);
    const segundoAbsoluto = Math.floor(elapsedSeconds(liveState));
    const nuevoEnCancha = partido.enCanchaIds
      .filter((id) => id !== input.jugadorSaleId)
      .concat(input.jugadorEntraId);

    tx.update(saleRef, { enCancha: false });
    tx.update(entraRef, { enCancha: true });
    tx.update(partidoRef, { enCanchaIds: nuevoEnCancha, updatedAt: FieldValue.serverTimestamp() });

    const incidente: Incidente = {
      tipo: "cambio",
      equipo: "newman",
      jugadorSaleId: input.jugadorSaleId,
      jugadorSaleNombre: sale.nombre,
      jugadorEntraId: input.jugadorEntraId,
      jugadorEntraNombre: entra.nombre,
      periodo: liveState.periodo,
      minuto,
      segundoAbsoluto,
      publicadoPorCuentaId: session!.cuentaId,
      createdAt: Timestamp.now(),
    };
    tx.set(incidenteRef, incidente);
  });

  revalidatePath(`/partido/${partidoId}`);
}

// ---- Solo para los partidos de prueba (Fase 1) ------------------------------------------

/**
 * Vuelve un partido de prueba a "programado" (0-0, sin incidencias) para poder simularlo
 * de nuevo (mismo efecto que scripts/reset-demo.ts, pero disparable desde la UI por el Manager).
 */
export async function resetearPartidoDemo(partidoDemoId: string): Promise<void> {
  const session = await getSession();
  if (!session || session.rol !== "manager") throw new Error("No autorizado");
  if (!PARTIDOS_DEMO_IDS.includes(partidoDemoId)) throw new Error("Ese partido no se puede resetear");

  const partidoRef = adminDb.collection("partidos").doc(partidoDemoId);
  const partidoSnap = await partidoRef.get();
  if (!partidoSnap.exists) throw new Error("El partido de prueba no existe");

  const [plantelSnap, incidentesSnap] = await Promise.all([
    partidoRef.collection("plantel").get(),
    partidoRef.collection("incidentes").get(),
  ]);

  const batch = adminDb.batch();

  const titularesIds = plantelSnap.docs.filter((d) => d.data().titular).map((d) => d.id);
  batch.update(partidoRef, {
    estado: "programado",
    resultado: { newman: 0, rival: 0 },
    enCanchaIds: titularesIds,
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(partidoRef.collection("liveState").doc("state"), {
    periodo: null,
    clockRunning: false,
    clockAnchor: null,
    accumulatedSeconds: 0,
  });

  for (const doc of plantelSnap.docs) {
    const titular = doc.data().titular as boolean;
    batch.update(doc.ref, { enCancha: titular, minutosJugados1T: 0, minutosJugados2T: 0 });
  }

  for (const doc of incidentesSnap.docs) {
    batch.delete(doc.ref);
  }

  await batch.commit();
  revalidatePath(`/partido/${partidoDemoId}`);
  revalidatePath("/");
}
