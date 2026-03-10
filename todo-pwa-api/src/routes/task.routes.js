import { Router } from "express";
import { auth } from "../middleware/auth.js"; 
// CORRECCIÓN: Cambiamos bulkSync por bulksync (todo minúsculas) 👇
import { list, create, update, remove, bulksync } from "../controllers/task.controller.js"; 

const router = Router();

// Middleware de autenticación
router.use(auth);

router.get('/', list); 
router.post('/', create); 

router.post('/bulksync', bulksync); 

// Rutas con ID dinámico
router.patch('/:id', update); 
router.delete('/:id', remove); 

export default router; 