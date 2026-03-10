import { useEffect, useMemo, useState } from "react";
import { api, setAuth } from "../api";
import {
  cacheTasks, getAllTasksLocal, putTaskLocal, removeTaskLocal,
} from "../offline/db";
import { syncNow, setupOnlineSync } from "../offline/sync";

// === Firebase SDK ===
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBIaCVh9j4wRslxXKIzzIU2KdJu5s2cj6s",
  authDomain: "pwa-yaz.firebaseapp.com",
  projectId: "pwa-yaz",
  storageBucket: "pwa-yaz.firebasestorage.app",
  messagingSenderId: "523783868114",
  appId: "1:523783868114:web:ab34185f4d0d9bc476670b"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

type Status = "Pendiente" | "En Progreso" | "Completada";

type Task = {
  _id: string;
  title: string;
  description?: string;
  status: Status;
  clienteId?: string;
  createdAt?: string;
  deleted?: boolean;
  pending?: boolean;
  fechaInicio?: string;
  fechaVencimiento?: string;
};

const formatDateForInput = (dateString?: string) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const tzoffset = d.getTimezoneOffset() * 60000; 
  return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
};

const displayDate = (dateString?: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString('es-ES', { 
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
  });
};

function normalizeTask(x: any): Task {
  return {
    _id: String(x?._id ?? x?.id),
    title: String(x?.title ?? "(sin título)"),
    description: x?.description ?? "",
    status: (x?.status === "Completada" || x?.status === "En Progreso" || x?.status === "Pendiente") ? x.status : "Pendiente",
    clienteId: x?.clienteId,
    createdAt: x?.createdAt,
    deleted: !!x?.deleted,
    pending: !!x?.pending,
    fechaInicio: x?.fechaInicio,
    fechaVencimiento: x?.fechaVencimiento,
  };
}

