// Logica de alcance (que categorias puede operar/ver cada sesion) -- separada de session.ts
// porque esa arranca con `import "server-only"` (usa cookies()) y no se puede importar desde
// componentes cliente. Este archivo es puro (sin cookies, sin Admin SDK) asi que lo pueden
// importar tanto Server Components/Actions como Client Components.
import { CATEGORIAS } from "@/lib/categorias";
import type { SessionPayload } from "./session";

/**
 * Pure check (no cookies) -- safe to call from inside a Firestore transaction after reading el
 * partido, o desde un Client Component para decidir que mostrar.
 *
 * rol "manager" sin `alcance` = sin restriccion (Plantel Superior + las 4 divisiones de
 * Juveniles, el manager historico "manager"/"fede"). rol "manager" con `alcance` = solo esa
 * division de Juveniles (m15/m16/m17/m19).
 */
export function puedeOperarCategoria(session: SessionPayload | null, categoriaId: string): boolean {
  if (!session) return false;
  if (session.rol === "manager") {
    if (!session.alcance) return true;
    const cat = CATEGORIAS.find((c) => c.id === categoriaId);
    return cat?.grupo === "juveniles" && cat.edadId === session.alcance;
  }
  return session.rol === "designado" && session.categoriaId === categoriaId;
}

/** Mismo alcance que puedeOperarCategoria, pero para entrar a /estadisticas/[grupoId]. */
export function puedeVerEstadisticas(session: SessionPayload | null, grupoId: string): boolean {
  if (!session) return false;
  if (session.rol === "entrenador") return true;
  if (session.rol !== "manager") return false;
  if (!session.alcance) return true;
  return session.alcance === grupoId;
}
