import Link from "next/link";
import { DORADO } from "@/lib/colors";

export default function BackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontWeight: 700,
        fontSize: "0.78rem",
        letterSpacing: 1,
        textTransform: "uppercase",
        color: DORADO,
        position: "fixed",
        top: 12,
        left: 12,
        zIndex: 100,
        background: "rgba(53,9,22,.92)",
        border: `2px solid ${DORADO}`,
        padding: "5px 10px",
        borderRadius: 20,
        width: "fit-content",
      }}
    >
      ← Volver
    </Link>
  );
}
