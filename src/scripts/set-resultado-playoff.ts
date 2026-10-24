// Carga A MANO el resultado de una semifinal de playoff (por ejemplo la de otro club, que no esta en nuestra app).
// Se guarda en playoff/{categoriaId}.manual (el cron de URBA no lo toca) y /playoff lo usa en Clasificados y
// Finalistas: manda sobre URBA. Los partidos de Newman no hace falta cargarlos: se toman solos del resultado
// de nuestra app apenas el partido termina (ver playoffResuelto en src/lib/playoffFinalistas.ts).
//
// Uso (clubes como se ven en pantalla: Newman, SIC, CUBA, Alumni, Los Tilos, Hindú, BACRC, CASI...):
//   npx tsx src/scripts/set-resultado-playoff.ts <categoriaId> "<club>" <goles> "<club>" <goles>
//   npx tsx src/scripts/set-resultado-playoff.ts pre-d SIC 24 Newman 17
//   npx tsx src/scripts/set-resultado-playoff.ts intermedia CASI Alumni --gano CASI   (solo se sabe quien gano; el marcador
//       se completa despues con el comando de arriba, que reemplaza a este)
//   npx tsx src/scripts/set-resultado-playoff.ts pre-d SIC Newman --borrar      (saca el resultado manual)
// Con DRY_RUN=1 solo muestra lo que haria.

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");
  const { clavePartido, CATEGORIAS_FINALISTAS } = await import("../lib/playoffFinalistas");
  type PlayoffDoc = import("../lib/playoffFinalistas").PlayoffDoc;

  const args = process.argv.slice(2);
  const borrar = args.includes("--borrar");
  const iGano = args.indexOf("--gano");
  const gano = iGano >= 0 ? args[iGano + 1] : undefined;
  if (iGano >= 0 && !gano) throw new Error("Falta el club que gano: --gano <club>");
  const posicionales = args.filter((a, i) => a !== "--borrar" && a !== "--gano" && !(iGano >= 0 && i === iGano + 1));
  // Con --gano no hay goles: <categoria> <clubA> <clubB>. Con --borrar tampoco. Si no: <categoria> <clubA> <golesA> <clubB> <golesB>.
  const sinGoles = borrar || iGano >= 0;
  const categoriaId = posicionales[0];
  const clubA = posicionales[1];
  const golesA = sinGoles ? undefined : posicionales[2];
  const clubB = sinGoles ? posicionales[2] : posicionales[3];
  const golesB = sinGoles ? undefined : posicionales[4];
  if (!categoriaId || !CATEGORIAS_FINALISTAS.includes(categoriaId)) {
    throw new Error(`Categoria invalida "${categoriaId}". Opciones: ${CATEGORIAS_FINALISTAS.join(", ")}`);
  }

  const ref = adminDb.collection("playoff").doc(categoriaId);
  const snap = await ref.get();
  const doc = snap.exists ? (snap.data() as PlayoffDoc) : undefined;
  if (!doc?.semis?.length) throw new Error(`playoff/${categoriaId} todavia no tiene semifinales (corre antes actualizar-playoff.ts).`);

  const a = clubA;
  const b = clubB;
  const clave = clavePartido(a, b);
  const semi = doc.semis.find((p) => clavePartido(p.local, p.visitante) === clave);
  if (!semi) {
    throw new Error(`No hay una semifinal ${a} vs ${b} en ${categoriaId}. Semifinales: ${doc.semis.map((p) => `${p.local} vs ${p.visitante}`).join(" | ")}`);
  }

  if (borrar) {
    console.log(`${categoriaId}: se saca el resultado manual de ${semi.local} vs ${semi.visitante}`);
    if (!dryRun) await ref.update({ [`manual.${clave}`]: FieldValue.delete() });
    return;
  }

  if (gano) {
    const ganador = [semi.local, semi.visitante].find((c) => c.toLowerCase() === gano.toLowerCase());
    if (!ganador) throw new Error(`"${gano}" no juega esa semifinal (${semi.local} vs ${semi.visitante}).`);
    console.log(`${categoriaId}: ${semi.local} vs ${semi.visitante} -- gano ${ganador} (sin marcador todavia)`);
    if (!dryRun) {
      await ref.set(
        { manual: { [clave]: { local: semi.local, visitante: semi.visitante, golesLocal: 0, golesVisitante: 0, jugado: true, sinMarcador: true, ganador } } },
        { merge: true }
      );
    }
    return;
  }
  const ga = Number(golesA);
  const gb = Number(golesB);
  if (!Number.isInteger(ga) || !Number.isInteger(gb) || ga < 0 || gb < 0) throw new Error("Los goles tienen que ser numeros enteros.");
  // Se guarda con el local/visitante de URBA (para que el marcador quede del lado correcto).
  const localEsA = semi.local.toLowerCase() === a.toLowerCase();
  const partido = {
    local: semi.local,
    visitante: semi.visitante,
    golesLocal: localEsA ? ga : gb,
    golesVisitante: localEsA ? gb : ga,
    jugado: true,
  };
  console.log(`${categoriaId}: ${partido.local} ${partido.golesLocal} - ${partido.golesVisitante} ${partido.visitante}${semi.jugado ? "  (URBA ya lo tiene cargado; manda este)" : ""}`);
  if (partido.golesLocal === partido.golesVisitante) console.warn("OJO: empate -- sin ganador no se define el finalista.");
  if (!dryRun) await ref.set({ manual: { [clave]: partido } }, { merge: true });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
