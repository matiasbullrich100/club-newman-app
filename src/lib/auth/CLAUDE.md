# `src/lib/auth/`

Modelo completo (roles, alcance, sesión): [`docs/auth-and-roles.md`](../../../docs/auth-and-roles.md).

- **`scope.ts`** — `puedeOperarCategoria()` / `puedeVerEstadisticas()`. Puro (sin `cookies()`,
  sin `"server-only"`) para poder importarse desde Client Components. Cambios de alcance/permisos
  van acá, en un solo lugar.
- **`session.ts`** — `createSession`/`getSession`/`destroySession` (JWT en cookie httpOnly),
  `requireRole`, `requireDesignadoDeCategoria`. Re-exporta `puedeOperarCategoria`/
  `puedeVerEstadisticas` desde `scope.ts` para no romper los imports server-side existentes.
  **`import "server-only"` al tope — nunca importar este archivo desde un Client Component**
  (usar `scope.ts` directo en ese caso, o un `import type` si solo hace falta el tipo
  `SessionPayload`).
- **`actions.ts`** — `login()`/`logout()` (Server Actions, `"use server"`). `login()` es lo único
  que lee `cuentas/{id}` con el Admin SDK.
- **`passwords.ts`** — hash/verify con `bcryptjs`.
