// Ayuda a mantener src/lib/torneos-urba.ts al dia -- imprime, para la temporada de URBA activa,
// todos los equipos de Newman (club_id 9) que encuentra y a que campeonato/zona pertenece cada
// uno. NO escribe nada -- es solo para revisar a mano antes de tocar torneos-urba.ts.
//
// /api/teams no filtra por club_id pese al nombre del parametro (devuelve TODOS los equipos de
// TODAS las categorias/temporadas, ~9000 filas) -- se filtra client-side. El campo `team.name`
// ya viene como "Newman A"/"Newman B"/etc, que coincide directo con la letra que usa este club
// en categorias.ts -- no hace falta matchear por nombre de campeonato.
//
// Correr con: npx tsx src/scripts/resolver-torneos-urba.ts [seasonYear]

interface TeamUrba {
  name: string;
  club_id: number;
  championship_id: number;
  championship: { name: string; season_id: number; closed: boolean };
}

async function main() {
  const seasonYear = Number(process.argv[2] ?? 2026);
  const NEWMAN_CLUB_ID = 9;

  const res = await fetch("https://api.urba.org.ar/api/teams", { cache: "no-store" });
  if (!res.ok) throw new Error(`URBA respondió ${res.status}`);
  const json: { teams: TeamUrba[] } = await res.json();

  const newman = json.teams
    .filter((t) => t.club_id === NEWMAN_CLUB_ID && t.championship.season_id === seasonYear)
    .sort((a, b) => a.championship.name.localeCompare(b.championship.name) || a.name.localeCompare(b.name));

  console.log(`Equipos de Newman en la temporada ${seasonYear}:\n`);
  for (const t of newman) {
    console.log(`${t.championship_id}  ${t.name.padEnd(12)}  ${t.championship.name}`);
  }
  console.log(`\nTotal: ${newman.length} equipos.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
