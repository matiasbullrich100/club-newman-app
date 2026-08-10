"use client";

import { useState, useTransition } from "react";
import { publicarIncidente, type PublicarIncidenteInput } from "@/lib/match/actions";
import type { Equipo, Periodo, TipoIncidente } from "@/types/firestore";
import { requierePlayerSelection } from "@/lib/incidentes";
import type { RosterJugador } from "./types";
import { botonOpcion, botonPrimario, botonSecundario, grillaOpciones, listaOpciones } from "./estilos";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

const TIPOS: { tipo: Exclude<TipoIncidente, "cambio" | "fin_1t" | "fin_2t">; label: string }[] = [
  { tipo: "try", label: "Try (+5)" },
  { tipo: "try_scrum", label: "Try Scrum (+5)" },
  { tipo: "conversion", label: "Conversión (+2)" },
  { tipo: "penal", label: "Penal (+3)" },
  { tipo: "drop", label: "Drop (+3)" },
  { tipo: "try_penal", label: "Try Penal (+7)" },
  { tipo: "tarjeta_amarilla", label: "Tarjeta amarilla" },
  { tipo: "tarjeta_doble_amarilla", label: "Doble amarilla" },
  { tipo: "tarjeta_roja", label: "Tarjeta roja" },
  { tipo: "tarjeta_roja_20", label: "Roja de 20" },
  { tipo: "tarjeta_azul", label: "Tarjeta azul" },
  { tipo: "lesion", label: "Lesión" },
];

type Paso = "tipo" | "equipo" | "jugador" | "cuando" | "confirmar";

export default function CargaIncidencia({
  partidoId,
  plantel,
  enCanchaIds,
  soloEnCancha = true,
}: {
  partidoId: string;
  plantel: RosterJugador[];
  enCanchaIds: string[];
  /** false en correcciones post-partido: cualquiera del plantel pudo haber anotado, no solo
   * quien estaba en cancha al momento de cortar (ya no hay forma de saberlo con certeza). */
  soloEnCancha?: boolean;
}) {
  const [paso, setPaso] = useState<Paso>("tipo");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["tipo"] | null>(null);
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [jugadorId, setJugadorId] = useState<string | null>(null);
  const [periodoManual, setPeriodoManual] = useState<Periodo | null>(null);
  const [minutoManual, setMinutoManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // En correcciones post-partido el reloj ya esta congelado -- hay que preguntar en que
  // momento paso la jugada para que quede ordenada cronologicamente entre las demas.
  const esCorreccion = !soloEnCancha;

  const enCancha = soloEnCancha ? plantel.filter((j) => enCanchaIds.includes(j.jugadorId)) : plantel;
  // Try Penal / Try Scrum se le dan al equipo entero, no a un jugador puntual.
  const requiereJugador = equipo === "newman" && (tipo ? requierePlayerSelection(tipo) : true);
  const jugador = plantel.find((j) => j.jugadorId === jugadorId);

  function reset() {
    setPaso("tipo");
    setTipo(null);
    setEquipo(null);
    setJugadorId(null);
    setPeriodoManual(null);
    setMinutoManual("");
    setError(null);
  }

  function siguientePasoTrasJugador() {
    setPaso(esCorreccion ? "cuando" : "confirmar");
  }

  function elegirTipo(t: (typeof TIPOS)[number]["tipo"]) {
    setTipo(t);
    if (t === "lesion") {
      setEquipo("newman");
      setPaso("jugador");
    } else {
      setPaso("equipo");
    }
  }

  function elegirEquipo(e: Equipo) {
    setEquipo(e);
    const necesitaJugador = e === "newman" && (tipo ? requierePlayerSelection(tipo) : true);
    if (necesitaJugador) {
      setPaso("jugador");
    } else {
      setPaso(esCorreccion ? "cuando" : "confirmar");
    }
  }

  function confirmar() {
    if (!tipo || !equipo) return;
    setError(null);
    const input: PublicarIncidenteInput = {
      tipo,
      equipo,
      jugadorId: jugadorId ?? undefined,
      ...(esCorreccion ? { periodoManual: periodoManual ?? undefined, minutoManual: Number(minutoManual) } : {}),
    };
    startTransition(async () => {
      try {
        await publicarIncidente(partidoId, input);
        reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo publicar");
      }
    });
  }

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: "1rem" }}>
      <h3 style={{ fontSize: "1rem", margin: "0 0 0.75rem", color: DORADO, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Cargar jugada
      </h3>

      {paso === "tipo" && (
        <div style={grillaOpciones}>
          {TIPOS.map(({ tipo: t, label }) => (
            <button key={t} style={{ ...botonOpcion, textAlign: "center" }} onClick={() => elegirTipo(t)}>
              {label}
            </button>
          ))}
        </div>
      )}

      {paso === "equipo" && (
        <div style={listaOpciones}>
          <button style={botonPrimario} onClick={() => elegirEquipo("newman")}>
            Newman
          </button>
          <button style={botonPrimario} onClick={() => elegirEquipo("rival")}>
            Rival
          </button>
          <button style={botonSecundario} onClick={reset}>
            Cancelar
          </button>
        </div>
      )}

      {paso === "jugador" && requiereJugador && (
        <div style={listaOpciones}>
          {enCancha.length === 0 && <p>{soloEnCancha ? "No hay jugadores en cancha." : "No hay jugadores cargados."}</p>}
          {enCancha.map((j) => (
            <button key={j.jugadorId} style={botonOpcion} onClick={() => { setJugadorId(j.jugadorId); siguientePasoTrasJugador(); }}>
              {j.dorsal} — {j.nombre}
            </button>
          ))}
          <button style={botonSecundario} onClick={reset}>
            Cancelar
          </button>
        </div>
      )}

      {paso === "cuando" && (
        <div style={listaOpciones}>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>¿En qué momento pasó?</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={periodoManual === "1T" ? botonPrimario : botonOpcion}
              onClick={() => setPeriodoManual("1T")}
            >
              1er tiempo
            </button>
            <button
              style={periodoManual === "2T" ? botonPrimario : botonOpcion}
              onClick={() => setPeriodoManual("2T")}
            >
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

      {paso === "confirmar" && tipo && equipo && (
        <div>
          <p style={{ fontSize: "1.02rem" }}>
            Confirmar: <strong>{TIPOS.find((t) => t.tipo === tipo)?.label}</strong> —{" "}
            {equipo === "newman" ? (requiereJugador ? jugador?.nombre ?? "" : "Newman") : "Rival"}
            {esCorreccion && periodoManual && minutoManual && (
              <>
                {" "}
                ({periodoManual} {minutoManual}&apos;)
              </>
            )}
          </p>
          {error && <p style={{ color: "crimson" }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={botonPrimario} disabled={isPending} onClick={confirmar}>
              {isPending ? "Publicando…" : "Publicar"}
            </button>
            <button style={botonSecundario} disabled={isPending} onClick={reset}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
