# Modelo de datos (Firestore)

Fuente de verdad de los tipos: [`src/types/firestore.ts`](../src/types/firestore.ts) — este doc
es un mapa de alto nivel, no un espejo campo por campo. Si difieren, gana el `.ts`.

## Colecciones top-level

- **`cuentas/{cuentaId}`** — usuario/hash de contraseña/rol. **Nunca legible ni escribible desde
  el cliente** (ver `firestore.rules`); solo se toca con el Admin SDK server-side. `cuentaId` =
  username normalizado.
- **`categorias/{categoriaId}`** — nombre/orden, sembrado por los scripts de migración. No es la
  fuente de verdad de qué categorías existen — esa es el array `CATEGORIAS` en
  [`src/lib/categorias.ts`](../src/lib/categorias.ts) (ver
  [categorias-and-fixtures.md](categorias-and-fixtures.md)).
- **`jugadores/{jugadorId}`** — agregado global de tarjetas/minutos jugados por jugador, cruzando
  todos los partidos. `jugadorId` viene de `playerId()` en `src/lib/players.ts` (nombre
  normalizado, no el dorsal — un jugador cambia de dorsal entre semanas). Tiene `grupo:
  "superior"|"juveniles"` + `edadId?` para poder filtrar por plantel en `/estadisticas`. Se
  escribe/mergea desde 3 lugares en `src/lib/match/actions.ts` (`publicarIncidente`,
  `corregirTipoIncidente`, `terminarPartido`) — los tres etiquetan `grupo`/`edadId` vía
  `grupoDeCategoria()`. Si esta colección se ve rara (mezcla de planteles, jugadores de prueba),
  correr `npm run rebuild-jugadores` la reconstruye desde cero (ver
  [scripts.md](scripts.md)).
- **`partidos/{partidoId}`** — un documento por partido. `partidoId` = `partidoId(categoriaId,
  numeroFecha)` de `categorias.ts`, ej. `"m15-b-f3"`. Campo clave: `estado` (máquina de estados,
  ver [live-match-engine.md](live-match-engine.md)). `notaEspecial` reemplaza el
  resultado/"vs" en la UI sea cual sea el estado (ej. "Fecha libre", "Suspendido por tormenta
  eléctrica") — **no confundir con el estado `"suspendido"`**, que es exclusivamente un partido EN
  CURSO pausado por el Designado.

## Subcolecciones de `partidos/{partidoId}`

- **`liveState/state`** (doc único) — reloj: `periodo`, `clockRunning`, `clockAnchor`,
  `accumulatedSeconds`, más `motivoInterrupcion` si está `suspendido`. Se computa localmente en el
  cliente a partir del ancla (ver [live-match-engine.md](live-match-engine.md)) — no se lee de
  Firestore una vez por segundo.
- **`plantel/{jugadorId}`** — el roster de *ese* partido puntual (titular/suplente, en cancha,
  minutos jugados). Se puede crear un doc acá sobre la marcha para un jugador que no estaba en la
  formación inicial (buscador de "otro jugador" en Cambios) — ver
  `src/lib/match/actions.ts::publicarCambio`.
- **`incidentes/{id}`** — append-only, un doc por jugada (try, tarjeta, cambio, lesión, fin de
  tiempo, interrupción, walkover). `describirIncidente()` en `src/lib/incidentes.ts` es la única
  función que arma el texto legible — no duplicar esa lógica en componentes.

## Reglas de seguridad (`firestore.rules`)

Todas las escrituras pasan por Server Actions con el Admin SDK, que **no está sujeto a estas
reglas** — las reglas solo gobiernan el Client SDK (lecturas en vivo vía `onSnapshot`). Gotcha
documentado en el propio archivo: las reglas de Firestore son un OR lógico entre todos los
`match` que apliquen a un path — no existe "el más específico gana". Por eso cada colección
top-level tiene su propio bloque `match` sin solaparse, en vez de un catch-all
`match /{document=**}`.
