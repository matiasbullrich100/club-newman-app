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

// Pedido puntual del club: los partidos de prueba dejan de aparecer en la navegacion principal a
// partir del sabado 15/8/2026 8:00 (hora Argentina), salvo para el Administrador -- que los sigue
// usando para simular formaciones antes de publicarlas. Argentina es UTC-3 todo el año (sin
// horario de verano), asi que 08:00 ART = 11:00 UTC.
const CORTE_PRUEBAS_VISIBLES = new Date("2026-08-15T11:00:00Z");

export function pruebasVisiblesPara(session: Pick<SessionPayload, "username"> | null): boolean {
  if (session?.username === "administrador") return true;
  return new Date() < CORTE_PRUEBAS_VISIBLES;
}
