import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { formatFechaCorta } from "@/lib/fecha";
import { estadoFormaciones, type EstadoSubida } from "@/lib/match/estadoFormaciones";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

const CHIP: Record<EstadoSubida, { label: string; bg: string; color: string }> = {
  "sin-subir": { label: "Sin subir", bg: "rgba(194,59,59,.18)", color: "#f3caca" },
  borrador: { label: "Borrador", bg: "rgba(245,168,0,.16)", color: DORADO },
  publicada: { label: "Publicada", bg: "rgba(47,107,79,.22)", color: "#8fd3b0" },
  "sin-fecha": { label: "Sin fecha", bg: "rgba(255,255,255,.06)", color: DORADO_SUAVE },
};

export default async function EstadoFormacionesPage() {
  const session = await getSession();
  const autorizado = session?.rol === "manager";

  const grupos = autorizado ? await estadoFormaciones() : [];

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header rightLabel="Formaciones" />

      {!autorizado ? (
        <p style={{ textAlign: "center", color: DORADO_SUAVE, marginTop: 20 }}>
          Esta sección es solo para el Manager.
        </p>
      ) : (
        <>
          <p style={{ fontSize: "0.8rem", color: DORADO_SUAVE, opacity: 0.8, textAlign: "center", margin: "0 0 18px" }}>
            Estado de la formación de la próxima fecha de cada equipo. “Borrador” = cargada pero no
            publicada (solo la ve quien opera esa categoría).
          </p>

          {grupos.map((grupo) => {
            const conFecha = grupo.filas.filter((f) => f.estado !== "sin-fecha");
            const publicadas = conFecha.filter((f) => f.estado === "publicada").length;
            const borradores = conFecha.filter((f) => f.estado === "borrador").length;
            const sinSubir = conFecha.filter((f) => f.estado === "sin-subir").length;
            return (
              <section key={grupo.titulo} style={{ marginBottom: 22 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    borderBottom: `1px solid ${DORADO}`,
                    paddingBottom: 4,
                    marginBottom: 8,
                  }}
                >
                  <h2 style={{ fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: 1, color: DORADO, margin: 0 }}>
                    {grupo.titulo}
                  </h2>
                  <span style={{ fontSize: "0.7rem", color: DORADO_SUAVE, opacity: 0.85 }}>
                    {publicadas} publicada{publicadas === 1 ? "" : "s"}
                    {borradores > 0 ? ` · ${borradores} borrador${borradores === 1 ? "" : "es"}` : ""}
                    {sinSubir > 0 ? ` · ${sinSubir} sin subir` : ""}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {grupo.filas.map((f) => {
                    const chip = CHIP[f.estado];
                    const contenido = (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: 8,
                          background: "linear-gradient(160deg, rgba(0,0,0,.28), rgba(0,0,0,.14))",
                          border: "1px solid rgba(226,197,120,.2)",
                        }}
                      >
                        <span
                          style={{
                            flex: "0 0 auto",
                            width: 62,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.3,
                            color: DORADO_SUAVE,
                          }}
                        >
                          {f.categoriaNombre}
                        </span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: "0.74rem", color: DORADO_SUAVE, opacity: 0.85 }}>
                          {f.numeroFecha ? (
                            <>
                              Fecha {f.numeroFecha} · {f.rival}
                              {f.fecha ? ` · ${formatFechaCorta(f.fecha)}` : ""}
                            </>
                          ) : (
                            "sin fecha programada"
                          )}
                        </span>
                        <span
                          style={{
                            flex: "0 0 auto",
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.4,
                            padding: "3px 8px",
                            borderRadius: 20,
                            background: chip.bg,
                            color: chip.color,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {chip.label}
                          {f.jugadores > 0 ? ` · ${f.jugadores}` : ""}
                        </span>
                      </div>
                    );
                    return f.partidoId ? (
                      <Link key={f.categoriaId} href={`/partido/${f.partidoId}`} style={{ display: "block" }}>
                        {contenido}
                      </Link>
                    ) : (
                      <div key={f.categoriaId}>{contenido}</div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}
