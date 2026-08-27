# Autenticación y roles

Detalle de archivos: [`src/lib/auth/CLAUDE.md`](../src/lib/auth/CLAUDE.md). Esto es el modelo.

## 4 tipos de acceso

1. **Libre** (sin login) — lee todo lo público (resultados, reloj, incidencias), no puede operar
   nada.
2. **`designado`** — cuenta con `categoriaId` fijo (ej. `"m15-b"`). Solo puede operar partidos de
   esa categoría puntual.
3. **`entrenador`** — solo lectura de `/estadisticas` (todas las divisiones), no opera partidos.
4. **`manager`** — el rol con más poder. Con `alcance` **ausente**, sin restricción: opera
   cualquier categoría (Plantel Superior + las 4 divisiones de Juveniles) y ve `/estadisticas`
   completo. Con `alcance` seteado a `"superior"` o a un `edadId` (`"m15"|"m16"|"m17"|"m19"`),
   queda acotado a esa división — mismos poderes que el manager sin restricción, pero solo ahí.
   Cuentas: `manager`/`pelu` (alcance `"superior"`) + `manm15`/`manm16`/`manm17`/
   `manm19` (clave = la edad, con alcance de su edad), más `admin`/`admin` (sin alcance, acceso total).

## Dónde vive la lógica de alcance

`puedeOperarCategoria(session, categoriaId)` y `puedeVerEstadisticas(session, grupoId)` en
[`src/lib/auth/scope.ts`](../src/lib/auth/scope.ts) son la **única** fuente de verdad — no
reimplementar este chequeo a mano en un componente o Server Action. Ese archivo existe separado de
`session.ts` a propósito: `session.ts` empieza con `import "server-only"` (usa `cookies()`), así
que no se puede importar desde un Client Component. `scope.ts` es puro (sin cookies, sin Admin
SDK) — lo importan tanto Server Actions/Components (vía el re-export en `session.ts`) como Client
Components (directo desde `@/lib/auth/scope`).

## Sesión

Cookie httpOnly con un JWT (`jose`), 24h, firmado con `AUTH_SECRET`. Payload:
`{ cuentaId, rol, username, categoriaId?, alcance? }`. `login()` en
[`src/lib/auth/actions.ts`](../src/lib/auth/actions.ts) verifica contra `cuentas/{cuentaId}` con
el Admin SDK (nunca expuesto al cliente) y compara el hash con `bcryptjs`
([`passwords.ts`](../src/lib/auth/passwords.ts)).

## Regla de oro al agregar una acción nueva que opera un partido

Toda Server Action en `src/lib/match/actions.ts` que toque un partido debe llamar
`puedeOperarCategoria(session, partido.categoriaId)` **después** de leer el partido (para saber su
`categoriaId` real) y **dentro** de la transacción/antes de escribir — nunca confiar en un
`categoriaId` que mande el cliente.
