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
      equipo: f.team.name,
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

  return { championshipName: crudo[0]?.championship.name ?? "", filas };
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
