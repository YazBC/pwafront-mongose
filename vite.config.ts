import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {VitePWA} from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest:{
        name: "To-Do List",
    short_name: "To-Do",
    description: "Una aplicacion de lista de tareas simples y eficiente.",
    start_url: "standalone",
    background_color: "#ffffff",
    theme_color: "#af7247",
    icons: [
        {
            src: "/icons/icon192x192.png",
            sizes :"192x192",
            type: "image/png"
        },
        {
            src: "/icons/icon512x512.png",
            sizes :"512x512",
            type: "image/png"
        }
    ],
    screenshots:[
      {
        src: '/screenshots/Captura de pantalla.png',
        sizes:'955x1022',
        type: 'image/png',
      }
    ],
},
devOptions:{
  enabled: true
},
    }),
  ],
});
