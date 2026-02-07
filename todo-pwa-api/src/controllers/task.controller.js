import Task from "../models/Task.js"; // IMPORTANTE: .js al final

const allowed = ["Pendiente", "En progreso", "Completado"];

export async function list(req, res) {
    try {
        const items = await Task.find({ user: req.userId, deleted: false })
            .sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: "Error al listar tareas" });
    }
}

export async function create(req, res) {
    const { title, description = "", status = "Pendiente", clienteId } = req.body;
    
    if (!title) return res.status(400).json({ message: 'El título es obligatorio' });

    try {
        const task = await Task.create({
            user: req.userId,
            title,
            description,
            status: allowed.includes(status) ? status : 'Pendiente',
            clienteId
        });
        
        res.status(201).json(task);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Ya existe una tarea con ese ID de cliente" });
        }
        res.status(500).json({ message: "Error al crear la tarea" });
    }
}

export async function update(req, res) {
    const { id } = req.params;
    const { title, description, status } = req.body;

    if (status && !allowed.includes(status))
        return res.status(400).json({ message: "Estado inválido" });

    try {
        const task = await Task.findOneAndUpdate(
            { _id: id, user: req.userId },
            { title, description, status },
            { new: true }
        );
        
        if (!task) return res.status(404).json({ message: "Tarea no encontrada" });
        res.json({ task });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar" });
    }
}

export async function remove(req, res) {
    const { id } = req.params;
    try {
        const task = await Task.findOneAndUpdate(
            { _id: id, user: req.userId },
            { deleted: true },
            { new: true }
        );
        
        if (!task) return res.status(404).json({ message: "Tarea no encontrada" });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar" });
    }
}