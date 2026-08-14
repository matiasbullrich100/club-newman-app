// Logica de alcance (que categorias puede operar/ver cada sesion) -- separada de session.ts
// porque esa arranca con `import "server-only"` (usa cookies()) y no se puede importar desde
// componentes cliente. Este archivo es puro (sin cookies, sin Admin SDK) asi que lo pueden
// importar tanto Server Components/Actions como Client Components.
import { CATEGORIAS, grupoDeCategoria } from "@/lib/categorias";
import type { SessionPayload } from "./session";

/**
 * Pure check (no cookies) -- safe to call from inside a Firestore transaction after reading el
 * partido, o desde un Client Component para decidir que mostrar.
 *
 * Hay 5 divisiones, cada una con su propio manager acotado solo a la suya: `alcance: "superior"`
 * (Plantel Superior, cuenta "manager"/"pelu") o `alcance` = un edadId de Juveniles
 * (m15/m16/m17/m19). `alcance` ausente = sin restriccion -- hoy ninguna cuenta usa este caso,
 * queda como resguardo si se crea una cuenta manager nueva sin setearlo.
 */
export function puedeOperarCategoria(session: SessionPayload | null, categoriaId: string): boolean {
  if (!session) return false;
  if (session.rol === "manager") {
    if (!session.alcance) return true;
    if (session.alcance === "superior") return grupoDeCategoria(categoriaId).grupo === "superior";
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
