# Catálogo de scripts (`npm run ...`)

Todos viven en `src/scripts/`, corren con `tsx` y cargan `.env.local` a mano (el `import` de
`firebase-admin` se hace con `await import()` después de `config()`, porque un `import` estático
se hoistea antes de que `dotenv` corra). La mayoría son idempotentes (pisan el doc si ya existe),
pero algunos son destructivos — están marcados abajo.

| Script | Qué hace | Cuándo correrlo |
|---|---|---|
| `seed` | Categoría/partido/cuentas de prueba mínimas (Fase 1) | Una sola vez, al bootstrapear un ambiente nuevo |
| `seed-demo-extra` | 2 partidos demo más (M-22, Pre A) | Igual que `seed` |
| `reset-demo` | Resetea `demo-partido-1` a 0-0 vía CLI | Alternativa al botón "Resetear" en la UI |
| `seed-designados` | Cuentas Designado de Plantel Superior (usuario = id sin guion, ej. `prea`, `m22`; `intermedia` → `inter`; clave `dalebordo`). Borra los docs con el nombre viejo (con espacio). | Una sola vez |
| `seed-designados-juveniles` | Cuentas Designado de Juveniles (usuario=clave, ej. `m15b`/`m15b`) | Al sumar una división nueva |
| `seed-managers-juveniles` | Cuentas Manager por división (`manm15`/`m15`, etc., `alcance` seteado). Borra los docs con el nombre viejo (`managerm15`). | Una sola vez |
| `seed-test-cambio` | Recrea `pre-a-test-cambio` (partido de prueba invisible, plantel completo) | Si hace falta reconstruirlo desde cero (normalmente alcanza con el botón "Resetear" de su propia página) |
| `migrate-historical` | Migra las 26 fechas × 11 categorías de Plantel Superior desde los JSON curados en `Downloads/handoff/` | Ya corrido — no hace falta re-correr salvo que cambien los datos fuente |
| `migrate-m15-fecha1` / `migrate-m15-fecha2` | Cargan el fixture + formaciones de una fecha puntual de M15 | Patrón a copiar para cargar fechas nuevas de Juveniles |
| `migrate-m16-m17-m19-fecha1` | Resultados de fecha 1 de M16/M17/M19 (transcriptos a mano de una imagen del club, sin formaciones) | Ya corrido |
| `migrate-m16-m17-m19-fixture` | Fixture de fechas 2 a 11 de M16/M17/M19 (sin resultado todavía) | Ya corrido — patrón a copiar para cargar el fixture de una temporada nueva |
| **`rebuild-jugadores`** | **Destructivo**: borra TODA la colección `jugadores/` y la repuebla desde el histórico (Superior) + partidos `terminado` en Firestore (Juveniles) | Solo si la colección se mezcló/ensució (ver [data-model.md](data-model.md)) — no es parte del flujo normal |
| `deploy-rules` | Sube `firestore.rules` | Después de tocar ese archivo |

## Antes de correr algo destructivo

`rebuild-jugadores` borra y reconstruye una colección entera. Si se agregan más divisiones de
Juveniles con partidos ya jugados, este script las toma automáticamente (recorre partidos
`terminado` en Firestore, no una lista hardcodeada) — no hace falta tocarlo, pero sí conviene
avisar antes de correrlo en producción.
