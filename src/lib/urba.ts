import type { FilaPosicion } from "@/types/firestore";

// Server-only (usa fetch de Node, se llama desde route handlers y scripts). No importar desde un
// "use client" component.
//
// api.urba.org.ar es el backend JSON real detras de fixture.urba.org.ar (el sitio que ve un
// humano es un frontend Next.js que le pega a este dominio por fetch, sin auth ni CORS). No hay
// robots.txt en ninguno de los dos dominios ni señal de bloqueo -- confirmado a mano antes de
// integrar esto.
const URBA_API_BASE = "https://api.urba.org.ar/api";

interface FilaPosicionUrbaRaw {
  position: number;
  played: number;
  won: number;
  tied: number;
  lost: number;
  points_favor: number;
  points_against: number;
  bonus_offensive: number;
  bonus_defensive: number;
  points_total: number;
  team: { name: string };
  championship: { name: string };
}

// URBA nombra a varios rivales con el nombre largo/oficial, distinto por categoria (a veces con
// una letra de grupo pegada al final, ej. "Regatas B. Vista A") -- el club tiene su propia
// convencion corta para estos en toda la app (fixtures cargados a mano y tablas de posiciones).
// Cada regla matchea el nombre completo (con la letra de grupo opcional al final) y devuelve la
// version corta + esa misma letra. Orden importa: mas especifico primero (ej. "Manuel Belgrano"
// antes que "Belgrano Athletic", dos clubes distintos que comparten la palabra "Belgrano").
const ABREVIATURAS_CLUB: { patron: RegExp; corto: string }[] = [
  { patron: /^Regatas\s+(?:Bella|B\.?)\s*Vista\s*([A-Za-z])?$/i, corto: "Regatas" },
  { patron: /^Manuel\s+Belgrano\s*([A-Za-z])?$/i, corto: "M. Belgrano" },
  { patron: /^Belgrano\s+Athl(?:etic|ético|\.)?\s*([A-Za-z])?$/i, corto: "Belgrano" },
  { patron: /^Champagnat\s*([A-Za-z])?$/i, corto: "Champa" },
  { patron: /^(?:Club\s+)?(?:Atl(?:ético|etico)\.?\s+)?(?:Los\s+)?Matreros\s*([A-Za-z])?$/i, corto: "Matreros" },
  { patron: /^Atl(?:ético|etico)\.?\s+del\s+Rosario\s*([A-Za-z])?$/i, corto: "Atl. del Rosario" },
  { patron: /^Buenos\s+Aires(?:\s+C(?:ricket)?\s*&?\s*R(?:ugby)?\s*C(?:lub)?)?\s*([A-Za-z])?$/i, corto: "BACRC" },
  { patron: /^A\.?\s*D\.?\s*Francesa\s*([A-Za-z])?$/i, corto: "D. Francesa" },
  { patron: /^(?:Club\s+)?(?:C\.?\s*U\.?|Universitario)\s*(?:de\s+)?Quilmes\s*([A-Za-z])?$/i, corto: "C.U.Q." },
];

// Exportada porque tambien se usa para corregir el campo `rival` de partidos cargados a mano
// (fixtures que no vienen de URBA) con la misma convencion corta.
export function normalizarNombreEquipo(nombre: string): string {
  for (const { patron, corto } of ABREVIATURAS_CLUB) {
    const match = nombre.match(patron);
    if (match) return match[1] ? `${corto} ${match[1].toUpperCase()}` : corto;
  }
  return nombre;
}

// "Menores de 15 - Segunda Rueda - Formativa A" -> "M15 - Formativa A" -- la rueda no aporta nada
// util aca y "Menores de N" ocupa mucho espacio en una tarjeta angosta.
function normalizarChampionshipName(nombre: string): string {
  return nombre
    .replace(/\s*-\s*(?:Primera|Segunda)\s+Rueda\s*-\s*/i, " - ")
    .replace(/Menores de (\d+)/i, "M$1")
    .trim();
}

export async function fetchPosicionesUrba(
  championshipId: number
): Promise<{ championshipName: string; filas: FilaPosicion[] }> {
  const res = await fetch(`${URBA_API_BASE}/positions/${championshipId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`URBA respondió ${res.status} para el torneo ${championshipId}`);
  const json: { positions: FilaPosicionUrbaRaw[] } = await res.json();
  const crudo = json.positions ?? [];

  const filas: FilaPosicion[] = crudo
    .map((f) => ({
      posicion: f.position,
      equipo: normalizarNombreEquipo(f.team.name),
      jugados: f.played,
      ganados: f.won,
      empatados: f.tied,
      perdidos: f.lost,
      puntosFavor: f.points_favor,
      puntosContra: f.points_against,
      // DIF no viene como campo propio en la API -- se calcula.
      diferencia: f.points_favor - f.points_against,
      bonusOfensivo: f.bonus_offensive,
      bonusDefensivo: f.bonus_defensive,
      puntos: f.points_total,
    }))
    .sort((a, b) => a.posicion - b.posicion);

  return { championshipName: normalizarChampionshipName(crudo[0]?.championship.name ?? ""), filas };
}

interface ChampionshipUrba {
  id: number;
  name: string;
}

// Usado solo por src/scripts/resolver-torneos-urba.ts para buscar el id de un torneo por
// nombre -- Juveniles parte cada categoria en "Primera/Segunda rueda" con ids distintos por
// temporada, asi que no hay forma 100% automatica de mantener el mapeo al dia.
export async function fetchChampionships(seasonYear: number): Promise<ChampionshipUrba[]> {
  const res = await fetch(`${URBA_API_BASE}/championships/${seasonYear}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`URBA respondió ${res.status} al listar torneos de ${seasonYear}`);
  const json: { championships: ChampionshipUrba[] } = await res.json();
  return json.championships ?? [];
}
