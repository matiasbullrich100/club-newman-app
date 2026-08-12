# Índice de documentación — Club Newman App

Cada archivo de acá cubre un tema transversal (no ligado a una sola carpeta). Leé solo el que
necesites para la tarea actual — cargarlos todos de entrada consume contexto de más.

- [data-model.md](data-model.md) — Colecciones de Firestore, forma de cada documento, reglas de seguridad.
- [auth-and-roles.md](auth-and-roles.md) — Los 4 tipos de acceso, alcance de manager por división, sesión JWT.
- [live-match-engine.md](live-match-engine.md) — Máquina de estados del partido, reloj, minutos jugados, incidencias, walkover.
- [categorias-and-fixtures.md](categorias-and-fixtures.md) — Plantel Superior vs Juveniles, IDs de categoría/partido, fixture.
- [scripts.md](scripts.md) — Catálogo de `npm run ...`: qué hace cada script y cuándo (no) correrlo.

## Documentación de carpeta

Estas se cargan solas cuando trabajás con archivos de esa carpeta — no hace falta abrirlas a mano:

- `src/lib/auth/CLAUDE.md` — mapa de archivos de auth, ver [auth-and-roles.md](auth-and-roles.md) para el modelo completo.
- `src/lib/match/CLAUDE.md` — mapa de archivos del motor de partido, ver [live-match-engine.md](live-match-engine.md) para el modelo completo.
- `src/components/panel-designado/CLAUDE.md` — flujo de UI del panel del Designado.

## Qué NO está documentado acá (a propósito)

Convenciones de código, estilos, estructura de carpetas genérica: se entienden leyendo el código,
no hace falta un doc aparte. Historial de decisiones/cambios: está en los mensajes de commit
(`git log`), no se duplica acá.
