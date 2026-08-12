# `src/lib/match/`

Modelo completo (estados, reloj, minutos, walkover): [`docs/live-match-engine.md`](../../../docs/live-match-engine.md).

- **`actions.ts`** — todas las Server Actions que tocan un partido (`"use server"`, ~630 líneas,
  el archivo más denso del repo). Máquina de estados (`iniciarPartido`/`suspender`/`reanudar`/
  `cortar1T`/`iniciar2T`/`terminarPartido`), incidencias (`publicarIncidente`/
  `corregirTipoIncidente`/`eliminarIncidente`), cambios (`publicarCambio`), walkover
  (`registrarWalkover`), y el reset de partidos de prueba (`resetearPartidoDemo`). **Toda función
  nueva acá debe llamar `puedeOperarCategoria()` después de leer el partido**, dentro de la
  transacción — ver [`docs/auth-and-roles.md`](../../../docs/auth-and-roles.md).
- **`clock.ts`** — `elapsedSeconds()`/`minutoActual()`, funciones puras sobre `LiveState`. No
  tocan Firestore.
- **`minutes.ts`** — `calcularMinutos()`, pura y testeable sin Firestore. Se llama solo desde
  `terminarPartido()` en `actions.ts`.
- **`resumenSeccion.ts`** — `partidosEnVivoOTerminadosHoy()`, usado por las páginas de listado
  (home de cada división) para mostrar el banner de partidos en vivo.
