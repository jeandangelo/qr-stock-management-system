// src/components/views/DashboardView.tsx
import React, { useState, useEffect } from 'react'; // Importa useState y useEffect
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, TrendingUp, AlertTriangle, Activity } from 'lucide-react';

// --- Interfaces para los datos que esperamos del backend ---
interface DashboardStats {
  totalProducts: number;
  totalValuedStock: number;
  lowStockItems: number;
  movementsToday: number;
}

interface RecentMovement {
  id: number;
  product_name: string; // Coincide con 'product_name' del backend
  type: string;        // Coincide con 'type' del backend
  quantity: number;
  time: string;        // Coincide con 'time' del backend (hora formateada)
}

interface LowStockAlert {
  id: number;
  product_name: string; // Coincide con 'product_name' del backend
  current_stock: number; // Coincide con 'current_stock' del backend
  min_stock: number;   // Coincide con 'min_stock' del backend
}

// --- Funciones para llamar a tu API (pueden ir en src/services/api.ts) ---
const API_BASE_URL = 'http://localhost:3001/api'; // ¡ASEGÚRATE DE QUE ESTA SEA LA URL CORRECTA DE TU BACKEND!

async function getDashboardStats(): Promise<DashboardStats> {
  const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
  if (!response.ok) {
    throw new Error('Error al obtener las estadísticas del dashboard');
  }
  return response.json();
}

async function getRecentActivity(): Promise<RecentMovement[]> {
  const response = await fetch(`${API_BASE_URL}/dashboard/recent-activity`);
  if (!response.ok) {
    throw new Error('Error al obtener la actividad reciente');
  }
  return response.json();
}

async function getLowStockAlerts(): Promise<LowStockAlert[]> {
  const response = await fetch(`${API_BASE_URL}/products/low-stock`);
  if (!response.ok) {
    throw new Error('Error al obtener las alertas de stock bajo');
  }
  return response.json();
}

// --- Componente DashboardView ---
export const DashboardView = () => {
  // Estados para los datos del dashboard
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true); // Inicia el estado de carga

        // Carga las estadísticas
        const statsData = await getDashboardStats();
        setStats(statsData);

        // Carga la actividad reciente
        const activityData = await getRecentActivity();
        setRecentMovements(activityData);

        // Carga las alertas de stock bajo
        const alertsData = await getLowStockAlerts();
        setLowStockAlerts(alertsData);

      } catch (err: any) {
        console.error("Error al cargar datos del dashboard:", err);
        setError(err.message || "Error desconocido al cargar el dashboard.");
      } finally {
        setLoading(false); // Finaliza el estado de carga
      }
    };

    fetchData();
  }, []); // El array vacío [] asegura que este efecto se ejecute solo una vez al montar

  // Renderizado condicional basado en el estado de carga y error
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <p className="text-lg text-gray-700">Cargando datos del dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <p className="text-lg text-red-600">Error al cargar el dashboard: {error}</p>
      </div>
    );
  }

  // Si no hay datos después de cargar (por ejemplo, si las tablas están vacías)
  if (!stats) {
      return (
          <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
              <p className="text-lg text-gray-700">No hay datos disponibles para el dashboard.</p>
          </div>
      );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Resumen general del almacén</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Productos */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Productos
            </CardTitle>
            <div className="bg-blue-100 p-2 rounded-full">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalProducts.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">
                {/* Puedes añadir una descripción dinámica si el backend la proporciona */}
                {/* Por ahora, es estática */}
                Actualizado en tiempo real
            </p>
          </CardContent>
        </Card>

        {/* Stock Valorizado */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Stock Valorizado
            </CardTitle>
            <div className="bg-green-100 p-2 rounded-full">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">${stats.totalValuedStock.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-gray-500 mt-1">
                {/* Puedes añadir una descripción dinámica si el backend la proporciona */}
                {/* Por ahora, es estática */}
                Valor total del inventario
            </p>
          </CardContent>
        </Card>

        {/* Stock Bajo */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Stock Bajo
            </CardTitle>
            <div className="bg-orange-100 p-2 rounded-full">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.lowStockItems}</div>
            <p className="text-xs text-gray-500 mt-1">
                Productos requieren reposición
            </p>
          </CardContent>
        </Card>

        {/* Movimientos Hoy */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Movimientos Hoy
            </CardTitle>
            <div className="bg-purple-100 p-2 rounded-full">
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.movementsToday}</div>
            <p className="text-xs text-gray-500 mt-1">
                Entradas y salidas registradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <span>Actividad Reciente</span>
            </CardTitle>
            <CardDescription>
              Últimos movimientos de inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMovements.length === 0 ? (
                <p className="text-gray-500">No hay movimientos recientes.</p>
              ) : (
                recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{movement.product_name}</p>
                      <p className="text-sm text-gray-600">{movement.time}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        movement.type === 'Entrada'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {movement.type}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">Qty: {movement.quantity}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>Alertas de Stock</span>
            </CardTitle>
            <CardDescription>
              Productos que requieren atención
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockAlerts.length === 0 ? (
                <p className="text-gray-500">No hay alertas de stock bajo.</p>
              ) : (
                lowStockAlerts.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border border-orange-200 rounded-lg bg-orange-50">
                    <div>
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      <p className="text-sm text-gray-600">Stock actual: {item.current_stock}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-orange-600 font-medium">Mín: {item.min_stock}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};