export default function Dashboard() {
  // Arreglado: Se agregó 'loading' para evitar error TS6133
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [search, setSearch] = useState("");
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingFechaInicio, setEditingFechaInicio] = useState("");
  const [editingFechaVencimiento, setEditingFechaVencimiento] = useState("");

  const [isAdding, setIsAdding] = useState(false);
  const [showHoy, setShowHoy] = useState(true);
  const [showProx, setShowProx] = useState(true);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    setAuth(localStorage.getItem("token"));
    const unsubscribe = setupOnlineSync();
    const on = async () => { setOnline(true); await syncNow(); await loadFromServer(); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    (async () => {
      const local = await getAllTasksLocal();
      if (local?.length) setTasks(local.map(normalizeTask));
      await loadFromServer();
      await syncNow();
    })();
    return () => { unsubscribe?.(); window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  async function loadFromServer() {
    try {
      const { data } = await api.get("/tasks"); 
      const raw = Array.isArray(data?.items) ? data.items : [];
      const list = raw.map(normalizeTask);
      setTasks(list);
      await cacheTasks(list);
    } catch { } finally { setLoading(false); }
  }

  async function activarNotificaciones() {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, { vapidKey: 'BC4MGZo6aYYQDqQ2fcXUKdZpRHt3n7s5ZTC1AKBoMjubI08fvJn_nx3rD3YyoV2JVCLCrUFczTgRRwp6I4J--IY' });
        if (token) await api.post("/push/subscribe", { token });
      }
    } catch { }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const clienteId = crypto.randomUUID();
    const localTask = normalizeTask({ _id: clienteId, title, description, status: "Pendiente", pending: !navigator.onLine, fechaInicio, fechaVencimiento });
    setTasks(prev => [localTask, ...prev]);
    await putTaskLocal(localTask);
    setTitle(""); setDescription(""); setFechaInicio(""); setFechaVencimiento("");
    setIsAdding(false);
    if (navigator.onLine) {
      try {
        const { data } = await api.post("/tasks", { title: localTask.title, description: localTask.description, fechaInicio, fechaVencimiento });
        const created = normalizeTask(data?.task ?? data);
        setTasks(prev => prev.map(x => (x._id === clienteId ? created : x)));
        await putTaskLocal(created);
      } catch { }
    }
  }

  async function handleStatusChange(task: Task, newStatus: Status) {
    const updated = { ...task, status: newStatus };
    setTasks(prev => prev.map(x => (x._id === task._id ? updated : x)));
    await putTaskLocal(updated);
    if (navigator.onLine) {
      try {
        await api.put(`/tasks/${task._id}`, { status: newStatus });
      } catch (e) {
        console.error("Error al sincronizar estado", e);
      }
    }
  }

  async function saveEdit(taskId: string) {
    if (!editingTitle.trim()) return;
    const before = tasks.find(t => t._id === taskId);
    const patched = { ...before, title: editingTitle, description: editingDescription, fechaInicio: editingFechaInicio, fechaVencimiento: editingFechaVencimiento } as Task;
    setTasks(prev => prev.map(t => (t._id === taskId ? patched : t)));
    await putTaskLocal(patched);
    setEditingId(null);
    if (navigator.onLine) {
      try { await api.put(`/tasks/${taskId}`, { title: editingTitle, description: editingDescription, fechaInicio: editingFechaInicio, fechaVencimiento: editingFechaVencimiento }); } catch { }
    }
  }

  function startEdit(task: Task) {
    setEditingId(task._id);
    setEditingTitle(task.title);
    setEditingDescription(task.description ?? "");
    setEditingFechaInicio(formatDateForInput(task.fechaInicio));
    setEditingFechaVencimiento(formatDateForInput(task.fechaVencimiento));
  }

  async function removeTask(taskId: string) {
    setTasks(prev => prev.filter(t => t._id !== taskId));
    await removeTaskLocal(taskId);
    if (navigator.onLine) await api.delete(`/tasks/${taskId}`);
  }

  const groupedTasks = useMemo(() => {
    let list = tasks;
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(s));
    }
    const todayStr = new Date().toLocaleDateString();
    return {
      hoy: list.filter(t => t.status !== "Completada" && t.fechaVencimiento && new Date(t.fechaVencimiento).toLocaleDateString() === todayStr),
      proximamente: list.filter(t => t.status !== "Completada" && (!t.fechaVencimiento || new Date(t.fechaVencimiento).toLocaleDateString() !== todayStr)),
      completadas: list.filter(t => t.status === "Completada")
    };
  }, [tasks, search]);

  const renderTask = (t: Task) => (
    <div key={t._id} className={`item ${t.status === "Completada" ? "done" : (t.fechaVencimiento && new Date(t.fechaVencimiento).toLocaleDateString() === new Date().toLocaleDateString() ? "priority-today" : "priority-future")}`}>
      <select value={t.status} onChange={e => handleStatusChange(t, e.target.value as Status)} className="status-select">
        <option value="Pendiente">Pendiente</option>
        <option value="En Progreso">En Progreso</option>
        <option value="Completada">Completada</option>
      </select>
      <div className="content">
        {editingId === t._id ? (
          <div style={{ display: 'grid', gap: '8px' }}>
            <input className="search" value={editingTitle} onChange={e => setEditingTitle(e.target.value)} autoFocus />
            <textarea className="search" value={editingDescription} onChange={e => setEditingDescription(e.target.value)} rows={2} />
            <div style={{ display: 'flex', gap: '5px' }}>
              <input type="datetime-local" className="search" value={editingFechaInicio} onChange={e => setEditingFechaInicio(e.target.value)} />
              <input type="datetime-local" className="search" value={editingFechaVencimiento} onChange={e => setEditingFechaVencimiento(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button className="btn danger" onClick={() => setEditingId(null)}>Cancelar</button>
              <button className="btn primary" style={{ flex: 1 }} onClick={() => saveEdit(t._id)}>Actualizar</button>
            </div>
          </div>
        ) : (
          <>
            <span className="title" style={{ textDecoration: t.status === "Completada" ? "line-through" : "none" }} onDoubleClick={() => startEdit(t)}>{t.title}</span>
            {t.description && <p className="desc">{t.description}</p>}
            <div className="task-meta">
              {t.fechaInicio && <span>⏱️ {displayDate(t.fechaInicio)}</span>}
              {t.fechaVencimiento && <span>⏰ {displayDate(t.fechaVencimiento)}</span>}
            </div>
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => startEdit(t)}>✏️</button>
        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => removeTask(t._id)}>🗑️</button>
      </div>
    </div>
  );

  return (
    <div className="wrap">
      {/* Puedes usar la variable 'loading' aquí si quieres mostrar un spinner */}
      {loading && <div className="loading-bar" style={{position: 'fixed', top: 0, left: 0, width: '100%', height: '3px', background: '#388bfd'}}></div>}
      
      <header className="topbar">
        <h1>To-Do PWA</h1>
        <div className="stats-badges">
          <span className="badge" style={{ background: online ? "#238636" : "#b45309", padding: '4px 10px', borderRadius: '15px' }}>{online ? "En línea" : "Offline"}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" style={{ background: '#d29922' }} onClick={activarNotificaciones}>🔔</button>
          <button className="btn danger" onClick={() => { localStorage.removeItem("token"); window.location.href = "/"; }}>Salir</button>
        </div>
      </header>

      <main className="container">
        {!isAdding ? (
          <button onClick={() => setIsAdding(true)} style={{ background: '#238636', color: 'white', width: '100%', padding: '15px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px' }}>➕ Nueva Tarea</button>
        ) : (
          <div className="expandable-panel">
            <h2 style={{ marginBottom: '15px' }}>Nueva Tarea</h2>
            <form onSubmit={addTask} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input className="search" value={title} onChange={e => setTitle(e.target.value)} placeholder="¿Qué hay que hacer?" autoFocus />
              <textarea className="search" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción..." rows={2} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="datetime-local" className="search" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
                <input type="datetime-local" className="search" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn danger" style={{ flex: 1 }} onClick={() => setIsAdding(false)}>Cancelar</button>
                <button type="submit" className="btn primary" style={{ flex: 2, background: '#388bfd' }}>Guardar</button>
              </div>
            </form>
          </div>
        )}

        <div className="toolbar">
          <input className="search" placeholder="Buscar tareas..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <section>
          <div className="section-header" onClick={() => setShowHoy(!showHoy)}>
            <h2>📅 Para Hoy ({groupedTasks.hoy.length})</h2>
            <span className={`arrow ${showHoy ? 'open' : ''}`}>▼</span>
          </div>
          {showHoy && <div className="section-content">{groupedTasks.hoy.map(renderTask)}</div>}
        </section>

        <section>
          <div className="section-header" onClick={() => setShowProx(!showProx)}>
            <h2>⌛ Próximamente ({groupedTasks.proximamente.length})</h2>
            <span className={`arrow ${showProx ? 'open' : ''}`}>▼</span>
          </div>
          {showProx && (
            <div className="section-content">
              {groupedTasks.proximamente.length === 0 ? <p style={{ color: '#8b949e', padding: '15px' }}>No hay pendientes</p> : groupedTasks.proximamente.map(renderTask)}
            </div>
          )}
        </section>

        <section>
          <div className="section-header" onClick={() => setShowDone(!showDone)}>
            <h2>✅ Completadas ({groupedTasks.completadas.length})</h2>
            <span className={`arrow ${showDone ? 'open' : ''}`}>▼</span>
          </div>
          {showDone && <div className="section-content">{groupedTasks.completadas.map(renderTask)}</div>}
        </section>
      </main>
    </div>
  );
}