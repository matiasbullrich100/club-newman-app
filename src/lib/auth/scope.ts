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
 *
 * `partidoDePrueba`: pasar `true` cuando el partido esta en PARTIDOS_DEMO_IDS (ver
 * lib/partidosPrueba.ts) -- ahi ademas del manager y el designado de esa categoria, puede operar
 * la cuenta de practica dedicada (designado con categoriaId "demo"), sin que eso le de acceso a
 * NINGUN partido real. No se importa PARTIDOS_DEMO_IDS aca para no acoplar este archivo (que se
 * usa desde Client Components) a esa lista -- cada callsite ya calcula `esPartidoDePrueba`.
 */
export function puedeOperarCategoria(session: SessionPayload | null, categoriaId: string, partidoDePrueba = false): boolean {
  if (!session) return false;
  if (partidoDePrueba && session.rol === "designado" && session.categoriaId === "demo") return true;
  if (session.rol === "manager") return esManagerDeCategoria(session, categoriaId);
  return session.rol === "designado" && session.categoriaId === categoriaId;
}

/**
 * Igual que puedeOperarCategoria pero sin el caso "designado" -- para acciones reservadas al
 * manager de la division (o al administrador sin alcance), como Reiniciar partido: el designado
 * que corre el partido en vivo no debe poder borrar el resultado y las incidencias.
 */
export function esManagerDeCategoria(session: SessionPayload | null, categoriaId: string): boolean {
  if (!session || session.rol !== "manager") return false;
  if (!session.alcance) return true;
  if (session.alcance === "superior") return grupoDeCategoria(categoriaId).grupo === "superior";
  const cat = CATEGORIAS.find((c) => c.id === categoriaId);
  return cat?.grupo === "juveniles" && cat.edadId === session.alcance;
}

/** Mismo alcance que puedeOperarCategoria, pero para entrar a /estadisticas/[grupoId]. */
export function puedeVerEstadisticas(session: SessionPayload | null, grupoId: string): boolean {
  if (!session) return false;
  if (session.rol === "entrenador") return true;
  if (session.rol !== "manager") return false;
  if (!session.alcance) return true;
  return session.alcance === grupoId;
}
