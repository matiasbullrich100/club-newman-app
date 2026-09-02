import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS, grupoDeCategoria, partidoId } from "@/lib/categorias";
import { numeroFechasDivisionDe, tieneFixtureDivision } from "@/lib/fixtureDivision";
import { fixtureDivisionConResultados } from "@/lib/resultadosDivision/consultar";
import { formatFecha, fechaFixtureYaPaso } from "@/lib/fecha";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import TiraEquipos from "@/components/TiraEquipos";
import { equiposParaTira } from "@/lib/tiraEquipos";
import { DORADO, DORADO_SUAVE, NEGRO_JUGADA } from "@/lib/colors";

// Fixture completo de la fecha para TODA la division (los 7 partidos), no solo el de Newman --
// datos cargados a mano desde el PDF de URBA (ver src/lib/fixtureDivision.ts). Resalta la fila de
// Newman y deja navegar fecha a fecha con Anterior/Siguiente.
export default async function FixtureDivisionFechaPage({
  params,
}: {
  params: Promise<{ categoriaId: string; numeroFecha: string }>;
}) {
  const { categoriaId, numeroFecha: numeroFechaParam } = await params;
  const categoria = CATEGORIAS.find((c) => c.id === categoriaId);
  if (!categoria || !tieneFixtureDivision(categoriaId)) notFound();

  const numeroFecha = Number(numeroFechaParam);
  const numeroFechas = numeroFechasDivisionDe(categoriaId);
  if (!Number.isInteger(numeroFecha) || numeroFecha < 1 || numeroFecha > numeroFechas) notFound();

  const fecha = await fixtureDivisionConResultados(categoriaId, numeroFecha);
  if (!fecha) notFound();

  const session = await getSession();
  // Ya pasada = en negro aunque no se haya cargado el resultado: desde las 18:00 del sábado
  // (Superior) / 16:00 del domingo (Juveniles) de esa jornada -- ver fechaFixtureYaPaso.
  const fechaYaPaso = fechaFixtureYaPaso(fecha.fecha, grupoDeCategoria(categoriaId).grupo);
  const hayAnterior = numeroFecha > 1;
  const haySiguiente = numeroFecha < numeroFechas;
  const tiraEquipos = equiposParaTira(categoriaId, (id) => `/fixture/${id}/division/${numeroFecha}`);

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href={`/fixture/${categoriaId}/division`} />
      <SessionBar session={session} />
      <Header />

      <div style={{ fontWeight: 700, color: DORADO_SUAVE, letterSpacing: 1, marginTop: 8, textTransform: "uppercase" }}>{categoria.nombre}</div>

      {tiraEquipos && <TiraEquipos equipos={tiraEquipos} actualId={categoriaId} />}

      <div style={{ textAlign: "center", marginTop: 8 }}>
        <div style={{ fontWeight: 700, color: DORADO_SUAVE, letterSpacing: 1, textTransform: "uppercase" }}>
          Fecha {numeroFecha}
        </div>
        <div style={{ fontSize: "0.78rem", opacity: 0.7, marginTop: 2 }}>{formatFecha(fecha.fecha)}</div>
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 20 }}>
        {fecha.partidos.map((p, i) => {
          const estiloFila: React.CSSProperties = {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${p.esNewman ? DORADO : p.jugado || fechaYaPaso ? "rgba(255,255,255,.06)" : "rgba(226,197,120,.2)"}`,
            background: p.jugado || fechaYaPaso ? NEGRO_JUGADA : p.esNewman ? "rgba(226,197,120,.08)" : "linear-gradient(155deg, rgba(255,255,255,.05), rgba(0,0,0,.15))",
            fontSize: "0.85rem",
            fontWeight: p.esNewman ? 700 : 400,
            color: p.esNewman ? DORADO_SUAVE : "#f7f1e4",
            textAlign: "center",
          };
          const contenido = (
            <>
              {p.jugado && p.especial ? (
                <span style={{ fontSize: "0.85em", opacity: 0.75, fontStyle: "italic" }}>
                  {p.local} - {p.visitante} · {p.especial === "postergado" ? "Postergado" : "Sin información"}
                </span>
              ) : p.jugado ? (
                <>
                  <span>{p.local}</span>
                  <b style={{ margin: "0 2px" }}>
                    {p.golesLocal}
                    {p.bonusLocal && <span style={{ color: DORADO, fontSize: "0.75em" }}> (B)</span>}
                  </b>
                  <em style={{ fontSize: "0.72em", fontWeight: 400, opacity: 0.6, fontStyle: "normal" }}>-</em>
                  <b style={{ margin: "0 2px" }}>
                    {p.golesVisitante}
                    {p.bonusVisitante && <span style={{ color: DORADO, fontSize: "0.75em" }}> (B)</span>}
                  </b>
                  <span>{p.visitante}</span>
                </>
              ) : (
                <>
                  <span>{p.local}</span>
                  <em style={{ fontSize: "0.72em", fontWeight: 400, opacity: 0.6, fontStyle: "normal" }}>-</em>
                  <span>{p.visitante}</span>
                </>
              )}
            </>
          );
          // Solo la fila de Newman lleva a /partido/[id] -- las otras 6 son de otros clubes, no
          // tenemos esa pagina para ellas. Mismo categoriaId/numeroFecha que esta pantalla: el
          // fixture de la division usa la misma numeracion de fecha que nuestros propios partidos.
          return p.esNewman ? (
            <Link key={i} href={`/partido/${partidoId(categoriaId, numeroFecha)}`} style={estiloFila}>
              {contenido}
            </Link>
          ) : (
            <div key={i} style={estiloFila}>
              {contenido}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
        {hayAnterior ? (
          <Link
            href={`/fixture/${categoriaId}/division/${numeroFecha - 1}`}
            style={{ fontSize: "0.78rem", color: DORADO_SUAVE, textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            ← Fecha {numeroFecha - 1}
          </Link>
        ) : (
          <span />
        )}
        {haySiguiente && (
          <Link
            href={`/fixture/${categoriaId}/division/${numeroFecha + 1}`}
            style={{ fontSize: "0.78rem", color: DORADO_SUAVE, textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            Fecha {numeroFecha + 1} →
          </Link>
        )}
      </div>
    </main>
  );
}
