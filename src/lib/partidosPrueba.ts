import type { SessionPayload } from "@/lib/auth/session";

// Lista blanca de partidos de prueba -- fuera del fixture real, asi que ni resetearPartidoDemo
// puede tocar un partido real, ni sus tarjetas/minutos contaminan jugadores/. Compartida entre
// match/actions.ts, partido/[partidoId]/page.tsx y las paginas que arman el banner de "en vivo"
// (superior, juveniles) para no duplicarla en varios lugares.
export const PARTIDOS_DEMO_IDS = [
  "demo-partido-2", // M-22, formacion real de la Fecha 21
  "pre-a-test-cambio",
  "pre-a-test-beromama",
  "m15-c-test-cambio", // formacion real de la fecha 1 vs Regatas C
];

// Los partidos de prueba son solo para el administrador (manager sin alcance, acceso total) --
// ni los designados, ni el publico general, ni los managers acotados a una division (manager/pelu
// con alcance "superior", manm15/16/17/19 con su edad) los ven en la navegacion ni pueden
// abrirlos por URL directa (ver el chequeo en /partido/[partidoId]/page.tsx). Pedido explicito del
// club: solo el admin simula formaciones ahi, no cada manager de division.
export function pruebasVisiblesPara(session: Pick<SessionPayload, "rol" | "alcance"> | null): boolean {
  return session?.rol === "manager" && !session.alcance;
}
