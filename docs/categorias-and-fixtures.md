# Categorías, plantel y fixture

Fuente de verdad: [`src/lib/categorias.ts`](../src/lib/categorias.ts) — todo lo demás lee de ahí,
no hay queries a Firestore para saber qué categorías existen.

## Dos planteles, un solo array

`CATEGORIAS` tiene las 11 categorías de **Plantel Superior** (`grupo: "superior"`, IDs fijos
como `"pre-a"`, `"m-22"`) y las de **Juveniles** (`grupo: "juveniles"`, IDs como `"m15-a"`, con
`edadId: "m15"` agrupándolas por edad — M15/M16/M17/M19). Cada edad de Juveniles tiene sus propios
equipos (letras A/B/C/D) y su propio fixture, separado del de Plantel Superior. `EDADES` es la
lista de las 4 divisiones (algunas sin equipos cargados todavía).

## IDs deterministas

`partidoId(categoriaId, numeroFecha)` → `"m15-b-f3"`. No hay ID autogenerado ni query para
resolver un partido — home/vista-de-fecha hacen un solo `adminDb.getAll(...)` con los IDs ya
conocidos, en orden.

## "Newman" no alcanza en Juveniles

Puede haber hasta 4 equipos de Newman de la misma edad jugando la misma fecha, así que hace falta
aclarar la letra. `nombreNewmanDe(categoriaId)` devuelve `"Newman"` (Plantel Superior) o
`"Newman A"/"Newman B"/...` (Juveniles) — se usa en resúmenes de partido (`MatchupText`) y en la
descripción de incidencias/cambios (`describirIncidente`). Threading: el componente/página que
arma el texto recibe `nombreNewman` como prop opcional (default `"Newman"`), calculado una sola
vez con `nombreNewmanDe()` y pasado hacia abajo — no recalcular en cada componente hijo.

## Identidad de jugador

`playerId(nombre)` en `src/lib/players.ts` — nombre normalizado (sin tildes, palabras ordenadas
alfabéticamente), **no el dorsal** (un jugador cambia de dorsal entre semanas y categorías). Es el
ID de doc tanto en `jugadores/{id}` como en `partidos/{id}/plantel/{id}`. `splitNombre()` separa
apellido/nombre para mostrar y ordenar (usa la coma si existe; si no, la última palabra es el
nombre de pila).
