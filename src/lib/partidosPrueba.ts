import type { SessionPayload } from "@/lib/auth/session";

// Lista blanca de partidos de prueba -- fuera del fixture real, asi que ni resetearPartidoDemo
// puede tocar un partido real, ni sus tarjetas/minutos contaminan jugadores/. Compartida entre
// match/actions.ts, partido/[partidoId]/page.tsx y las paginas que arman el banner de "en vivo"
// (superior, juveniles) para no duplicarla en varios lugares.
export const PARTIDOS_DEMO_IDS = [
  "demo-partido-1",
  "demo-partido-2",
  "pre-a-test-cambio",
  "pre-a-test-beromama",
  "m15-c-test-cambio",
];

// Los partidos de prueba son para que managers/administrador simulen formaciones antes de
// publicarlas -- no son para designados ni para el publico general, asi que no aparecen en la
// navegacion ni se pueden abrir por URL directa para nadie mas (ver el chequeo en
// /partido/[partidoId]/page.tsx).
export function pruebasVisiblesPara(session: Pick<SessionPayload, "rol"> | null): boolean {
  return session?.rol === "manager";
}
