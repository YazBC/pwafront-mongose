import admin from "firebase-admin";
import { readFile } from "fs/promises";

let serviceAccount;

// ==========================================
// CONFIGURACIÓN DE CREDENCIALES (EL ARREGLO)
// ==========================================
try {
  // 1. Intenta leer el archivo físico (esto funcionará en tu PC Local)
  serviceAccount = JSON.parse(
    await readFile(new URL("../../firebase-key.json", import.meta.url))
  );
  console.log("🔑 Firebase cargado desde archivo local.");
} catch (error) {
  // 2. Si falla (como en Vercel), intenta usar la Variable de Entorno
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log("☁️ Firebase cargado desde Variables de Entorno de Vercel.");
  } else {
    console.error("❌ ERROR: No se encontró la llave de Firebase en ninguna fuente.");
  }
}

// 3. Inicializar Firebase con la llave encontrada
if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// ==========================================
// LÓGICA DE SUSCRIPCIONES Y ENVÍO (LO QUE YA FUNCIONA)
// ==========================================

// Lista temporal de tokens (Nota: Se reinicia si el servidor de Vercel se duerme)
let fcmTokens = []; 

export const subscribe = (req, res) => {
  const { token } = req.body; 
  
  if (!token) {
    return res.status(400).json({ error: "Falta el token de Firebase" });
  }

  if (!fcmTokens.includes(token)) {
    fcmTokens.push(token);
    console.log("✅ Token guardado en el servidor");
  }
  
  console.log(`📱 Dispositivos activos: ${fcmTokens.length}`);
  res.status(200).json({ message: "Suscrito con éxito" });
};

export const sendPushNotification = async (payload) => {
  if (fcmTokens.length === 0) {
    console.log("⚠️ No hay dispositivos suscritos en este momento.");
    return;
  }

  // Estructura para Firebase Admin SDK
  const message = {
    notification: {
      title: payload.title,
      body: payload.body
    },
    tokens: fcmTokens 
  };

  try {
    // Usamos sendEachForMulticast para mayor compatibilidad
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`🚀 Notificaciones enviadas: ${response.successCount} éxitos, ${response.failureCount} errores`);
  } catch (error) {
    console.error("❌ Error crítico al enviar FCM:", error);
  }
};