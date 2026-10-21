import { redirect } from "next/navigation";

// Los cruces ahora estan en la pantalla de Playoff (/playoff), junto con los clasificados, el dia, la hora y la sede.
export default function PlayoffCrucesRedirect() {
  redirect("/playoff");
}
