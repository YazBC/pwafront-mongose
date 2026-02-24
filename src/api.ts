import axios from "axios";

// Detectamos la IP automáticamente:
// Si estás en la PC, hostname es "localhost".
// Si estás en el cel, hostname será tu IP (ej: 192.168.1.50).
const currentHost = window.location.hostname;

export const api = axios.create({
    // Asumimos que el backend siempre está en el puerto 4000 de la misma máquina
    baseURL: import.meta.env.VITE_API_URL || `http://${currentHost}:4000/api`,
});

export function setAuth(token: string | null) {
    if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common["Authorization"];
    }
}

setAuth(localStorage.getItem("token"));

api.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem("token");
            setAuth(null);
            window.location.href = "/login";
        }
        return Promise.reject(err);
    }
);