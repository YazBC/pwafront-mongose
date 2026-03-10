import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { subscribe } from "../controllers/push.controller.js";

const router = Router();

// Ruta protegida: el usuario debe tener token para suscribirse
router.post("/subscribe", auth, subscribe);

export default router;