# Motor de partido en vivo

Detalle de archivos: [`src/lib/match/CLAUDE.md`](../src/lib/match/CLAUDE.md). Esto es el modelo.

## Máquina de estados (`Partido.estado`)

```
programado → en_juego ⇄ suspendido → entretiempo → en_juego → terminado
                  ↓                                                ↑
                  └──────────── walkover (desde cualquier estado) ─┘
```

- **`programado`** — antes de arrancar. Puede tener plantel cargado o no.
- **`en_juego` / `entretiempo` / `suspendido`** — en curso. `suspendido` es una pausa por el
  Designado con motivo (`motivoInterrupcion: "medico"|"clima"`) — **no confundir** con
  `notaEspecial` en `Partido` (eso es para partidos que directamente no se jugaron, ver
  [data-model.md](data-model.md)).
- **`terminado`** — fin, para siempre. La página `/partido/[id]` bifurca en este campo: terminado
  o programado → vista estática (`PartidoHistorico`); el resto → motor en vivo (`PartidoLive`).
  Un partido `terminado` nunca vuelve a ser operable.

## Reloj: ancla + cómputo local, no polling

El servidor nunca "cuenta segundos". Cada acción de estado (`iniciarPartido`, `suspender`,
`reanudar`, `cortar1T`, `iniciar2T`) escribe un ancla (`clockAnchor: Timestamp`) y un acumulado
(`accumulatedSeconds`) en `liveState/state`. El cliente (`Cronometro.tsx`) calcula localmente con
un `setInterval` de 1s:

```
elapsedSeconds = accumulatedSeconds + (clockRunning ? (Date.now() - clockAnchor) / 1000 : 0)
```

Firestore solo recibe una lectura por cambio de estado real, no una por segundo — importante para
no gastar cuota con muchos espectadores conectados a la vez (ver
`src/lib/match/clock.ts`).

## Minutos jugados

`calcularMinutos()` en `src/lib/match/minutes.ts` es una función pura (sin Firestore) que recorre
el plantel y los cambios de cada período por separado, y se llama solo desde
`terminarPartido()`. Si un jugador se agregó sobre la marcha (buscador de "otro jugador" en
Cambios, doc creado on-the-fly en `plantel/`), igual se le calculan minutos normalmente — no
necesita tratamiento especial.

## Corrección de incidencias

`corregirTipoIncidente` / `eliminarIncidente` solo permiten moverse **dentro de la misma familia**
(`FAMILIA_PUNTOS` o `FAMILIA_TARJETA`, en `src/lib/incidentes.ts`) — cambiar de familia dejaría
una incidencia en un estado inconsistente (una tarjeta no tiene puntos, un cambio no tiene
`jugadorId` de esta forma). `cambio`, `fin_1t`, `fin_2t`, `interrupcion_*` y `walkover` no
pertenecen a ninguna familia — no son corregibles/eliminables por diseño (son decisiones
terminales o estructurales, no "una jugada suelta").

## Walkover

`registrarWalkover(partidoId, equipoSinPrimeraLinea)` en `src/lib/match/actions.ts` — el equipo
que no presenta 3 jugadores de primera línea (pilar/hooker/pilar) pierde 0-8. Funciona desde
cualquier estado no-terminado (incluso `programado`, antes de arrancar). Termina el partido en el
acto y no calcula minutos jugados (un walkover no se llegó a jugar).

## Partidos de prueba (whitelist)

`PARTIDOS_DEMO_IDS` (duplicado a propósito en `src/lib/match/actions.ts` y
`src/app/partido/[partidoId]/page.tsx`) es la única lista de partidos que `resetearPartidoDemo()`
puede tocar — nunca debe poder resetear un partido real, pase lo que pase con el argumento que
llegue del cliente. Hoy: `demo-partido-1/2/3` (Fase 1) + `pre-a-test-cambio` (invisible, solo por
URL directa, para probar el buscador de cambios sin arriesgar datos reales).
