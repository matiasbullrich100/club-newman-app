// Corre lo mismo que el cron semanal (src/app/api/cron/actualizar-posiciones/route.ts), a mano --
// util para poblar Firestore la primera vez o para probar un mapeo nuevo en src/lib/torneos-urba.ts
// sin esperar al cron. Correr con: npm run actualizar-posiciones

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { actualizarPosiciones } = await import("../lib/posiciones/actualizar");

  const resultados = await actualizarPosiciones();
  for (const r of resultados) {
    console.log(r.ok ? `OK    ${r.categoriaId}` : `ERROR ${r.categoriaId}: ${r.error}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
