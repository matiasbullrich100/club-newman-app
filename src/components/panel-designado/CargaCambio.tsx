"use client";

import { useMemo, useState, useTransition } from "react";
import { publicarCambio } from "@/lib/match/actions";
import type { Periodo } from "@/types/firestore";
import type { JugadorBusqueda, RosterJugador } from "./types";
import { botonOpcion, botonPrimario, botonSecundario, listaOpciones } from "./estilos";
import BarraAccionFija from "./BarraAccionFija";
import { norm } from "@/lib/players";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

type Paso = "sale" | "entra" | "cuando" | "confirmar";

interface Seleccion {
  jugadorId: string;
  nombre: string;
  esNuevo: boolean;
}

export default function CargaCambio({
  partidoId,
  plantel,
  plantelCompleto,
  enCanchaIds,
  soloEnCancha = true,
}: {
  partidoId: string;
  plantel: RosterJugador[];
  plantelCompleto: JugadorBusqueda[];
  enCanchaIds: string[];
  /** false en correcciones post-partido: cualquiera del plantel pudo haber salido/entrado, no
   * hay forma de saber con certeza quien estaba en cancha en ese momento pasado. */
  soloEnCancha?: boolean;
}) {
  const [paso, setPaso] = useState<Paso>("sale");
  const [saleId, setSaleId] = useState<string | null>(null);
  const [entra, setEntra] = useState<Seleccion | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [periodoManual, setPeriodoManual] = useState<Periodo | null>(null);
  const [minutoManual, setMinutoManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const esCorreccion = !soloEnCancha;
  const enCancha = soloEnCancha ? plantel.filter((j) => enCanchaIds.includes(j.jugadorId)) : plantel;
  const banco = soloEnCancha ? plantel.filter((j) => !enCanchaIds.includes(j.jugadorId)) : plantel;
  const sale = plantel.find((j) => j.jugadorId === saleId);

  // No repetir en el buscador a quien ya se ve arriba (banco de esta formacion).
  const idsPlantel = useMemo(() => new Set(plantel.map((j) => j.jugadorId)), [plantel]);
  const resultadosBusqueda = useMemo(() => {
    const q = norm(busqueda.trim());
    if (q.length < 2) return [];
    return plantelCompleto.filter((j) => !idsPlantel.has(j.jugadorId) && norm(j.nombre).includes(q)).slice(0, 8);
  }, [busqueda, plantelCompleto, idsPlantel]);

  function reset() {
    setPaso("sale");
    setSaleId(null);
    setEntra(null);
    setBuscando(false);
    setBusqueda("");
    setPeriodoManual(null);
    setMinutoManual("");
    setError(null);
  }

  function elegirEntra(seleccion: Seleccion) {
    setEntra(seleccion);
    setPaso(esCorreccion ? "cuando" : "confirmar");
  }

  function confirmar() {
    if (!saleId || !entra) return;
    setError(null);
    startTransition(async () => {
      try {
        await publicarCambio(partidoId, {
          jugadorSaleId: saleId,
          jugadorEntraId: entra.jugadorId,
          ...(entra.esNuevo ? { jugadorEntraNombre: entra.nombre } : {}),
          ...(esCorreccion ? { periodoManual: periodoManual ?? undefined, minutoManual: Number(minutoManual) } : {}),
        });
        reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo publicar el cambio");
      }
    });
  }

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: "1rem" }}>
      <h3 style={{ fontSize: "1rem", margin: "0 0 0.75rem", color: DORADO, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Cambio
      </h3>

      {paso === "sale" && (
        <div style={listaOpciones}>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>¿Quién sale?</p>
          {enCancha.map((j) => (
            <button key={j.jugadorId} style={botonOpcion} onClick={() => { setSaleId(j.jugadorId); setPaso("entra"); }}>
              {j.dorsal} — {j.nombre}
            </button>
          ))}
        </div>
      )}

      {paso === "entra" && (
        <div style={listaOpciones}>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>¿Quién entra?</p>
          {banco.map((j) => (
            <button
              key={j.jugadorId}
              style={botonOpcion}
              onClick={() => elegirEntra({ jugadorId: j.jugadorId, nombre: j.nombre, esNuevo: false })}
            >
              {j.dorsal} — {j.nombre}
            </button>
          ))}

          {!buscando ? (
            // Fijo abajo (BarraAccionFija) -- con poco banco (a veces 1 solo suplente) esta lista
            // queda muy corta y el boton terminaba scrolleado arriba, fuera de la pantalla (mismo
            // bug real que ya se arreglo para "Publicar" -- ver BarraAccionFija.tsx).
            <BarraAccionFija>
              <button style={botonPrimario} onClick={() => setBuscando(true)}>
                Buscar otro jugador
              </button>
              <button style={botonSecundario} onClick={reset}>
                Cancelar
              </button>
            </BarraAccionFija>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <input
                autoFocus
                type="text"
                placeholder="Apellido del jugador..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(226,197,120,.35)",
                  background: "rgba(0,0,0,.25)",
                  color: "#f7f1e4",
                  fontSize: "0.95rem",
                }}
              />
              {busqueda.trim().length >= 2 && resultadosBusqueda.length === 0 && (
                <p style={{ margin: 0, fontSize: "0.82rem", color: DORADO_SUAVE, opacity: 0.75 }}>Sin resultados.</p>
              )}
              {resultadosBusqueda.map((j) => (
                <button
                  key={j.jugadorId}
                  style={botonOpcion}
                  onClick={() => elegirEntra({ jugadorId: j.jugadorId, nombre: j.nombre, esNuevo: true })}
                >
                  {j.nombre}
                </button>
              ))}
              <button style={botonSecundario} onClick={reset}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {paso === "cuando" && (
        <div style={listaOpciones}>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>¿En qué momento pasó?</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={periodoManual === "1T" ? botonPrimario : botonOpcion} onClick={() => setPeriodoManual("1T")}>
              1er tiempo
            </button>
            <button style={periodoManual === "2T" ? botonPrimario : botonOpcion} onClick={() => setPeriodoManual("2T")}>
              2do tiempo
            </button>
          </div>
          <label style={{ fontSize: "0.85rem", color: DORADO_SUAVE }}>
            Minuto
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              value={minutoManual}
              onChange={(e) => setMinutoManual(e.target.value)}
              style={{
                display: "block",
                marginTop: 6,
                width: "100%",
                fontSize: "1.1rem",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid rgba(226,197,120,.35)",
                background: "rgba(255,255,255,.06)",
                color: "#f7f1e4",
              }}
            />
          </label>
          <button
            style={botonPrimario}
            disabled={!periodoManual || !minutoManual || Number(minutoManual) < 1}
            onClick={() => setPaso("confirmar")}
          >
            Continuar
          </button>
          <button style={botonSecundario} onClick={reset}>
            Cancelar
          </button>
        </div>
      )}

      {paso === "confirmar" && (
        <div>
          <p style={{ fontSize: "1.02rem" }}>
            Confirmar: sale <strong>{sale?.nombre}</strong>, entra <strong>{entra?.nombre}</strong>
            {esCorreccion && periodoManual && minutoManual && (
              <>
                {" "}
                ({periodoManual} {minutoManual}&apos;)
              </>
            )}
          </p>
          {error && <p style={{ color: "crimson" }}>{error}</p>}
          <BarraAccionFija>
            <button style={botonPrimario} disabled={isPending} onClick={confirmar}>
              {isPending ? "Publicando…" : "Publicar"}
            </button>
            <button style={botonSecundario} disabled={isPending} onClick={reset}>
              Cancelar
            </button>
          </BarraAccionFija>
        </div>
      )}
    </div>
  );
}
