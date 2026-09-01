"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cargarFormacion } from "@/lib/match/actions";
import { parsearFormacion } from "@/lib/formacionTexto";
import { parsearExcelFormaciones, type EquipoExcel } from "@/lib/formacionExcel";
import { playerId } from "@/lib/players";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

// Editor de la formación de un partido (pantalla /formaciones/cargar/[partidoId]).
//  - Subir Excel: lee el .xlsx del club y llena el cuadro (si trae varios equipos, elegís cuál).
//  - Pegar: el texto que copiaste de una foto (Live Text / Google Lens) o de otro lado.
//  - Escribir a mano.
// El parseo tolerante de texto vive en lib/formacionTexto.ts y el de Excel en lib/formacionExcel.ts;
// acá sólo se muestra el resultado y se manda a la Server Action cargarFormacion (queda en borrador).
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

  const fileRef = useRef<HTMLInputElement>(null);
  const [equiposExcel, setEquiposExcel] = useState<EquipoExcel[] | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Letra del equipo actual ("M19 C" -> "C", "Pre A" -> "A") -- para preseleccionar la columna
  // correcta cuando el Excel trae varios equipos.
  const letraEquipo = useMemo(() => {
    const t = categoriaNombre.trim().split(/\s+/).pop() ?? "";
    return /^[A-H]$/i.test(t) ? t.toUpperCase() : null;
  }, [categoriaNombre]);

  const { titulares, suplentes, avisos } = useMemo(() => parsearFormacion(texto), [texto]);

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

  function volcarAlCuadro(t: string[], s: string[]) {
    setTexto([...t, ...(s.length ? ["", "SUPLENTES:"] : []), ...s].join("\n"));
    setGuardado(false);
  }

  function elegirEquipoExcel(e: EquipoExcel) {
    volcarAlCuadro(e.titulares, e.suplentes);
    setEquiposExcel(null);
    setImportMsg(`Cargado del Excel: equipo ${e.etiqueta} (${e.titulares.length} titulares, ${e.suplentes.length} suplentes). Revisá la vista previa antes de guardar.`);
  }

  async function onArchivo(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;
    setImportMsg(null);
    setImportError(null);
    setEquiposExcel(null);
    try {
      const equipos = parsearExcelFormaciones(await file.arrayBuffer());
      if (equipos.length === 0) {
        setImportError("No encontré ninguna lista de jugadores en ese Excel. Probá copiando el texto y pegándolo abajo.");
        return;
      }
      if (equipos.length === 1) {
        elegirEquipoExcel(equipos[0]);
        return;
      }
      // Varios equipos en el archivo: si uno coincide con la letra de esta categoría, lo cargo
      // directo igual (queda para revisar); si no, muestro los botones para elegir.
      const match = letraEquipo ? equipos.find((e) => e.etiqueta.toUpperCase() === letraEquipo) : undefined;
      if (match) {
        elegirEquipoExcel(match);
        setEquiposExcel(equipos); // deja los botones por si la coincidencia no era la buena
      } else {
        setEquiposExcel(equipos);
        setImportMsg(`El Excel trae ${equipos.length} equipos. Elegí cuál es este.`);
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "No pude leer el Excel.");
    }
  }

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

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <button type="button" onClick={() => fileRef.current?.click()} style={botonSecundario}>
          📄 Subir Excel
        </button>
        <input ref={fileRef} type="file" accept=".xlsx" onChange={onArchivo} style={{ display: "none" }} />
        <span style={{ fontSize: "0.72rem", color: DORADO_SUAVE, opacity: 0.75 }}>o pegá / escribí abajo</span>
      </div>

      {equiposExcel && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {equiposExcel.map((e) => (
            <button
              key={e.etiqueta}
              type="button"
              onClick={() => elegirEquipoExcel(e)}
              style={{
                ...botonSecundario,
                ...(letraEquipo && e.etiqueta.toUpperCase() === letraEquipo ? { borderColor: DORADO, color: DORADO } : {}),
              }}
            >
              {e.etiqueta} · {e.titulares.length}+{e.suplentes.length}
            </button>
          ))}
        </div>
      )}
      {importMsg && <p style={{ margin: "0 0 8px", fontSize: "0.74rem", color: DORADO_SUAVE }}>{importMsg}</p>}
      {importError && <p style={{ margin: "0 0 8px", fontSize: "0.74rem", color: "crimson" }}>{importError}</p>}

      <p style={{ fontSize: "0.78rem", color: DORADO_SUAVE, opacity: 0.85, margin: "0 0 6px", lineHeight: 1.5 }}>
        Un jugador por línea, en orden. Los <b>primeros 15 son titulares</b> (camiseta 1 a 15) y del
        16 en adelante, suplentes. Poné una línea que diga <b>SUPLENTES</b> para separar el banco. Los
        números de camiseta que traigas adelante se ignoran.
      </p>
      <p style={{ fontSize: "0.72rem", color: DORADO_SUAVE, opacity: 0.7, margin: "0 0 8px", lineHeight: 1.5 }}>
        📷 ¿Te mandaron una foto? En el celular mantené apretada la imagen y elegí <b>Copiar texto</b>{" "}
        (Texto en vivo en iPhone, Google Lens en Android); después pegalo acá.
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

const botonSecundario: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid rgba(226,197,120,.4)",
  background: "transparent",
  color: DORADO_SUAVE,
  fontWeight: 700,
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: 0.4,
  cursor: "pointer",
};
