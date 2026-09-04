import type { SessionPayload } from "@/lib/auth/session";

// Lista blanca de partidos de prueba -- fuera del fixture real, asi que ni resetearPartidoDemo
// puede tocar un partido real, ni sus tarjetas/minutos contaminan jugadores/. Compartida entre
// match/actions.ts, partido/[partidoId]/page.tsx y las paginas que arman el banner de "en vivo"
// (superior, juveniles) para no duplicarla en varios lugares.
export const PARTIDOS_DEMO_IDS = [
  "demo-partido-2", // M-22, formacion real de la Fecha 5 (vs Alumni)
  "pre-a-test-cambio",
  "pre-a-test-beromama",
  "m15-c-test-cambio", // formacion real de la fecha 1 vs Regatas C
];

// Los partidos de prueba son para el administrador (manager sin alcance, acceso total) y para la
// cuenta de practica dedicada ("demo", designado atado a categoriaId "demo") -- pensada para que
// alguien nuevo practique sin poder tocar ninguna categoria real. Ni los designados reales de una
// categoria, ni el publico general, ni los managers acotados a una division (manager/pelu con
// alcance "superior", manm15/16/17/19 con su edad) los ven en la navegacion ni pueden abrirlos por
// URL directa (ver el chequeo en /partido/[partidoId]/page.tsx). Pedido explicito del club:
// ademas del admin, solo esa cuenta de practica -- ningun otro designado ni manager de division.
export function pruebasVisiblesPara(session: Pick<SessionPayload, "rol" | "alcance" | "categoriaId"> | null): boolean {
  if (!session) return false;
  if (session.rol === "manager" && !session.alcance) return true;
  if (session.rol === "designado" && session.categoriaId === "demo") return true;
  return false;
}
