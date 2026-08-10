import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import { puedeVerEstadisticas } from "@/lib/auth/scope";
import { EDADES } from "@/lib/categorias";
import { splitNombre } from "@/lib/players";
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

  // Primero los que tienen alguna tarjeta (cualquier tipo), alfabetico por apellido; despues el
  // resto del plantel sin tarjetas, tambien alfabetico por apellido -- pedido explicito del club.
  const porTarjetas = [...jugadores.filter(tieneTarjeta).sort(porApellido), ...jugadores.filter((j) => !tieneTarjeta(j)).sort(porApellido)];

  const porMinutos = [...jugadores].sort(
    (a, b) => (b.minutosJugadosTotal ?? 0) - (a.minutosJugadosTotal ?? 0) || a.nombre.localeCompare(b.nombre)
  );

  return (
    <>
      <div style={cardStyle}>
        <h3 style={cardTituloStyle}>Tarjetas</h3>
        {jugadores.length === 0 ? (
          <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem" }}>Todavía no hay jugadores registrados.</p>
        ) : (
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
                </tr>
              </thead>
              <tbody>
                {porTarjetas.map((j) => (
                  <tr key={j.id}>
                    <td style={{ ...tdStyle, color: DORADO_SUAVE }}>{j.nombre}</td>
                    <td style={tdStyle}>{j.tarjetasAmarillas || 0}</td>
                    <td style={tdStyle}>{j.tarjetasDobleAmarilla || 0}</td>
                    <td style={tdStyle}>{j.tarjetasRojas || 0}</td>
                    <td style={tdStyle}>{j.tarjetasRojas20 || 0}</td>
                    <td style={tdStyle}>{j.tarjetasAzules || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={cardTituloStyle}>Minutos jugados</h3>
        {jugadores.length === 0 ? (
          <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem" }}>Todavía no hay jugadores registrados.</p>
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
