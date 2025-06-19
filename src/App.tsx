// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { WMSProvider } from './contexts/WMSContext'; // ¡Importa tu WMSProvider aquí!

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* Toaster y Sonner ya están aquí, lo cual es correcto */}
      <Toaster />
      <Sonner />
      
      {/* Envuelve tu BrowserRouter y tus rutas con WMSProvider
          Esto asegura que todos los componentes dentro de tus rutas
          (como tu InventoryView que probablemente está en Index)
          tengan acceso al contexto WMS.
      */}
      <WMSProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </WMSProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;