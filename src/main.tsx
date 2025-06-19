// src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { WMSProvider } from './contexts/WMSContext'; // Asegúrate de que esta ruta sea correcta
import { Toaster } from '@/components/ui/toaster'; // Asegúrate de que esta ruta sea correcta para tu componente Toaster

createRoot(document.getElementById("root")!).render(
  // Utilizamos React.StrictMode para ayudar a detectar problemas potenciales en el desarrollo
  <React.StrictMode>
    {/* 1. WMSProvider: Envuelve toda tu aplicación para que todos los componentes
         descendientes puedan acceder a los productos, funciones de añadir, etc.,
         del contexto WMS.
    */}
    <WMSProvider>
      {/* 2. App: Tu componente principal que contendrá el resto de tus vistas y lógica.
      */}
      <App />
      {/* 3. Toaster: Este componente es necesario para que las notificaciones
           (como las de 'Producto agregado' o 'Error') se muestren en la interfaz.
           Debe estar dentro del WMSProvider o en un nivel que pueda acceder a los toasts.
      */}
      <Toaster />
    </WMSProvider>
  </React.StrictMode>
);