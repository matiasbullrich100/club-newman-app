import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS_SUPERIOR, partidoId } from "@/lib/categorias";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { partidosEnVivoOUltimoTerminado, partidosDeFechaExacta, proximasFechasDe, type ProximaFecha } from "@/lib/match/resumenSeccion";
import { tieneFixtureDivision, nombrePropioDivision } from "@/lib/fixtureDivision";
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

  // El bloque de resultados aparece/desaparece ENTERO, no categoria por categoria: si UNA
  // categoria jugo recien (ej. Pre F movida al jueves) o hay algo en vivo, TODO Plantel Superior
  // sigue mostrando su ultimo resultado -- no se rota a "Proxima Fecha" hasta que el grupo entero
  // deja de tener algo reciente Y estamos en la ventana de Proxima Fecha (jue 06:00 -> dom).
  const modoResultados =
    resumen.some((p) => ESTADOS_EN_VIVO.has(p.estado)) ||
    resumen.some((p) => (p.estado === "terminado" || p.notaEspecial) && !!p.fecha && diasDesdeEnArgentina(p.fecha) <= 3) ||
    !debeMostrarProximaFechaEnArgentina();

  // "Fresco" = en vivo, o (grupo en modo resultados y esta categoria tiene un resultado/Fecha libre).
  const fresco = (p: (typeof resumen)[number] | undefined) =>
    !!p && (ESTADOS_EN_VIVO.has(p.estado) || (modoResultados && (p.estado === "terminado" || !!p.notaEspecial)));

  // Banda "P. Ganados / P. Perdidos" arriba de todo en /superior. Cuenta TODOS los partidos
  // terminados de la fecha, incluidos los internos Newman vs Newman (ej. Pre F vs Pre G): cada
  // división es su propio doc de partido, así que el que ganó suma a Ganados y el que perdió a
  // Perdidos (pedido explícito -- antes se excluían como "amistosos"). Fuera de la ventana de
  // "Proxima Fecha" (dom→mié) muestra el último resultado de cada categoría; dentro de esa ventana
  // (jue 06:00→dom) solo cuenta los resultados FRESCOS (en vivo / recién jugados) -- si no, un
  // amistoso suelto entre semana reactivaba la banda con los resultados viejos de la fecha pasada.
  const jugadosSemana = resumen.filter((p) => p.estado === "terminado");
  const paraLaBanda = debeMostrarProximaFechaEnArgentina() ? jugadosSemana.filter(fresco) : jugadosSemana;
  const ganadosSemana = paraLaBanda.filter((p) => p.resultado.newman > p.resultado.rival).length;
  const empatadosSemana = paraLaBanda.filter((p) => p.resultado.newman === p.resultado.rival).length;
  const perdidosSemana = paraLaBanda.filter((p) => p.resultado.newman < p.resultado.rival).length;
  const mostrarResumenSemana = paraLaBanda.length > 0;

  // Rotulo "Fecha 20" al principio del cuadro -- para saber a que fecha corresponden estos
  // resultados sin tener que entrar a un partido (sobre todo cuando el bloque quedo mostrando la
  // fecha pasada un dia o dos de mas). Normalmente todo Plantel Superior juega la misma fecha; si
  // por reprogramaciones hay dos numeros distintos entre los contados, se muestra el rango.
  const numerosFecha = [...new Set(paraLaBanda.map((p) => p.numeroFecha).filter(Number.isFinite))].sort((a, b) => a - b);
  const rotuloFecha =
    numerosFecha.length === 0
      ? null
      : numerosFecha.length === 1
        ? `Fecha #${numerosFecha[0]}`
        : `Fechas #${numerosFecha[0]}-${numerosFecha[numerosFecha.length - 1]}`;

  const primeraResumen = resumen.find((p) => p.categoriaId === "primera");
  const mostrarProximaFechaPrimera = !fresco(primeraResumen) && debeMostrarProximaFechaEnArgentina();
  const proximasFechasPrimera = mostrarProximaFechaPrimera ? await proximasFechasDe("primera", 3) : [];

  // Todas las categorias arman su fila: fresca -> LiveBanner; si no, su proxima fecha ->
  // ProximaFechaRow. Primera tambien lleva su fila (con los botones Tabla/Fixt./Fixt Divis.)
  // aunque ademas tenga el cartel de "Proximas Fechas" arriba -- el cartel no tiene esos botones.
  const categoriasEnFilas = [...CATEGORIAS_SUPERIOR];
  const idsSinResumenFresco = categoriasEnFilas.map((c) => c.id).filter((id) => !fresco(resumen.find((p) => p.categoriaId === id)));
  const proximasPorCategoria = new Map<string, ProximaFecha>();
  await Promise.all(
    idsSinResumenFresco.map(async (id) => {
      const [proxima] = await proximasFechasDe(id, 1);
      if (proxima) proximasPorCategoria.set(id, proxima);
    })
  );

  // Partido interno Newman vs Newman (ej. "Newman G"): el equipo propio se muestra con el nombre
  // de la división ("Newman F") en vez de "Newman" a secas, para que el resumen diga
  // "Newman F - Newman G" y no "Newman - Newman G".
  const propioSi = (rival: string | undefined, catId: string) =>
    rival?.startsWith("Newman ") ? nombrePropioDivision(catId) : undefined;

  // Los partidos de mañana ya salen en su propio banner (PartidosMananaBanner, con horario y los
  // mismos botones Tabla/Fixt.) -- si además armáramos su ProximaFechaRow, la misma categoría
  // aparecería dos veces. Así que la fila de "Próxima Fecha" es solo para las categorías cuyo
  // próximo partido NO es mañana.
  const partidosManana = await partidosDeFechaExacta(CATEGORIAS_SUPERIOR.map((c) => c.id), mananaIsoEnArgentina());
  const idsJuegaManana = new Set(partidosManana.map((p) => p.categoriaId));

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
              nombreNewman={propioSi(p.rival, cat.id)}
              esPrueba={PARTIDOS_DEMO_IDS.includes(p.id)}
              posicionesHref={TORNEOS_URBA[cat.id] !== undefined ? `/posiciones/${cat.id}` : undefined}
              fixtureNewmanHref={`/categoria/${cat.id}/fixture`}
              fixtureDivisionHref={tieneFixtureDivision(cat.id) ? `/fixture/${cat.id}/division` : undefined}
            />
          ),
        };
      }
      if (idsJuegaManana.has(cat.id)) return null; // ya sale en PartidosMananaBanner
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
            nombreNewman={propioSi(proxima.rival, cat.id)}
            posicionesHref={TORNEOS_URBA[cat.id] !== undefined ? `/posiciones/${cat.id}` : undefined}
            fixtureHref={`/categoria/${cat.id}/fixture`}
            fixtureDivisionHref={tieneFixtureDivision(cat.id) ? `/fixture/${cat.id}/division` : undefined}
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
  // con horario, para verlas de un vistazo sin entrar categoria por categoria (partidosManana se
  // calculo mas arriba, tambien se usa para no duplicar la fila de "Proxima Fecha").
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

      {mostrarResumenSemana && (
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
            {rotuloFecha && <strong style={{ color: DORADO }}>{rotuloFecha}: </strong>}
            Partidos ganados: {ganadosSemana}
            {empatadosSemana > 0 && `, Partidos empatados: ${empatadosSemana}`}, Partidos perdidos: {perdidosSemana}
          </span>
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
