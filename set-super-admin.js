// set-super-admin.js
import 'dotenv/config';                // <- si tu archivo se llama .env
// O si querés forzar .env.local en vez de .env:
import { config } from 'dotenv';
config({ path: '.env.local' });

import admin from "firebase-admin";

function getCreds() {
  if (process.env.FB_ADMIN_JSON) {
    return admin.credential.cert(JSON.parse(process.env.FB_ADMIN_JSON));
  }
  return admin.credential.cert("./serviceAccountKey.json"); // fallback opcional
}

admin.initializeApp({ credential: getCreds() });

const EMAIL = "federudiero@gmail.com";

async function run() {
  const u = await admin.auth().getUserByEmail(EMAIL);
  await admin.auth().setCustomUserClaims(u.uid, { super_admin: true });
  console.log(`✅ ${EMAIL} ahora tiene { super_admin: true }`);
}
run().catch((e) => { console.error(e); process.exit(1); });
