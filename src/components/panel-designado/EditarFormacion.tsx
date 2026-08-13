"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reemplazarJugadorFormacion } from "@/lib/match/actions";
import type { JugadorBusqueda, RosterJugador } from "./types";
import { botonOpcion, botonPrimario, botonSecundario, listaOpciones } from "./estilos";
import { norm } from "@/lib/players";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

const porDorsal = (a: RosterJugador, b: RosterJugador) => Number(a.dorsal) - Number(b.dorsal);

const filaJugadorStyle: React.CSSProperties = {
  ...botonOpcion,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const cambiarStyle: React.CSSProperties = {
  fontSize: "0.68rem",
  color: DORADO,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

export default function EditarFormacion({
  partidoId,
  plantel,
  plantelCompleto,
}: {
  partidoId: string;
  plantel: RosterJugador[];
  plantelCompleto: JugadorBusqueda[];
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<JugadorBusqueda | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const titulares = [...plantel].filter((j) => j.titular).sort(porDorsal);
  const suplentes = [...plantel].filter((j) => !j.titular).sort(porDorsal);
  const editando = plantel.find((j) => j.jugadorId === editandoId);

  // No repetir en el buscador a quien ya esta en esta formacion.
  const idsPlantel = useMemo(() => new Set(plantel.map((j) => j.jugadorId)), [plantel]);
  const resultados = useMemo(() => {
    const q = norm(busqueda.trim());
    if (q.length < 2) return [];
    return plantelCompleto.filter((j) => !idsPlantel.has(j.jugadorId) && norm(j.nombre).includes(q)).slice(0, 8);
  }, [busqueda, plantelCompleto, idsPlantel]);

  function cerrar() {
    setEditandoId(null);
    setBusqueda("");
    setSeleccionado(null);
    setError(null);
  }

  function confirmar() {
    if (!editandoId || !seleccionado) return;
    setError(null);
    startTransition(async () => {
      try {
        await reemplazarJugadorFormacion(partidoId, editandoId, seleccionado.jugadorId, seleccionado.nombre);
        router.refresh();
        cerrar();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo reemplazar");
      }
    });
  }

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: "1rem", marginTop: "1rem" }}>
      <h3 style={{ fontSize: "1rem", margin: "0 0 0.75rem", color: DORADO, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Editar formación
      </h3>

      {!editandoId && (
        <div style={listaOpciones}>
          <p style={{ margin: 0, fontSize: "0.78rem", color: DORADO_SUAVE, opacity: 0.8 }}>
            Tocá un jugador para reemplazarlo (lesión, enfermedad, etc.) antes de que arranque el partido.
          </p>
          {titulares.map((j) => (
            <button key={j.jugadorId} style={filaJugadorStyle} onClick={() => setEditandoId(j.jugadorId)}>
              <span>{j.dorsal} — {j.nombre}</span>
              <span style={cambiarStyle}>Cambiar</span>
            </button>
          ))}
          {suplentes.length > 0 && (
            <>
              <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: DORADO_SUAVE, textTransform: "uppercase", letterSpacing: 1 }}>
                Suplentes
              </p>
              {suplentes.map((j) => (
                <button key={j.jugadorId} style={filaJugadorStyle} onClick={() => setEditandoId(j.jugadorId)}>
                  <span>{j.dorsal} — {j.nombre}</span>
                  <span style={cambiarStyle}>Cambiar</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {editandoId && !seleccionado && (
        <div style={{ display: "grid", gap: 8 }}>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>
            Reemplazar a <strong>{editando?.nombre}</strong> ({editando?.dorsal})
          </p>
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
          {busqueda.trim().length >= 2 && resultados.length === 0 && (
            <p style={{ margin: 0, fontSize: "0.82rem", color: DORADO_SUAVE, opacity: 0.75 }}>Sin resultados.</p>
          )}
          {resultados.map((j) => (
            <button key={j.jugadorId} style={botonOpcion} onClick={() => setSeleccionado(j)}>
              {j.nombre}
            </button>
          ))}
          <button style={botonSecundario} onClick={cerrar}>
            Cancelar
          </button>
        </div>
      )}

      {editandoId && seleccionado && (
        <div>
          <p style={{ fontSize: "1.02rem" }}>
            Confirmar: sale <strong>{editando?.nombre}</strong>, entra <strong>{seleccionado.nombre}</strong>
          </p>
          {error && <p style={{ color: "crimson" }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={botonPrimario} disabled={isPending} onClick={confirmar}>
              {isPending ? "Guardando…" : "Confirmar"}
            </button>
            <button style={botonSecundario} disabled={isPending} onClick={cerrar}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
