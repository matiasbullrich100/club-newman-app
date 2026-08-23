import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS_SUPERIOR, partidoId } from "@/lib/categorias";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { partidosEnVivoOUltimoTerminado, partidosDeFechaExacta, proximasFechasDe, type ProximaFecha } from "@/lib/match/resumenSeccion";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import { debeMostrarProximaFechaEnArgentina, diasDesdeEnArgentina, mananaIsoEnArgentina } from "@/lib/fecha";
import { PARTIDOS_DEMO_IDS, pruebasVisiblesPara } from "@/lib/partidosPrueba";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import LiveBanner from "@/components/LiveBanner";
import ProximaFechaRow from "@/components/ProximaFechaRow";
import ProximaFechaBanner from "@/components/ProximaFechaBanner";
import PartidosMananaBanner from "@/components/PartidosMananaBanner";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

const ESTADOS_EN_VIVO = new Set(["en_juego", "entretiempo", "suspendido"]);

// Primera pantalla de la division: solo lo que se esta jugando/se jugo hoy + el selector de
// categoria -- el fixture completo (jugado y por jugar) vive en /categoria/[categoriaId]/fixture,
// no aca. El selector de categoria lleva a /categoria/[categoriaId], que ya muestra la formacion
// del proximo partido directo.
export default async function PlantelSuperiorPage() {
  const [session, resumenCompleto] = await Promise.all([
    getSession(),
    partidosEnVivoOUltimoTerminado(CATEGORIAS_SUPERIOR.map((c) => c.id)),
  ]);
  // Algunas categorias de prueba (ej. "pre-a", "m-22") coinciden con categorias reales, asi que
  // un partido de PARTIDOS_DEMO_IDS puede aparecer en este mismo banner -- se marca "PRUEBA" y,
  // pasado el corte, se oculta para quien no sea el Administrador (ver partidosPrueba.ts).
  const pruebasVisibles = pruebasVisiblesPara(session);
  const resumen = resumenCompleto.filter((p) => pruebasVisibles || !PARTIDOS_DEMO_IDS.includes(p.id));

  // "Fresco" = en vivo, o terminado/Fecha libre hace <=3 dias -- una categoria que TODAVIA no
  // arranco su partido de esta semana no cuenta como fresca aunque otra categoria si este en vivo
  // (antes, si CUALQUIER categoria arrancaba, las demas se quedaban pegadas mostrando el resultado
  // de la semana pasada en vez de la proxima fecha).
  const fresco = (p: (typeof resumen)[number] | undefined) =>
    !!p && (ESTADOS_EN_VIVO.has(p.estado) || ((p.estado === "terminado" || p.notaEspecial) && !!p.fecha && diasDesdeEnArgentina(p.fecha) <= 3));

  // Mismo resumen "Ganados/Empatados/Perdidos" + "Full House" que ya existe en /fecha/[n], pero
  // arriba de todo en /superior -- usa el ultimo resultado de cada categoria (el mismo `resumen`
  // de mas arriba), asi que rota solo a la fecha nueva cuando esa categoria termina su partido.
  const jugadosSemana = resumen.filter((p) => p.estado === "terminado");
  const ganadosSemana = jugadosSemana.filter((p) => p.resultado.newman > p.resultado.rival).length;
  const perdidosSemana = jugadosSemana.filter((p) => p.resultado.newman < p.resultado.rival).length;
  const fullHouseSemana = jugadosSemana.length > 0 && ganadosSemana === jugadosSemana.length;

  const primeraResumen = resumen.find((p) => p.categoriaId === "primera");
  const mostrarProximaFechaPrimera = !fresco(primeraResumen) && debeMostrarProximaFechaEnArgentina();
  const proximasFechasPrimera = mostrarProximaFechaPrimera ? await proximasFechasDe("primera", 3) : [];

  // El resto de las categorias (Primera tambien, si no le toca el cartel de 3 fechas de arriba):
  // fresca -> LiveBanner; si no, su propia proxima fecha -> ProximaFechaRow.
  const categoriasEnFilas = CATEGORIAS_SUPERIOR.filter((cat) => !(cat.id === "primera" && mostrarProximaFechaPrimera));
  const idsSinResumenFresco = categoriasEnFilas.map((c) => c.id).filter((id) => !fresco(resumen.find((p) => p.categoriaId === id)));
  const proximasPorCategoria = new Map<string, ProximaFecha>();
  await Promise.all(
    idsSinResumenFresco.map(async (id) => {
      const [proxima] = await proximasFechasDe(id, 1);
      if (proxima) proximasPorCategoria.set(id, proxima);
    })
  );

  const filas = categoriasEnFilas
    .map((cat) => {
      const p = resumen.find((r) => r.categoriaId === cat.id);
      if (p && fresco(p)) {
        return {
          esVivo: ESTADOS_EN_VIVO.has(p.estado),
          node: (
            <LiveBanner
              key={p.id}
              partidoId={p.id}
              categoriaNombre={cat.nombre}
              inicial={{ esLocal: p.esLocal, rival: p.rival, estado: p.estado, resultado: p.resultado, notaEspecial: p.notaEspecial }}
              esPrueba={PARTIDOS_DEMO_IDS.includes(p.id)}
              posicionesHref={TORNEOS_URBA[cat.id] !== undefined ? `/posiciones/${cat.id}` : undefined}
              fixtureNewmanHref={`/categoria/${cat.id}/fixture`}
              fixtureDivisionHref={tieneFixtureDivision(cat.id) ? `/fixture/${cat.id}/division` : undefined}
            />
          ),
        };
      }
      const proxima = proximasPorCategoria.get(cat.id);
      if (!proxima) return null;
      return {
        esVivo: false,
        node: (
          <ProximaFechaRow
            key={cat.id}
            partidoId={partidoId(cat.id, proxima.numeroFecha)}
            categoriaNombre={cat.nombre}
            proxima={proxima}
            posicionesHref={TORNEOS_URBA[cat.id] !== undefined ? `/posiciones/${cat.id}` : undefined}
            fixtureHref={`/categoria/${cat.id}/fixture`}
          />
        ),
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  // Los partidos EN VIVO van siempre arriba del todo (cualquier categoria) -- el cartel de las 3
  // proximas fechas de Primera y el resto de las filas van despues.
  const filasVivo = filas.filter((f) => f.esVivo);
  const filasResto = filas.filter((f) => !f.esVivo);

  // Resumen "Partidos de Mañana" -- todas las categorias de Plantel Superior que juegan manana,
  // con horario, para verlas de un vistazo sin entrar categoria por categoria.
  const partidosManana = await partidosDeFechaExacta(CATEGORIAS_SUPERIOR.map((c) => c.id), mananaIsoEnArgentina());
  const partidosMananaConNombre = partidosManana.map((p) => ({
    categoriaId: p.categoriaId,
    categoriaNombre: CATEGORIAS_SUPERIOR.find((c) => c.id === p.categoriaId)?.nombre ?? p.categoriaId,
    partido: p,
    posicionesHref: TORNEOS_URBA[p.categoriaId] !== undefined ? `/posiciones/${p.categoriaId}` : undefined,
    fixtureNewmanHref: `/categoria/${p.categoriaId}/fixture`,
    fixtureDivisionHref: tieneFixtureDivision(p.categoriaId) ? `/fixture/${p.categoriaId}/division` : undefined,
  }));

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header rightLabel="Plantel Superior" />

      {jugadosSemana.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            fontSize: "0.95rem",
            fontWeight: 700,
            color: DORADO_SUAVE,
            background: "linear-gradient(160deg, rgba(226,197,120,.14), rgba(0,0,0,.15))",
            border: `1px solid ${DORADO}`,
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          <span>
            P. Gan. {ganadosSemana} · P. Perd. {perdidosSemana}
          </span>
          {fullHouseSemana && <span style={{ color: DORADO, fontWeight: 800, letterSpacing: 1.5 }}>FULL HOUSE</span>}
        </div>
      )}

      {filasVivo.map((f) => f.node)}

      {mostrarProximaFechaPrimera && proximasFechasPrimera.length > 0 && <ProximaFechaBanner proximas={proximasFechasPrimera} />}

      {filasResto.map((f) => f.node)}

      <PartidosMananaBanner partidos={partidosMananaConNombre} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 16 }}>
        {CATEGORIAS_SUPERIOR.map((cat) => (
          <Link
            key={cat.id}
            href={`/categoria/${cat.id}`}
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
              {cat.nombre}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
