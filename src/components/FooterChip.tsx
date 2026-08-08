import { BORDO_OSC, DORADO } from "@/lib/colors";

export default function FooterChip() {
  return (
    <div style={{ textAlign: "center", margin: "18px 0 6px" }}>
      <span
        style={{
          display: "inline-block",
          background: DORADO,
          color: BORDO_OSC,
          fontWeight: 700,
          letterSpacing: 1,
          padding: "6px 16px",
          borderRadius: 6,
          fontSize: "0.8rem",
        }}
      >
        #dalebordó
      </span>
    </div>
  );
}
