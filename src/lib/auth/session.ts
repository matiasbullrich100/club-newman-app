import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Rol } from "@/types/firestore";
// Re-exportado desde scope.ts (archivo sin "server-only", importable desde Client Components)
// para no romper los imports server-side existentes de `puedeOperarCategoria`.
export { puedeOperarCategoria, puedeVerEstadisticas, esManagerDeCategoria } from "./scope";
import { puedeOperarCategoria } from "./scope";

const COOKIE_NAME = "cn_session";
// 30 días: los Designados suelen loguearse días antes del partido (o "la noche anterior para
// probar"). Con 24h se quedaban sin sesión a mitad de la mañana y no podían operar -- pasó el
// 2026-08-29. Son cuentas de bajo riesgo (operadores de partido de un club), 30 días es razonable.
const SESSION_DURATION = "30d";
const SESSION_DURATION_SEGUNDOS = 60 * 60 * 24 * 30;

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Falta la variable de entorno AUTH_SECRET");
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  cuentaId: string;
  rol: Rol;
  username: string;
  categoriaId?: string; // solo rol "designado"
  alcance?: string; // solo rol "manager" -- edadId de Juveniles; ausente = sin restriccion
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SEGUNDOS,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Throws if there's no session or the role isn't one of `rolesPermitidos`. */
export async function requireRole(rolesPermitidos: Rol[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || !rolesPermitidos.includes(session.rol)) {
    throw new Error("No autorizado");
  }
  return session;
}

/** Throws unless the session is the Designado scoped to `categoriaId`, or a Manager (who can act on any category). */
export async function requireDesignadoDeCategoria(categoriaId: string): Promise<SessionPayload> {
  const session = await getSession();
  if (!puedeOperarCategoria(session, categoriaId)) throw new Error("No autorizado");
  return session as SessionPayload;
}
