import express from "express"; // <-- Corregido "ezpress"
import cors from "cors";
import morgan from "morgan";
import webpush from "web-push";
import cron from "node-cron";

import authRoutes from "./routes/auth.routes.js";
import taskRoutes from "./routes/task.routes.js"; // Asegúrate de que este archivo exista con este nombre
import pushRoutes from "./routes/push.routes.js"; // <-- Tu nueva ruta
import { connectToDB } from "./db/connect.js";
import Task from "./models/Task.js"; // <-- Importamos el modelo para el cron

const app = express();

// Configuración de Web-Push (El Cartero)
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

app.use(cors({
    origin: [
        "http://localhost:5173",
        process.env.FRONT_ORIGIN || "" // <-- Corregido para leer variables de entorno
    ].filter(Boolean),
    credentials: true
}));

app.use(express.json());
app.use(morgan("dev"));

// Conexion a mongo DB
app.use(async (_req, _res, next) => {
    try {
        await connectToDB(); 
        next();
    } catch (e) {
        next(e);
    }
});

app.get("/", (_req, res) => res.json({ok: true, name: "Yaz Todo Api"}));
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/push", pushRoutes); // <-- Activamos la ruta de suscripciones

// ==========================================
// EL RELOJ DESPERTADOR (Para entorno Local)
// ==========================================
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const nextMinute = new Date(now.getTime() + 60000); 

    // Buscamos tareas en la BD
    const tareasPorIniciar = await Task.find({
      status: { $ne: 'Completada' },
      fechaInicio: { $gte: now, $lt: nextMinute }
    }).populate('user'); 

    const tareasPorVencer = await Task.find({
      status: { $ne: 'Completada' },
      fechaVencimiento: { $gte: now, $lt: nextMinute }
    }).populate('user');

    // Función que dispara el mensaje
    const enviarNotificacion = async (tarea, titulo, mensaje) => {
      const suscripcion = tarea.user?.pushSubscription;
      if (suscripcion) {
        const payload = JSON.stringify({ title: titulo, body: mensaje });
        try {
          await webpush.sendNotification(suscripcion, payload);
          console.log(`Notificación enviada a: ${tarea.user.email}`);
        } catch (error) {
          console.error(`Error enviando push a ${tarea.user.email}:`, error.message);
        }
      }
    };

    // Procesamos las listas
    for (const t of tareasPorIniciar) {
      await enviarNotificacion(t, '¡Tarea por iniciar! ⏱️', `Tu tarea "${t.title}" está a punto de comenzar.`);
    }

    for (const t of tareasPorVencer) {
      await enviarNotificacion(t, '¡Tarea por vencer! ⏰', `La tarea "${t.title}" está a punto de finalizar.`);
    }

  } catch (error) {
    console.error('Error en el cron job:', error);
  }
});
// ==========================================

export default app;