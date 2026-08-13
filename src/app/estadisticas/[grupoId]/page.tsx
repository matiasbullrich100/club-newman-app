import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import { puedeVerEstadisticas } from "@/lib/auth/scope";
import { EDADES } from "@/lib/categorias";
import { splitNombre } from "@/lib/players";
import { obtenerHistorialTarjetas, tituloFechas } from "@/lib/tarjetasHistorial";
import type { JugadorAgregado } from "@/types/firestore";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,.045)",
  border: "1px solid rgba(226,197,120,.2)",
  borderRadius: 12,
  padding: 16,
  marginBottom: 14,
};

const cardTituloStyle: React.CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: 1,
  fontSize: "0.85rem",
  color: DORADO,
  marginBottom: 10,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  fontSize: "0.65rem",
  color: DORADO,
  padding: "4px 6px",
  borderBottom: "1px solid rgba(226,197,120,.3)",
};

const tdStyle: React.CSSProperties = {
  padding: "6px 6px",
  fontSize: "0.82rem",
  borderBottom: "1px solid rgba(255,255,255,.06)",
};

function tieneTarjeta(j: JugadorAgregado): boolean {
  return (
    j.tarjetasAmarillas + j.tarjetasDobleAmarilla + j.tarjetasRojas + j.tarjetasRojas20 + j.tarjetasAzules > 0
  );
}

function porApellido(a: JugadorAgregado, b: JugadorAgregado): number {
  const na = splitNombre(a.nombre);
  const nb = splitNombre(b.nombre);
  return na.apellido.localeCompare(nb.apellido) || na.nombre.localeCompare(nb.nombre);
}

export default async function EstadisticasGrupoPage({
  params,
}: {
  params: Promise<{ grupoId: string }>;
}) {
  const { grupoId } = await params;
  const edad = EDADES.find((e) => e.id === grupoId);
  if (grupoId !== "superior" && !edad) notFound();

  const session = await getSession();
  const titulo = grupoId === "superior" ? "Plantel Superior" : (edad!.nombre as string);

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/estadisticas" />
      <SessionBar session={session} />
      <Header rightLabel={titulo} />

      {!puedeVerEstadisticas(session, grupoId) ? (
        <p style={{ textAlign: "center", color: DORADO_SUAVE, marginTop: 20 }}>
          No tenés acceso a esta sección.
        </p>
      ) : (
        <Tablas grupoId={grupoId} />
      )}
    </main>
  );
}

async function Tablas({ grupoId }: { grupoId: string }) {
  const query =
    grupoId === "superior"
      ? adminDb.collection("jugadores").where("grupo", "==", "superior")
      : adminDb.collection("jugadores").where("grupo", "==", "juveniles").where("edadId", "==", grupoId);

  const snap = await query.get();
  const jugadores = snap.docs.map((d) => ({ id: d.id, ...(d.data() as JugadorAgregado) }));

  const historial = await obtenerHistorialTarjetas(grupoId, new Set(jugadores.map((j) => j.id)));
  const saldoDe = (id: string) => (historial.get(id)?.tarjeta_amarilla?.length ?? 0) % 3;

  // Un jugador que nunca tuvo ninguna tarjeta ni aparece en esta tabla -- pedido explicito del
  // club. De mayor a menor Saldo (cuanto mas cerca esta de la proxima fecha de suspension, mas
  // arriba); empatados en Saldo, alfabetico por apellido.
  const porTarjetas = jugadores.filter(tieneTarjeta).sort((a, b) => saldoDe(b.id) - saldoDe(a.id) || porApellido(a, b));

  // Alfabetico por ahora (no hay todavia un criterio mejor que ordenar por minutos, ya que el
  // historico no tiene ese detalle) -- pedido explicito del club.
  const porMinutos = [...jugadores].sort(porApellido);

  return (
    <>
      <div style={cardStyle}>
        <h3 style={cardTituloStyle}>Tarjetas</h3>
        {jugadores.length === 0 ? (
          <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem" }}>Datos sin cargar.</p>
        ) : (
          <>
            <p style={{ opacity: 0.6, fontSize: "0.78rem", marginBottom: 8 }}>
              Pasá el mouse sobre un número para ver en qué fecha fue cada tarjeta. 3 amarillas = 1 fecha de
              suspensión (roja, doble amarilla y roja de 20 las define el tribunal, no se calculan solas).
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Jugador</th>
                    <th style={thStyle}>🟨</th>
                    <th style={thStyle}>🟨🟨</th>
                    <th style={thStyle}>🟥</th>
                    <th style={thStyle}>🟥20</th>
                    <th style={thStyle}>🟦</th>
                    <th style={thStyle}>Fecha Susp.</th>
                    <th style={thStyle}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {porTarjetas.map((j) => {
                    const h = historial.get(j.id) ?? {};
                    const amarillas = h.tarjeta_amarilla ?? [];
                    const fechaSuspension = Math.floor(amarillas.length / 3);
                    const saldo = amarillas.length % 3;
                    // La 3ra, 6ta, 9na... amarilla (en orden cronologico) es la que dispara cada
                    // fecha de suspension -- eso es lo que se muestra en el tooltip de esa columna.
                    const fechasDisparadoras = Array.from({ length: fechaSuspension }, (_, i) => amarillas[i * 3 + 2]);

                    return (
                      <tr key={j.id}>
                        <td style={{ ...tdStyle, color: DORADO_SUAVE }}>{j.nombre}</td>
                        <td style={tdStyle} title={tituloFechas(amarillas)}>
                          {j.tarjetasAmarillas || 0}
                        </td>
                        <td style={tdStyle} title={tituloFechas(h.tarjeta_doble_amarilla)}>
                          {j.tarjetasDobleAmarilla || 0}
                        </td>
                        <td style={tdStyle} title={tituloFechas(h.tarjeta_roja)}>
                          {j.tarjetasRojas || 0}
                        </td>
                        <td style={tdStyle} title={tituloFechas(h.tarjeta_roja_20)}>
                          {j.tarjetasRojas20 || 0}
                        </td>
                        <td style={tdStyle} title={tituloFechas(h.tarjeta_azul)}>
                          {j.tarjetasAzules || 0}
                        </td>
                        <td style={tdStyle} title={tituloFechas(fechasDisparadoras)}>
                          {fechaSuspension}
                        </td>
                        <td style={tdStyle}>{saldo}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={cardTituloStyle}>Minutos jugados</h3>
        {jugadores.length === 0 ? (
          <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem" }}>Datos sin cargar.</p>
        ) : (
          <>
            <p style={{ opacity: 0.6, fontSize: "0.78rem", marginBottom: 8 }}>
              Los minutos se acumulan cuando un partido se marca como terminado, a partir de los cambios
              cargados en vivo. Los partidos históricos no tienen ese detalle todavía, por eso figuran en 0
              (orden alfabético mientras tanto).
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Jugador</th>
                    <th style={thStyle}>Minutos</th>
                  </tr>
                </thead>
                <tbody>
                  {porMinutos.map((j) => (
                    <tr key={j.id}>
                      <td style={{ ...tdStyle, color: DORADO_SUAVE }}>{j.nombre}</td>
                      <td style={tdStyle}>{j.minutosJugadosTotal || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
