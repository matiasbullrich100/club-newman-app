import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS, CATEGORIAS_JUVENILES, nombreNewmanDe, partidoId as partidoIdDe } from "@/lib/categorias";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { partidosEnVivoOUltimoTerminado, proximaFechaPorCategoria } from "@/lib/match/resumenSeccion";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import { debeMostrarProximaFechaEnArgentina, diasDesdeEnArgentina } from "@/lib/fecha";
import { PARTIDOS_DEMO_IDS } from "@/lib/partidosPrueba";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import LiveBanner from "@/components/LiveBanner";
import ProximaFechaRow from "@/components/ProximaFechaRow";
import { DORADO_SUAVE } from "@/lib/colors";

export default async function JuvenilesPage() {
  const session = await getSession();

  // Mismo patron que /superior y /juveniles/[edadId], pero con las 4 divisiones juntas -- para no
  // tener que entrar a cada edad para ver que se esta jugando/se jugo hoy (antes solo aparecia un
  // nivel mas abajo, division por division).
  const resumen = await partidosEnVivoOUltimoTerminado(CATEGORIAS_JUVENILES.map((c) => c.id), session);

  // Grilla de equipos al pie: M19 primero, M15 al final (orden pedido explicitamente, al reves
  // del orden de CATEGORIAS_JUVENILES que va de menor a mayor edad).
  const RANGO_EDAD_DESC: Record<string, number> = { m19: 0, m17: 1, m16: 2, m15: 3 };
  const equiposOrdenados = [...CATEGORIAS_JUVENILES].sort(
    (a, b) => RANGO_EDAD_DESC[a.edadId] - RANGO_EDAD_DESC[b.edadId] || a.orden - b.orden
  );

  // El bloque de resultados aparece/desaparece ENTERO, no equipo por equipo: si UN equipo jugo
  // recien (ej. M17 movido al viernes) o hay algo en vivo, TODAS las Juveniles siguen mostrando
  // su ultimo resultado -- no se rota a "Proxima Fecha" hasta que el grupo entero deja de tener
  // algo reciente Y estamos en la ventana de Proxima Fecha.
  const ESTADOS_EN_VIVO = new Set(["en_juego", "entretiempo", "suspendido"]);
  const modoResultados =
    resumen.some((p) => ESTADOS_EN_VIVO.has(p.estado)) ||
    resumen.some((p) => (p.estado === "terminado" || p.notaEspecial) && !!p.fecha && diasDesdeEnArgentina(p.fecha) >= 0 && diasDesdeEnArgentina(p.fecha) <= 3) ||
    !debeMostrarProximaFechaEnArgentina();
  // El chequeo de fecha propio (no solo "modoResultados") evita que una categoria SIN nada
  // reciente muestre su ultimo resultado viejo solo porque OTRA categoria del grupo disparo el
  // modo (ver el mismo comentario en /superior/page.tsx).
  const fresco = (p: (typeof resumen)[number]) =>
    ESTADOS_EN_VIVO.has(p.estado) ||
    (modoResultados && (p.estado === "terminado" || !!p.notaEspecial) && !!p.fecha && diasDesdeEnArgentina(p.fecha) >= 0 && diasDesdeEnArgentina(p.fecha) <= 3);
  const idsSinResumenFresco = equiposOrdenados
    .map((e) => e.id)
    .filter((id) => !resumen.some((p) => p.categoriaId === id && fresco(p)));
  const proximasPorCategoria = debeMostrarProximaFechaEnArgentina()
    ? await proximaFechaPorCategoria(idsSinResumenFresco)
    : new Map();

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header rightLabel="Juveniles" logo="urba" rightLabelShift={14} />

      {equiposOrdenados
        .map((equipo) => {
          const p = resumen.find((r) => r.categoriaId === equipo.id);
          const proxima = proximasPorCategoria.get(equipo.id);
          // Si el resultado esta viejo Y hay una proxima fecha para mostrar en su lugar, esta gana --
          // si no hay proxima (ej. temporada terminada), se sigue mostrando el ultimo resultado aunque
          // este viejo, mejor eso que nada.
          if (p && !(proxima && !fresco(p))) {
            return {
              esVivo: ESTADOS_EN_VIVO.has(p.estado),
              node: (
                <LiveBanner
                  key={p.id}
                  partidoId={p.id}
                  categoriaNombre={CATEGORIAS.find((c) => c.id === p.categoriaId)?.nombre ?? p.categoriaId}
                  inicial={{ esLocal: p.esLocal, rival: p.rival, estado: p.estado, resultado: p.resultado, notaEspecial: p.notaEspecial }}
                  nombreNewman={nombreNewmanDe(p.categoriaId)}
                  esPrueba={PARTIDOS_DEMO_IDS.includes(p.id)}
                  posicionesHref={TORNEOS_URBA[p.categoriaId] !== undefined ? `/posiciones/${p.categoriaId}` : undefined}
                  fixtureNewmanHref={`/juveniles/${equipo.edadId}/equipo/${p.categoriaId}`}
                  fixtureDivisionHref={tieneFixtureDivision(p.categoriaId) ? `/fixture/${p.categoriaId}/division` : undefined}
                />
              ),
            };
          }
          if (!proxima) return null;
          return {
            esVivo: false,
            node: (
              <ProximaFechaRow
                key={equipo.id}
                partidoId={partidoIdDe(equipo.id, proxima.numeroFecha)}
                categoriaNombre={equipo.nombre}
                proxima={proxima}
                nombreNewman={nombreNewmanDe(equipo.id)}
                posicionesHref={TORNEOS_URBA[equipo.id] !== undefined ? `/posiciones/${equipo.id}` : undefined}
                fixtureHref={`/juveniles/${equipo.edadId}/equipo/${equipo.id}`}
                fixtureDivisionHref={tieneFixtureDivision(equipo.id) ? `/fixture/${equipo.id}/division` : undefined}
              />
            ),
          };
        })
        // Los partidos EN VIVO van primero (cualquier categoria), sin importar el orden de edad/letra
        // -- lo que esta pasando ahora es lo mas importante de esta pantalla. Dentro de cada grupo
        // (en vivo / resto) se mantiene el orden de mas arriba (ordenar es estable).
        .filter((f): f is NonNullable<typeof f> => f !== null)
        .sort((a, b) => Number(b.esVivo) - Number(a.esVivo))
        .map((f) => f.node)}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 20 }}>
        {equiposOrdenados.map((equipo) => (
          <Link
            key={equipo.id}
            href={`/juveniles/${equipo.edadId}/equipo/${equipo.id}`}
            style={{
              background: "linear-gradient(155deg, rgba(255,255,255,.05), rgba(0,0,0,.15))",
              border: "1px solid rgba(226,197,120,.25)",
              borderRadius: 8,
              padding: "8px 6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <div style={{ fontWeight: 600, letterSpacing: 0.3, fontSize: "0.72rem", textTransform: "uppercase", color: DORADO_SUAVE }}>
              {equipo.nombre}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
