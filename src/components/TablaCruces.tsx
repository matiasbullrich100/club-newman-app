import { CREMA, DORADO, DORADO_SUAVE, NEGRO_JUGADA } from "@/lib/colors";
import type { FechaDivisionNumerada } from "@/lib/resultadosDivision/consultar";

const BORDE = "rgba(240,203,134,.4)";
const FONDO_PROPIO = "rgba(245,168,0,.12)";

// Tres colores semánticos (NO el acento): cómo salió el partido para el equipo de la FILA (local).
const VERDE = "rgba(31,122,58,.42)"; // ganó de local
const ROJO = "rgba(165,42,42,.42)"; // perdió de local
const GRIS = "rgba(122,106,58,.42)"; // empató

type Cruce = { gf: number; gc: number; bonus: boolean; nf: number };

// A partir del fixture completo de la división arma dos cosas:
//  1. la grilla de cruces (fila = local, columna = visitante, celda = resultado para el local)
//  2. "lo que le queda a cada uno, en orden" (fila = equipo, columnas = fechas que faltan)
export default function TablaCruces({ fechas }: { fechas: FechaDivisionNumerada[] }) {
  const esPropio = (n: string) => n === "Newman";

  const set = new Set<string>();
  for (const f of fechas) for (const p of f.partidos) {
    if (p.local) set.add(p.local);
    if (p.visitante) set.add(p.visitante);
  }
  const equipos = [...set].sort((a, b) => {
    if (esPropio(a) !== esPropio(b)) return esPropio(a) ? -1 : 1; // Newman primero
    return a.localeCompare(b, "es");
  });

  const key = (l: string, v: string) => `${l} ${v}`;
  const jugados = new Map<string, Cruce>();
  const pendientes = new Map<string, number>();
  const runin = new Map<string, Map<number, { opp: string; local: boolean; libre: boolean }>>();
  const setRun = (eq: string, nf: number, v: { opp: string; local: boolean; libre: boolean }) => {
    if (!runin.has(eq)) runin.set(eq, new Map());
    runin.get(eq)!.set(nf, v);
  };
  const fechasPendientes = new Set<number>();

  for (const f of fechas) {
    for (const p of f.partidos) {
      if (p.especial === "libre") {
        if (!p.jugado) {
          setRun(p.local, f.numeroFecha, { opp: "", local: true, libre: true });
          fechasPendientes.add(f.numeroFecha);
        }
        continue;
      }
      if (!p.visitante) continue;
      if (p.jugado && p.golesLocal != null && p.golesVisitante != null) {
        jugados.set(key(p.local, p.visitante), {
          gf: p.golesLocal,
          gc: p.golesVisitante,
          bonus: !!p.bonusLocal,
          nf: f.numeroFecha,
        });
      } else {
        pendientes.set(key(p.local, p.visitante), f.numeroFecha);
        fechasPendientes.add(f.numeroFecha);
        setRun(p.local, f.numeroFecha, { opp: p.visitante, local: true, libre: false });
        setRun(p.visitante, f.numeroFecha, { opp: p.local, local: false, libre: false });
      }
    }
  }
  const fpOrden = [...fechasPendientes].sort((a, b) => a - b);

  const th: React.CSSProperties = {
    position: "sticky",
    left: 0,
    zIndex: 2,
    background: NEGRO_JUGADA,
    color: DORADO,
    fontSize: "0.68rem",
    fontWeight: 700,
    textAlign: "right",
    padding: "3px 8px",
    whiteSpace: "nowrap",
  };
  const celda: React.CSSProperties = {
    minWidth: 46,
    height: 30,
    fontSize: "0.66rem",
    textAlign: "center",
    fontVariantNumeric: "tabular-nums",
    border: "1px solid rgba(255,255,255,.12)",
    position: "relative",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <div>
        <h3 style={subtitulo}>Cruces</h3>
        <p style={ayuda}>
          Fila = local, columna = visitante. Cada celda: cómo salió ESE partido para el equipo de la fila (a favor–en
          contra) y en qué fecha. <b style={{ color: DORADO }}>·</b> = punto bonus. Las que faltan muestran solo el nº de
          fecha.
        </p>
        <div style={{ overflowX: "auto", border: `1px solid ${BORDE}`, borderRadius: 8 }}>
          <table style={{ borderCollapse: "collapse", whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th style={{ ...th, zIndex: 3 }} />
                {equipos.map((e) => (
                  <th
                    key={e}
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: esPropio(e) ? DORADO : DORADO_SUAVE,
                      background: NEGRO_JUGADA,
                      padding: "6px 3px",
                      border: "1px solid rgba(255,255,255,.12)",
                    }}
                  >
                    {e}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {equipos.map((fila) => (
                <tr key={fila}>
                  <th style={{ ...th, color: esPropio(fila) ? DORADO : DORADO_SUAVE }}>{fila}</th>
                  {equipos.map((col) => {
                    const propio = esPropio(fila) || esPropio(col);
                    if (fila === col)
                      return (
                        <td
                          key={col}
                          style={{
                            ...celda,
                            background:
                              "repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,255,255,.06) 4px,rgba(255,255,255,.06) 8px)",
                          }}
                        />
                      );
                    const j = jugados.get(key(fila, col));
                    if (j) {
                      const fondo = j.gf > j.gc ? VERDE : j.gf < j.gc ? ROJO : GRIS;
                      return (
                        <td key={col} style={{ ...celda, background: fondo, outline: propio ? `2px solid ${DORADO}` : undefined, outlineOffset: -2 }}>
                          <span style={{ position: "absolute", top: 0, left: 2, fontSize: "0.5rem", color: "rgba(255,255,255,.5)" }}>
                            F{j.nf}
                          </span>
                          {j.gf}-{j.gc}
                          {j.bonus && <b style={{ color: DORADO }}>·</b>}
                        </td>
                      );
                    }
                    const nf = pendientes.get(key(fila, col));
                    return (
                      <td key={col} style={{ ...celda, color: "rgba(255,255,255,.45)", background: propio ? FONDO_PROPIO : undefined }}>
                        {nf ? `F${nf}` : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {fpOrden.length > 0 && (
        <div>
          <h3 style={subtitulo}>Lo que le queda a cada uno</h3>
          <p style={ayuda}>
            Cada fila es un equipo; las columnas son las fechas que faltan, en orden. <b>L</b> = de local, <b>V</b> = de
            visitante. Se lee de izquierda a derecha = el fixture que le queda a ese equipo.
          </p>
          <div style={{ overflowX: "auto", border: `1px solid ${BORDE}`, borderRadius: 8 }}>
            <table style={{ borderCollapse: "collapse", whiteSpace: "nowrap" }}>
              <thead>
                <tr>
                  <th style={{ ...th, zIndex: 3 }}>Equipo</th>
                  {fpOrden.map((nf) => (
                    <th key={nf} style={{ fontSize: "0.62rem", fontWeight: 700, color: DORADO, background: NEGRO_JUGADA, padding: "4px 6px", border: "1px solid rgba(255,255,255,.12)" }}>
                      F{nf}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equipos.map((eq) => (
                  <tr key={eq}>
                    <th style={{ ...th, color: esPropio(eq) ? DORADO : DORADO_SUAVE }}>{eq}</th>
                    {fpOrden.map((nf) => {
                      const g = runin.get(eq)?.get(nf);
                      const base: React.CSSProperties = {
                        minWidth: 78,
                        height: 28,
                        fontSize: "0.66rem",
                        textAlign: "center",
                        border: "1px solid rgba(255,255,255,.12)",
                        outline: esPropio(eq) ? `2px solid ${DORADO}` : undefined,
                        outlineOffset: -2,
                      };
                      if (!g) return <td key={nf} style={{ ...base, color: "rgba(255,255,255,.35)" }}>—</td>;
                      if (g.libre) return <td key={nf} style={{ ...base, color: DORADO_SUAVE, fontStyle: "italic" }}>Libre</td>;
                      return (
                        <td key={nf} style={{ ...base, background: g.local ? FONDO_PROPIO : "rgba(255,255,255,.04)", fontStyle: g.local ? "normal" : "italic" }}>
                          {g.opp} {g.local ? "(L)" : "(V)"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: "0.7rem", color: CREMA, alignItems: "center" }}>
        <Swatch color={VERDE} txt="Ganó de local" />
        <Swatch color={ROJO} txt="Perdió de local" />
        <Swatch color={GRIS} txt="Empató" />
        <span><b style={{ color: DORADO }}>·</b> bonus</span>
        <span>(L) local · (V) visitante</span>
      </div>
    </div>
  );
}

const subtitulo: React.CSSProperties = {
  margin: "0 0 4px",
  fontSize: "0.8rem",
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: DORADO,
};
const ayuda: React.CSSProperties = { margin: "0 0 10px", fontSize: "0.72rem", opacity: 0.75, lineHeight: 1.4 };

function Swatch({ color, txt }: { color: string; txt: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 13, height: 13, borderRadius: 3, background: color, display: "inline-block" }} />
      {txt}
    </span>
  );
}
