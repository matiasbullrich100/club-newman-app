// Borra del todo las instancias de practica de la cuenta "demo" que ya vencieron (2hs desde que
// se crearon/renovaron -- ver lib/match/practicaInstancias.ts). Lo hace solo el cron
// (.github/workflows/limpiar-practicas-demo.yml, 1x/dia); este script es para forzarlo a mano sin
// esperar. Correr con: npx tsx src/scripts/limpiar-practicas-demo.ts

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { limpiarInstanciasVencidas } = await import("../lib/match/practicaInstancias");
  const { borrados } = await limpiarInstanciasVencidas();
  console.log(`Listo: ${borrados} instancia(s) de practica vencida(s) borrada(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
