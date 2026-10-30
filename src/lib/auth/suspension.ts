import "server-only";
import { adminDb } from "@/lib/firebase-admin";

// Cuentas SUSPENDIDAS (campo `suspendida: true` en cuentas/{id}): no pueden iniciar sesion y una sesion que ya estaba
// abierta deja de valer. La cuenta "admin" nunca se suspende. Se reactivan con src/scripts/reactivar-cuentas.ts.
export const CUENTA_ADMIN = "admin";

// Cache corto por instancia del servidor: getSession() se llama en casi todas las paginas y no hace falta leer
// Firestore en cada una. Una reactivacion/suspension tarda hasta TTL_MS en notarse.
const TTL_MS = 15_000;
const cache = new Map<string, { hasta: number; suspendida: boolean }>();

export async function cuentaSuspendida(cuentaId: string): Promise<boolean> {
  if (cuentaId === CUENTA_ADMIN) return false;
  const hit = cache.get(cuentaId);
  if (hit && hit.hasta > Date.now()) return hit.suspendida;
  const snap = await adminDb.collection("cuentas").doc(cuentaId).get();
  const suspendida = snap.exists && snap.data()?.suspendida === true;
  cache.set(cuentaId, { hasta: Date.now() + TTL_MS, suspendida });
  return suspendida;
}
