"use server";

import { revalidatePath } from "next/cache";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSession, puedeOperarCategoria } from "@/lib/auth/session";
import { elapsedSeconds, minutoActual } from "./clock";
import { calcularMinutos, type CambioEvento, type JugadorInput } from "./minutes";
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
    if (input.equipo === "newman") {
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

    const esTarjeta = input.tipo === "tarjeta_amarilla" || input.tipo === "tarjeta_roja" || input.tipo === "tarjeta_azul";
    if (esTarjeta && input.equipo === "newman" && input.jugadorId) {
      const campoTarjeta =
        input.tipo === "tarjeta_amarilla" ? "tarjetasAmarillas" : input.tipo === "tarjeta_roja" ? "tarjetasRojas" : "tarjetasAzules";
      tx.set(
        adminDb.collection("jugadores").doc(input.jugadorId),
        { nombre: jugadorNombre, [campoTarjeta]: FieldValue.increment(1) },
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
