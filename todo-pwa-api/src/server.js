import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import cron from 'node-cron';

// Rutas
import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/task.routes.js';
import pushRoutes from './routes/push.routes.js';

// Modelos
import Task from './models/Task.js';

// Importamos el nuevo cartero (Firebase)
import { sendPushNotification } from './controllers/push.controller.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (req, res) =>
  res.json({ ok: true, name: 'Proyecto Yaz API' })
);

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/push', pushRoutes);

// ==========================================
// EL RELOJ DESPERTADOR (Cron Job Actualizado)
// ==========================================
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();

    // 1. Buscar tareas que ya iniciaron y NO han sido notificadas
    const tareasPorIniciar = await Task.find({
      status: { $ne: 'Completada' },
      fechaInicio: { $lte: now }, // Tareas que ya empezaron o empiezan ahora
      notificadoInicio: { $ne: true } // Que no hayamos avisado antes
    });

    // 2. Buscar tareas que ya vencieron y NO han sido notificadas
    const tareasPorVencer = await Task.find({
      status: { $ne: 'Completada' },
      fechaVencimiento: { $lte: now }, // Tareas que ya vencieron o vencen ahora
      notificadoFin: { $ne: true } // Que no hayamos avisado antes
    });

    // Disparamos mensajes de inicio usando Firebase
    for (const t of tareasPorIniciar) {
      console.log(`🚀 Disparando notificación de inicio para: ${t.title}`);
      await sendPushNotification({
        title: '¡Tarea por iniciar! ⏱️',
        body: `Tu tarea "${t.title}" ya debería haber comenzado.`
      });
      // Marcamos como notificada para que no se repita en el siguiente minuto
      t.notificadoInicio = true;
      await t.save();
    }

    // Disparamos mensajes de vencimiento usando Firebase
    for (const t of tareasPorVencer) {
      console.log(`⏰ Disparando notificación de vencimiento para: ${t.title}`);
      await sendPushNotification({
        title: '¡Tarea vencida! ⏰',
        body: `La tarea "${t.title}" ha finalizado.`
      });
      // Marcamos como notificada
      t.notificadoFin = true;
      await t.save();
    }

  } catch (error) {
    console.error('Error en el cron job:', error);
  }
});

const { PORT = 4000, MONGO_URI } = process.env;

mongoose.connect(MONGO_URI, { dbName: 'Cluster0' })
  .then(() => {
    console.log('Conectado a mongoDB', mongoose.connection.name);
    app.listen(PORT, () =>
      console.log(`Servidor ejecutándose por el puerto: ${PORT}`)
    );
  })
  .catch(err => {
    console.error('Error conectando a mongoDB', err);
    process.exit(1);
  });