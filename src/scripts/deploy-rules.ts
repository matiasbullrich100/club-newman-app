// Publica firestore.rules en el proyecto real. Correr con: npx tsx src/scripts/deploy-rules.ts
import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { getSecurityRules } = await import("firebase-admin/security-rules");
  const { getApps, initializeApp, cert } = await import("firebase-admin/app");

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
    });
  }

  const rulesSource = readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8");
  const securityRules = getSecurityRules();
  await securityRules.releaseFirestoreRulesetFromSource(rulesSource);
  console.log("Reglas de Firestore publicadas correctamente.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
