"use server";

import { randomUUID } from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import type { Cuenta } from "@/types/firestore";
import { verifyPassword } from "./passwords";
import { createSession, destroySession } from "./session";

export interface LoginResult {
  ok: boolean;
  error?: string;
}

// Cuenta doc id = username normalizado (minusculas, sin espacios extra) — ver scripts/seed.ts.
function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export async function login(formData: FormData): Promise<LoginResult> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    return { ok: false, error: "Completa usuario y contraseña" };
  }

  const cuentaId = normalizeUsername(username);
  const snap = await adminDb.collection("cuentas").doc(cuentaId).get();
  if (!snap.exists) {
    return { ok: false, error: "Usuario o contraseña incorrectos" };
  }

  const cuenta = snap.data() as Cuenta;
  const valido = await verifyPassword(password, cuenta.passwordHash);
  if (!valido) {
    return { ok: false, error: "Usuario o contraseña incorrectos" };
  }

  // Cuenta de practica dedicada: cada login se lleva un id al azar propio, para que esta sesion
  // opere SU PROPIA copia de los partidos de prueba (ver lib/match/practicaInstancias.ts) y no la
  // de otra persona que tambien entro con "demo" en simultaneo -- la copia en si se crea recien
  // al entrar a /pruebas, no aca (login queda liviano, sin escrituras extra a Firestore).
  const demoInstanceId = cuenta.rol === "designado" && cuenta.categoriaId === "demo" ? randomUUID().replace(/-/g, "").slice(0, 10) : undefined;

  await createSession({
    cuentaId,
    rol: cuenta.rol,
    username: cuenta.username,
    categoriaId: cuenta.categoriaId,
    alcance: cuenta.alcance,
    demoInstanceId,
  });

  return { ok: true };
}

export async function logout(): Promise<void> {
  await destroySession();
}
