// Mapeo categoriaId (el nuestro, de categorias.ts) -> torneo/zona + nombre exacto del equipo en
// la API de URBA (api.urba.org.ar). Se resuelve corriendo src/scripts/resolver-torneos-urba.ts,
// que lista todos los equipos de Newman (club_id 9) de la temporada activa -- el campo "name" de
// cada equipo ya viene como "Newman A"/"Newman B"/etc, coincidiendo directo con la letra de
// categorias.ts. Se guarda el nombre exacto (no alcanza con derivarlo de la letra) porque algunas
// zonas juntan a mas de un equipo de Newman -- ver Pre F/G/H abajo -- y ese nombre es lo que la
// pagina de posiciones usa para resaltar la fila correcta. Una categoria sin entrada acá
// simplemente no muestra el botón "Tabla de posiciones" (ver categoria/[categoriaId]/page.tsx y
// juveniles/[edadId]/equipo/[equipoId]/page.tsx).
//
// Plantel Superior tiene un solo torneo por categoria, estable toda la temporada. Juveniles en
// cambio parte cada categoria en "Primera Rueda" / "Segunda Rueda" (dos ids distintos) -- estos
// valores toman la Segunda Rueda por ser la fase vigente hoy (creada el 2026-08-04, mientras que
// la Primera Rueda ya deberia estar terminada). Si el club arranca una rueda nueva, hay que volver
// a correr el resolver y actualizar estos ids a mano.
export const TORNEOS_URBA: Record<string, { championshipId: number; equipoNombre: string }> = {
  // Plantel Superior
  primera: { championshipId: 2025176, equipoNombre: "Newman" },
  intermedia: { championshipId: 2025184, equipoNombre: "Newman" },
  "pre-a": { championshipId: 2025185, equipoNombre: "Newman" },
  "pre-b": { championshipId: 2025186, equipoNombre: "Newman B" },
  "pre-c": { championshipId: 2025197, equipoNombre: "Newman C" },
  "pre-d": { championshipId: 2025198, equipoNombre: "Newman D" },
  "pre-e": { championshipId: 2025200, equipoNombre: "Newman E" },
  "pre-f": { championshipId: 2025201, equipoNombre: "Newman F" }, // Pre F/G/H comparten zona este año
  "pre-g": { championshipId: 2025201, equipoNombre: "Newman G" },
  "pre-h": { championshipId: 2025201, equipoNombre: "Newman H" },
  "m-22": { championshipId: 2025206, equipoNombre: "Newman" },

  // Juveniles (Segunda Rueda 2026)
  "m15-a": { championshipId: 2025307, equipoNombre: "Newman A" },
  "m15-b": { championshipId: 2025308, equipoNombre: "Newman B" },
  "m15-c": { championshipId: 2025315, equipoNombre: "Newman C" },
  "m15-d": { championshipId: 2025316, equipoNombre: "Newman D" },
  "m16-a": { championshipId: 2025295, equipoNombre: "Newman A" },
  "m16-b": { championshipId: 2025297, equipoNombre: "Newman B" },
  "m16-c": { championshipId: 2025301, equipoNombre: "Newman C" },
  "m16-d": { championshipId: 2025302, equipoNombre: "Newman D" },
  "m17-a": { championshipId: 2025285, equipoNombre: "Newman A" },
  "m17-b": { championshipId: 2025286, equipoNombre: "Newman B" },
  "m17-c": { championshipId: 2025292, equipoNombre: "Newman C" },
  "m19-a": { championshipId: 2025267, equipoNombre: "Newman A" },
  "m19-b": { championshipId: 2025268, equipoNombre: "Newman B" },
  "m19-c": { championshipId: 2025275, equipoNombre: "Newman C" },
  "m19-d": { championshipId: 2025276, equipoNombre: "Newman D" },
  "m19-e": { championshipId: 2025279, equipoNombre: "Newman E" },
  // m19-f: no se encontró un equipo "Newman F" en Menores de 19 esta temporada.
};
