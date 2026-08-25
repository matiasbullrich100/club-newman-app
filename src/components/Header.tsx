import Image from "next/image";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

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
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: tituloHome ? "16px 6px 10px" : "6px 6px 10px",
      }}
    >
      {/* "20" y "26" de fondo, uno a cada lado del escudo (no "2026" entero atras, que quedaba
          tapado por el) -- igual que en las graficas de Instagram del club. */}
      {["20", "26"].map((mitad, i) => (
        <div
          key={mitad}
          aria-hidden
          style={{
            position: "absolute",
            top: tituloHome ? 3 : -7,
            left: i === 0 ? "30%" : "70%",
            transform: "translateX(-50%)",
            fontSize: "3.4rem",
            fontWeight: 800,
            letterSpacing: 6,
            color: DORADO,
            opacity: 0.16,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 0,
          }}
        >
          {mitad}
        </div>
      ))}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          width: "100%",
          maxWidth: 400,
          margin: "0 auto",
        }}
      >
        {/* Linea recta, pero DETRAS del escudo (menor z-index) -- el escudo mismo se angosta y
            hace punta abajo, asi que la linea queda tapada donde el escudo es solido y aparece a
            los costados donde no, sin tener que calcar la curva a mano. El "top" es una
            estimacion de a que altura del escudo (98px de alto) esta ese angostamiento -- ajustar
            si no coincide. */}
        <div
          style={{
            position: "absolute",
            top: 82,
            left: 0,
            right: 0,
            height: 1,
            background: DORADO,
            zIndex: 0,
          }}
        />
        {/* "Certa Bonum Certamen" / "Viriliter Age" -- una a cada lado del escudo, chicas, justo
            arriba de la linea (no una fila centrada debajo de todo el escudo). */}
        {["Certa Bonum Certamen", "Viriliter Age"].map((lema, i) => (
          <div
            key={lema}
            style={{
              position: "absolute",
              zIndex: 1,
              top: 66,
              left: i === 0 ? "22%" : "78%",
              transform: "translateX(-50%)",
              fontSize: "0.34rem",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: DORADO_SUAVE,
              opacity: 0.9,
              whiteSpace: "nowrap",
            }}
          >
            {lema}
          </div>
        ))}
        <div
          style={{
            position: "relative",
            zIndex: 1,
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
        <div style={{ position: "relative", zIndex: 1, width: 92, height: 98, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
            position: "relative",
            zIndex: 1,
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
          <span style={{ width: logo === "urba" ? 58 : 48, height: logo === "urba" ? 58 : 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Image
              src={logo === "urba" ? "/logo-urba.png" : "/logo-top14.png"}
              alt={logo === "urba" ? "URBA" : "URBA Top 14"}
              width={logo === "urba" ? 58 : 48}
              height={logo === "urba" ? 58 : 48}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </span>
        </div>
      </div>

      {tituloHome && (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            fontWeight: 700,
            fontSize: "1.35rem",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: DORADO,
            marginTop: 14,
          }}
        >
          Club Newman
        </div>
      )}
    </div>
  );
}
