"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cargarFormacion } from "@/lib/match/actions";
import { parsearFormacion } from "@/lib/formacionTexto";
import { playerId } from "@/lib/players";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

// Editor de la formación de un partido (pantalla /formaciones/cargar/[partidoId]). Un cuadro de
// texto grande + vista previa numerada. El parseo tolerante vive en lib/formacionTexto.ts; acá
// sólo se muestra el resultado y se manda a la Server Action cargarFormacion (queda en borrador).
export default function CargarFormacionEditor({
  partidoId,
  categoriaNombre,
  rival,
  numeroFecha,
  fecha,
  textoInicial,
}: {
  partidoId: string;
  categoriaNombre: string;
  rival: string;
  numeroFecha: string;
  fecha: string | null;
  textoInicial: string;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(textoInicial);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { titulares, suplentes, avisos } = useMemo(() => parsearFormacion(texto), [texto]);

  // Nombres que "cuentan como el mismo jugador" (mismo id normalizado) -- bloquean guardar, igual
  // que en el script y en la propia Server Action.
  const duplicado = useMemo(() => {
    const vistos = new Map<string, string>();
    for (const nombre of [...titulares, ...suplentes]) {
      const id = playerId(nombre);
      const previo = vistos.get(id);
      if (previo) return { a: previo, b: nombre };
      vistos.set(id, nombre);
    }
    return null;
  }, [titulares, suplentes]);

  const errorBloqueante =
    titulares.length === 0
      ? "Falta la lista de titulares."
      : titulares.length > 15
        ? `Hay ${titulares.length} titulares (el máximo es 15). Poné una línea que diga SUPLENTES para separar el banco.`
        : suplentes.length > 15
          ? `Hay ${suplentes.length} suplentes (el máximo es 15).`
          : duplicado
            ? `"${duplicado.b}" y "${duplicado.a}" cuentan como el mismo jugador — dejá uno solo.`
            : null;

  function guardar() {
    setError(null);
    setGuardado(false);
    startTransition(async () => {
      try {
        await cargarFormacion(partidoId, { titulares, suplentes });
        setGuardado(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: "0.72rem", color: DORADO_SUAVE }}>
          {categoriaNombre} · Fecha {numeroFecha}
        </div>
        <div style={{ fontSize: "1rem", color: "#f7f1e4", marginTop: 2 }}>
          Newman vs {rival}
          {fecha ? ` · ${fecha}` : ""}
        </div>
      </div>

      <p style={{ fontSize: "0.78rem", color: DORADO_SUAVE, opacity: 0.85, margin: "0 0 8px", lineHeight: 1.5 }}>
        Un jugador por línea, en orden. Los <b>primeros 15 son titulares</b> (camiseta 1 a 15) y del
        16 en adelante, suplentes. Podés escribir mirando la foto o pegar desde el Excel. Si querés
        marcar el banco, poné una línea que diga <b>SUPLENTES</b>. Los números de camiseta que
        traigas adelante se ignoran.
      </p>

      <textarea
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setGuardado(false);
        }}
        rows={14}
        spellCheck={false}
        placeholder={"Barletta, Santino\nLlavallol, Geronimo\n…\nSUPLENTES:\nMatta y Trejo, Alfonso\nVallaco, Juan Cruz"}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px solid rgba(226,197,120,.35)",
          background: "rgba(0,0,0,.25)",
          color: "#f7f1e4",
          fontSize: 16, // 16px: evita que el celular haga zoom al enfocar
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          lineHeight: 1.5,
          resize: "vertical",
        }}
      />

      <div
        style={{
          marginTop: 12,
          background: "linear-gradient(160deg, rgba(0,0,0,.3), rgba(0,0,0,.15))",
          border: "1px solid rgba(226,197,120,.25)",
          borderRadius: 10,
          padding: "10px 12px",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.62rem", color: DORADO, marginBottom: 4 }}>
              Titulares ({titulares.length})
            </div>
            <ol style={{ margin: 0, paddingLeft: 22, fontSize: "0.8rem", color: "#f7f1e4", lineHeight: 1.55 }}>
              {titulares.map((n, i) => (
                <li key={`t-${i}`}>{n}</li>
              ))}
              {titulares.length === 0 && <li style={{ listStyle: "none", marginLeft: -22, opacity: 0.6 }}>—</li>}
            </ol>
          </div>
          <div>
            <div style={{ textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.62rem", color: DORADO, marginBottom: 4 }}>
              Suplentes ({suplentes.length})
            </div>
            <ol start={16} style={{ margin: 0, paddingLeft: 26, fontSize: "0.8rem", color: "#f7f1e4", lineHeight: 1.55 }}>
              {suplentes.map((n, i) => (
                <li key={`s-${i}`}>{n}</li>
              ))}
              {suplentes.length === 0 && <li style={{ listStyle: "none", marginLeft: -26, opacity: 0.6 }}>—</li>}
            </ol>
          </div>
        </div>

        {avisos.length > 0 && !errorBloqueante && (
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: "0.72rem", color: DORADO }}>
            {avisos.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        )}
        {errorBloqueante && (
          <p style={{ margin: "8px 0 0", fontSize: "0.74rem", color: "crimson" }}>{errorBloqueante}</p>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={guardar}
          disabled={isPending || !!errorBloqueante}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: `1px solid ${DORADO}`,
            background: isPending || errorBloqueante ? "rgba(226,197,120,.12)" : DORADO,
            color: isPending || errorBloqueante ? DORADO_SUAVE : "#350916",
            fontWeight: 700,
            fontSize: "0.78rem",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            cursor: isPending || errorBloqueante ? "default" : "pointer",
          }}
        >
          {isPending ? "Guardando…" : "Guardar borrador"}
        </button>
        {guardado && (
          <span style={{ fontSize: "0.78rem", color: DORADO_SUAVE }}>
            Guardado ✓ — ahora tocá <Link href="/formaciones" style={{ color: DORADO, textDecoration: "underline" }}>Publicar</Link> en Formaciones.
          </span>
        )}
        {error && <span style={{ fontSize: "0.78rem", color: "crimson" }}>{error}</span>}
      </div>

      <p style={{ fontSize: "0.7rem", color: DORADO_SUAVE, opacity: 0.7, marginTop: 14 }}>
        Para cambiar un solo jugador (lesión de último momento) sin repegar todo, entrá al{" "}
        <Link href={`/partido/${partidoId}`} style={{ color: DORADO_SUAVE, textDecoration: "underline" }}>
          partido
        </Link>{" "}
        y usá “Editar formación”.
      </p>
    </div>
  );
}
