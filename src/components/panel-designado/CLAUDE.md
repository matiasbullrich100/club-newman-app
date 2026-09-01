# `src/components/panel-designado/`

Panel de control del Designado durante un partido en vivo. Motor/acciones que llama:
[`docs/live-match-engine.md`](../../../docs/live-match-engine.md).

- **`PanelDesignado.tsx`** — orquestador: botones de estado (Iniciar/Interrumpir/Final 1er
  tiempo/Terminar/Walkover), cada uno con su propio paso de confirmación o elección (motivo de
  interrupción, equipo del walkover) antes de ejecutar. Renderiza `CargaIncidencia` +
  `IncidentesFeed` + `CargaCambio` cuando el partido está `en_juego`.
- **`CargaIncidencia.tsx`** — flujo tipo → equipo → jugador → confirmar para try/tarjeta/lesión.
  `TIPOS` es una lista curada a mano (no todo `TipoIncidente` es seleccionable acá — `cambio`,
  `fin_1t`, `fin_2t`, `interrupcion_*` y `walkover` tienen su propio flujo dedicado, no pasan por
  este picker genérico). **Try / Try Scrum EN VIVO**: se publica el try apenas se elige el equipo
  (rival) o el jugador (Newman) — sin esperar la conversión — y recién después se pregunta
  "¿convirtió?"; la conversión va como incidencia aparte (`publicarSoloTry` / `publicarSoloConversion`).
  Mientras un try de Newman espera que se elija el jugador, `onBloqueoChange(true)` avisa al
  `PanelDesignado`, que bloquea el resto (estados, cambios) hasta que se elige o se cancela. En
  corrección post-partido (`soloEnCancha=false`) sigue el circuito viejo (try + conversión juntos
  al final, con paso "cuándo" para el minuto).
- **`CargaCambio.tsx`** — **entra → sale**, y en vivo se publica ahí mismo (los suplentes se ven
  calentando, se sabe antes quién entra que quién sale). El paso "entra" incluye un buscador
  ("Buscar otro jugador") sobre el plantel completo del club (prop `plantelCompleto`, filtrado
  por `grupo`/`edadId` en la página que lo llama) para meter a alguien que no estaba en la
  formación inicial subida — crea su doc en `plantel/` sobre la marcha si hace falta. En
  corrección post-partido (`soloEnCancha=false`) sigue con paso "cuándo" (minuto) + "confirmar".
- **`types.ts`** — `RosterJugador` (roster de este partido) y `JugadorBusqueda` (entrada liviana
  del plantel completo, solo para el buscador).
- **`estilos.ts`** — botones grandes a propósito: el público que carga esto en vivo (Designados,
  muchos mayores de 50) usa el celular con el pulgar y con poca luz de cancha.
