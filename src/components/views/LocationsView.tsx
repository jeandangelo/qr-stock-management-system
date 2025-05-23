
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, MapPin, Plus, Package, Grid3x3 } from 'lucide-react';

export const LocationsView = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const locations = [
    {
      id: 1,
      code: 'A1-01',
      name: 'Estante A1 - Nivel 1',
      zone: 'Zona A - Electrónicos',
      capacity: 50,
      occupied: 25,
      products: [
        { name: 'Laptop Dell XPS 13', quantity: 25 }
      ]
    },
    {
      id: 2,
      code: 'A1-02',
      name: 'Estante A1 - Nivel 2',
      zone: 'Zona A - Electrónicos',
      capacity: 30,
      occupied: 0,
      products: []
    },
    {
      id: 3,
      code: 'A3-02',
      name: 'Estante A3 - Nivel 2',
      zone: 'Zona A - Electrónicos',
      capacity: 20,
      occupied: 12,
      products: [
        { name: 'Monitor Samsung 27"', quantity: 12 }
      ]
    },
    {
      id: 4,
      code: 'B1-03',
      name: 'Estante B1 - Nivel 3',
      zone: 'Zona B - Accesorios',
      capacity: 100,
      occupied: 18,
      products: [
        { name: 'Teclado Mecánico RGB', quantity: 18 }
      ]
    },
    {
      id: 5,
      code: 'B2-05',
      name: 'Estante B2 - Nivel 5',
      zone: 'Zona B - Accesorios',
      capacity: 75,
      occupied: 15,
      products: [
        { name: 'Mouse Logitech MX Master', quantity: 15 }
      ]
    },
    {
      id: 6,
      code: 'C1-10',
      name: 'Estante C1 - Nivel 10',
      zone: 'Zona C - Cables y Conectores',
      capacity: 200,
      occupied: 45,
      products: [
        { name: 'Cable USB-C', quantity: 45 }
      ]
    }
  ];

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.zone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOccupancyLevel = (occupied: number, capacity: number) => {
    const percentage = (occupied / capacity) * 100;
    if (percentage === 0) return { label: 'Vacía', color: 'text-gray-500', bgColor: 'bg-gray-500' };
    if (percentage < 50) return { label: 'Disponible', color: 'text-green-600', bgColor: 'bg-green-500' };
    if (percentage < 80) return { label: 'Parcial', color: 'text-yellow-600', bgColor: 'bg-yellow-500' };
    return { label: 'Llena', color: 'text-red-600', bgColor: 'bg-red-500' };
  };

  const zones = [...new Set(locations.map(loc => loc.zone))];
  const totalCapacity = locations.reduce((sum, loc) => sum + loc.capacity, 0);
  const totalOccupied = locations.reduce((sum, loc) => sum + loc.occupied, 0);
  const occupancyPercentage = (totalOccupied / totalCapacity) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ubicaciones de Almacén</h1>
          <p className="text-gray-600">Gestión de zonas y ubicaciones de productos</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Ubicación
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ubicaciones</CardTitle>
            <MapPin className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locations.length}</div>
            <p className="text-xs text-gray-500">ubicaciones disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zonas</CardTitle>
            <Grid3x3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{zones.length}</div>
            <p className="text-xs text-gray-500">zonas configuradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacidad Total</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCapacity.toLocaleString()}</div>
            <p className="text-xs text-gray-500">unidades máximas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ocupación</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyPercentage.toFixed(1)}%</div>
            <p className="text-xs text-gray-500">{totalOccupied} / {totalCapacity} unidades</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Búsqueda de Ubicaciones</CardTitle>
          <CardDescription>Encuentra ubicaciones por código, nombre o zona</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar ubicaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLocations.map((location) => {
          const occupancyLevel = getOccupancyLevel(location.occupied, location.capacity);
          const occupancyPercentage = (location.occupied / location.capacity) * 100;

          return (
            <Card key={location.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    <span className="font-mono text-blue-600">{location.code}</span>
                  </CardTitle>
                  <Badge variant="secondary" className={occupancyLevel.color}>
                    {occupancyLevel.label}
                  </Badge>
                </div>
                <CardDescription>{location.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Zone */}
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{location.zone}</span>
                </div>

                {/* Capacity */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Ocupación</span>
                    <span>{location.occupied} / {location.capacity}</span>
                  </div>
                  <Progress value={occupancyPercentage} className="h-2" />
                  <p className="text-xs text-gray-500">
                    {occupancyPercentage.toFixed(1)}% ocupado
                  </p>
                </div>

                {/* Products */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Productos:</h4>
                  {location.products.length > 0 ? (
                    <div className="space-y-1">
                      {location.products.map((product, index) => (
                        <div key={index} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                          <span className="truncate">{product.name}</span>
                          <span className="font-medium">{product.quantity}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">Sin productos asignados</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Ver Detalles
                  </Button>
                  <Button variant="ghost" size="sm">
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredLocations.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No se encontraron ubicaciones que coincidan con la búsqueda</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
