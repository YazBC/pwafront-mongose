import { Router } from "express";
import { auth } from "../middleware/auth.js"; // IMPORTANTE: .js al final
import { list, create, update, remove } from "../controllers/task.controller.js"; // IMPORTANTE: .js al final

const router = Router();

// Middleware de autenticación
router.use(auth);

router.get('/', list); 
router.post('/', create); 
router.put('/:id', update); 
router.delete('/:id', remove); 

export default router;