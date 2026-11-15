import { getSession } from "@/lib/auth/session";
import { campeonesTemporada, titulosPorClub, type CampeonCategoria } from "@/lib/campeones";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import { FuenteUrba } from "@/components/PieNota";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

// Mas nueva a mas vieja, igual que la grilla de equipos de /juveniles (M19 primero).
const ORDEN_EDAD = ["m19", "m17", "m16", "m15"];

const fila: React.CSSProperties = { display: "grid", alignItems: "center", gap: 8, borderRadius: 8, padding: "8px 10px" };

// Fondo de una fila: el campeon Newman va en dorado (como en el resto de la app); el resto, neutro.
const estilo = (esNewman: boolean): React.CSSProperties =>
  esNewman
    ? { background: "rgba(245,168,0,.9)", color: "#2a1b02", border: "1px solid #f5c428" }
    : { background: "rgba(255,255,255,.05)", border: "1px solid rgba(226,197,120,.25)" };

const titulo = (texto: string) => (
  <div style={{ fontWeight: 800, color: DORADO, fontSize: "1.05rem", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>{texto}</div>
);

function FilaCampeon({ c }: { c: CampeonCategoria }) {
  const esNewman = c.campeon === "Newman";
  return (
    <div style={{ ...fila, gridTemplateColumns: "62px 1fr auto", ...estilo(esNewman) }}>
      <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>{c.categoria}</span>
      {c.campeon ? (
        <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>
          <span aria-hidden>🏆 </span>
          {c.campeon}
        </span>
      ) : (
        <span style={{ fontSize: "0.78rem", fontStyle: "italic", opacity: 0.8 }}>A confirmar</span>
      )}
      {c.campeon && c.detalle && <span style={{ fontSize: "0.68rem", opacity: 0.85, textAlign: "right", maxWidth: 150 }}>{c.detalle}</span>}
      {!c.campeon && c.detalle && <span style={{ gridColumn: "1 / -1", fontSize: "0.66rem", opacity: 0.75 }}>{c.detalle.replace("A confirmar · ", "")}</span>}
    </div>
  );
}

// "Campeones": un campeon por categoria (Plantel Superior y Juveniles, de todos los clubes) y cuantos titulos tiene cada
// club -- ver src/lib/campeones.ts para como se decide cada campeon.
export default async function CampeonesPage() {
  const session = await getSession();
  const campeones = await campeonesTemporada();
  const clubes = titulosPorClub(campeones);
  const superior = campeones.filter((c) => c.grupo === "superior");
  const porEdad = ORDEN_EDAD.map((id) => ({ id, categorias: campeones.filter((c) => c.edadId === id) })).filter((g) => g.categorias.length > 0);
  const sinDefinir = campeones.filter((c) => !c.campeon).length;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header rightLabel="Campeones" />

      <div style={{ marginTop: 14, textAlign: "center", fontWeight: 800, color: DORADO, fontSize: "1.25rem", lineHeight: 1.2 }}>Campeones 2026</div>
      <div style={{ textAlign: "center", marginTop: 4, fontSize: "0.68rem", letterSpacing: 1, textTransform: "uppercase", color: DORADO_SUAVE }}>
        Plantel Superior y Juveniles · URBA
      </div>

      {campeones.length === 0 ? (
        <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem", textAlign: "center", marginTop: 14 }}>Todavía no hay datos cargados.</p>
      ) : (
        <div style={{ display: "grid", gap: 18, marginTop: 16 }}>
          <section>
            {titulo("Campeonatos por club")}
            <div style={{ display: "grid", gap: 5 }}>
              {clubes.map((c, i) => (
                <div key={c.club} style={{ ...fila, gridTemplateColumns: "22px 1fr auto auto", ...estilo(c.club === "Newman") }}>
                  <span style={{ fontSize: "0.72rem", opacity: 0.7 }}>{i + 1}</span>
                  <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>{c.club}</span>
                  <span style={{ fontSize: "0.66rem", opacity: 0.8, whiteSpace: "nowrap" }}>
                    Plantel {c.superior} · Juveniles {c.juveniles}
                  </span>
                  <span style={{ fontWeight: 900, fontSize: "1.05rem", minWidth: 46, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    <span aria-hidden>🏆 </span>
                    {c.total}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            {titulo("Plantel Superior")}
            <div style={{ display: "grid", gap: 5 }}>
              {superior.map((c) => (
                <FilaCampeon key={c.categoriaId} c={c} />
              ))}
            </div>
          </section>

          <section>
            {titulo("Juveniles")}
            <div style={{ display: "grid", gap: 12 }}>
              {porEdad.map((g) => (
                <div key={g.id} style={{ display: "grid", gap: 5 }}>
                  {g.categorias.map((c) => (
                    <FilaCampeon key={c.categoriaId} c={c} />
                  ))}
                </div>
              ))}
            </div>
          </section>

          <p style={{ textAlign: "center", opacity: 0.65, fontSize: "0.7rem", margin: 0, lineHeight: 1.5 }}>
            Plantel Superior: el que ganó la final del playoff. Pre G y Pre H juegan en la zona de Pre F, así que el campeón de esa zona figura en Pre F.
            <br />
            Juveniles: el 1° de la tabla de la 2ª fase con el título asegurado.
            {sinDefinir > 0 && ` Quedan ${sinDefinir} sin confirmar: no suman hasta que se defina.`}
          </p>
        </div>
      )}
      <FuenteUrba />
    </main>
  );
}
