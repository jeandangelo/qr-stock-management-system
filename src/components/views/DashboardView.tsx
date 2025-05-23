
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, TrendingUp, AlertTriangle, Activity } from 'lucide-react';

export const DashboardView = () => {
  const stats = [
    {
      title: "Total Productos",
      value: "1,234",
      description: "+20 desde ayer",
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Stock Valorizado",
      value: "$45,231",
      description: "+12% desde el mes pasado",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Stock Bajo",
      value: "23",
      description: "Productos requieren reposición",
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    },
    {
      title: "Movimientos Hoy",
      value: "89",
      description: "Entradas y salidas",
      icon: Activity,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    }
  ];

  const recentMovements = [
    { id: 1, product: "Laptop Dell XPS", type: "Entrada", quantity: 5, time: "10:30 AM" },
    { id: 2, product: "Mouse Logitech", type: "Salida", quantity: 12, time: "10:15 AM" },
    { id: 3, product: "Teclado Mecánico", type: "Entrada", quantity: 8, time: "09:45 AM" },
    { id: 4, product: "Monitor Samsung", type: "Salida", quantity: 3, time: "09:30 AM" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Resumen general del almacén</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-full`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              {recentMovements.map((movement) => (
                <div key={movement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{movement.product}</p>
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
              ))}
            </div>
          </CardContent>
        </Card>

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
              {[
                { product: "Cable USB-C", current: 5, min: 10 },
                { product: "Adaptador HDMI", current: 2, min: 15 },
                { product: "Batería Portátil", current: 8, min: 12 },
                { product: "Auriculares Bluetooth", current: 3, min: 20 }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-orange-200 rounded-lg bg-orange-50">
                  <div>
                    <p className="font-medium text-gray-900">{item.product}</p>
                    <p className="text-sm text-gray-600">Stock actual: {item.current}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-orange-600 font-medium">Mín: {item.min}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
