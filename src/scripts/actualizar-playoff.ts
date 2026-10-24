// Baja de URBA las semifinales / final del playoff (Inter, Pre A a F y M-22) y completa la instancia
// "Finalistas" de /playoff (playoff/{categoriaId} en Firestore). Es lo mismo que hace el cron
// (.github/workflows/actualizar-playoff.yml); sirve para correrlo a mano.
// Correr con: npx tsx src/scripts/actualizar-playoff.ts

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { actualizarPlayoffFinalistas, finalistasPlayoff } = await import("../lib/playoffFinalistas");
  const resultados = await actualizarPlayoffFinalistas();
  for (const r of resultados) console.log(r.categoriaId.padEnd(10), r.ok ? `ok (${r.finalistas} finalista/s definidos)` : `ERROR: ${r.error}`);
  console.log("");
  for (const f of await finalistasPlayoff())
    console.log(f.categoria.padEnd(8), f.finalistas.map((x) => x?.club ?? "Por definir").join("  vs  "));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
