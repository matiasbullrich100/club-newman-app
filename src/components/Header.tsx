import Image from "next/image";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

function LineaDorada() {
  return (
    <span
      style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, #f2a900, transparent)" }}
    />
  );
}

export default function Header({
  rightLabel,
  tituloHome,
  logo = "top14",
}: {
  rightLabel?: string;
  tituloHome?: boolean;
  // Juveniles no juega el torneo "TOP 14" (eso es una categoria puntual de Plantel Superior) --
  // ahi va el escudo generico de URBA en vez del de TOP 14.
  logo?: "top14" | "urba";
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: tituloHome ? "16px 6px 10px" : "6px 6px 10px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          width: "100%",
          maxWidth: 400,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: "1.15rem",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: DORADO,
            textAlign: "left",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          Rugby
        </div>
        <div style={{ width: 92, height: 98, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Image
            src="/escudo-newman.png"
            alt="Escudo Club Newman"
            width={92}
            height={98}
            style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 3px 8px rgba(0,0,0,.45))" }}
            priority
          />
        </div>
        <div
          style={{
            textAlign: "right",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 6,
            fontWeight: 700,
            fontSize: "1.15rem",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: DORADO,
            minWidth: 0,
          }}
        >
          {rightLabel && (
            <span
              style={{
                marginRight: 8,
                // Etiquetas largas ("M15 · Fecha 1") no entran en una linea a este tamano --
                // en vez de cortarlas con "...", se achican y se dejan envolver en 2 lineas.
                fontSize: rightLabel.length > 8 ? "0.72rem" : "1em",
                lineHeight: 1.15,
                letterSpacing: rightLabel.length > 8 ? 0.5 : undefined,
                whiteSpace: "normal",
              }}
            >
              {rightLabel}
            </span>
          )}
          <span style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Image
              src={logo === "urba" ? "/logo-urba.png" : "/logo-top14.png"}
              alt={logo === "urba" ? "URBA" : "URBA Top 14"}
              width={48}
              height={48}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          maxWidth: 400,
          margin: "7px auto 0",
          fontSize: "0.62rem",
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: DORADO_SUAVE,
          opacity: 0.85,
        }}
      >
        <LineaDorada />
        Certa Bonum Certamen
        <LineaDorada />
        Viriliter Age
        <LineaDorada />
      </div>

      {tituloHome && (
        <>
          <div style={{ fontWeight: 700, fontSize: "1.35rem", letterSpacing: 1.5, textTransform: "uppercase", color: DORADO, marginTop: 14 }}>
            Club Newman
          </div>
          <div style={{ fontSize: "0.8rem", letterSpacing: 3, color: "#f7f1e4", opacity: 0.75, marginTop: 4 }}>2026</div>
        </>
      )}
    </div>
  );
}
