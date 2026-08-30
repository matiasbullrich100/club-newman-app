// Baja de URBA los resultados de todos los cruces de cada zona con Fixt. Division y los guarda en
// resultadosDivision/{categoriaId}. Lo mismo que hace el cron semanal
// (src/app/api/cron/actualizar-posiciones/route.ts), a mano -- util para poblar Firestore la
// primera vez o para forzar una actualizacion sin esperar al cron.
// Correr con: npm run actualizar-resultados-division  [superior|juveniles]

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const arg = process.argv[2];
  const grupo = arg === "superior" || arg === "juveniles" ? arg : undefined;

  const { actualizarResultadosDivision } = await import("../lib/resultadosDivision/actualizar");
  const resultados = await actualizarResultadosDivision(grupo);
  for (const r of resultados) {
    console.log(r.ok ? `OK    ${r.categoriaId}  (${r.fechas} fechas con resultados)` : `ERROR ${r.categoriaId}: ${r.error}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
