// src/components/views/LocationsView.tsx
import { useState, useEffect } from 'react'; // Asegúrate de importar useEffect
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, MapPin, Plus, Package, Grid3x3 } from 'lucide-react';

// Interfaz para ubicaciones que coincida con tu backend (server.js GET /api/locations)
interface Location {
  ubicacion_id: number; // Coincide con el ID de tu DB
  codigo_ubicacion: string; // Coincide con tu DB
  descripcion: string;     // Coincide con tu DB
  tipo: string;            // Coincide con tu DB
  bodega: string;          // Coincide con tu DB
  nivel: number;           // Coincide con tu DB
  
  // Estos campos (capacity, occupied, products) NO vienen directamente de la tabla ubicaciones en tu DB actual.
  // Si tu backend no los provee, los simularemos en el frontend.
  capacity?: number; // Para simulación de capacidad
  occupied?: number; // Para simulación de ocupación
  products_in_location?: Array<{ product_id: number; product_name: string; quantity: number }>; // Para simulación de productos
}

const API_BASE_URL = 'http://localhost:3001/api'; // URL base de tu backend

// Función para obtener ubicaciones desde el backend
async function getBackendLocations(): Promise<Location[]> {
  const response = await fetch(`${API_BASE_URL}/locations`);
  if (!response.ok) {
    throw new Error('Error al obtener las ubicaciones del servidor.');
  }
  return response.json();
}

export const LocationsView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [locations, setLocations] = useState<Location[]>([]); // Ahora es un estado para datos de la DB
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Efecto para cargar ubicaciones al montar el componente
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setLoading(true);
        const data = await getBackendLocations();
        // Combinar datos reales con datos simulados si es necesario para el frontend
        const locationsWithSimulatedStats = data.map(loc => ({
          ...loc,
          capacity: 100, // Simulación de capacidad por ubicación
          occupied: Math.floor(Math.random() * 100), // Simulación de ocupación
          products_in_location: [] // No tenemos un endpoint para esto, así que es vacío o simulado.
        }));
        setLocations(locationsWithSimulatedStats);
      } catch (err: any) {
        console.error("Error loading locations:", err);
        setError(err.message || "No se pudieron cargar las ubicaciones.");
      } finally {
        setLoading(false);
      }
    };
    loadLocations();
  }, []); // El array vacío asegura que se ejecute solo una vez al montar

  const filteredLocations = locations.filter(location =>
    location.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) || // Filtrar por descripción
    location.codigo_ubicacion.toLowerCase().includes(searchTerm.toLowerCase()) || // Filtrar por código
    location.tipo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    location.bodega.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOccupancyLevel = (occupied: number, capacity: number) => {
    if (capacity === 0) return { label: 'Sin Capacidad', color: 'text-gray-500', bgColor: 'bg-gray-500' };
    const percentage = (occupied / capacity) * 100;
    if (percentage === 0) return { label: 'Vacía', color: 'text-gray-500', bgColor: 'bg-gray-500' };
    if (percentage < 50) return { label: 'Disponible', color: 'text-green-600', bgColor: 'bg-green-500' };
    if (percentage < 80) return { label: 'Parcial', color: 'text-yellow-600', bgColor: 'bg-yellow-500' };
    return { label: 'Llena', color: 'text-red-600', bgColor: 'bg-red-500' };
  };

  // Cálculos de resumen ahora basados en los datos cargados
  // Aseguramos valores por defecto de 0 para sumas si los campos son opcionales
  const uniqueBodegas = [...new Set(locations.map(loc => loc.bodega))].length;
  const totalCapacity = locations.reduce((sum, loc) => sum + (loc.capacity || 0), 0);
  const totalOccupied = locations.reduce((sum, loc) => sum + (loc.occupied || 0), 0);
  const occupancyPercentage = totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0;

  if (loading) {
    return <p>Cargando ubicaciones...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

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
            <div className="text-2xl font-bold">{uniqueBodegas}</div>
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
          // Asegura que occupied y capacity tengan un valor numérico para el cálculo
          const occupancyLevel = getOccupancyLevel(location.occupied || 0, location.capacity || 0);
          const currentOccupancyPercentage = location.capacity ? ((location.occupied || 0) / location.capacity) * 100 : 0;

          return (
            <Card key={location.ubicacion_id} className="hover:shadow-lg transition-shadow"> {/* Usar ubicacion_id */}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    <span className="font-mono text-blue-600">{location.codigo_ubicacion}</span> {/* Usar codigo_ubicacion */}
                  </CardTitle>
                  <Badge variant="secondary" className={occupancyLevel.color}>
                    {occupancyLevel.label}
                  </Badge>
                </div>
                <CardDescription>{location.descripcion} ({location.tipo} - {location.bodega} Nivel {location.nivel})</CardDescription> {/* Usar descripcion, tipo, bodega, nivel */}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Zone */}
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Bodega: {location.bodega}, Nivel: {location.nivel}</span> {/* Usar bodega, nivel */}
                </div>

                {/* Capacity (Simulado por ahora) */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Ocupación</span>
                    <span>{location.occupied || 0} / {location.capacity || 0}</span>
                  </div>
                  <Progress value={currentOccupancyPercentage} className="h-2" />
                  <p className="text-xs text-gray-500">
                    {currentOccupancyPercentage.toFixed(1)}% ocupado (Simulado)
                  </p>
                </div>

                {/* Products (Necesitaría un endpoint adicional para esto) */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Productos (Detalle no disponible vía API actual):</h4>
                  {location.products_in_location && location.products_in_location.length > 0 ? (
                    <div className="space-y-1">
                      {location.products_in_location.map((product, index) => (
                        <div key={index} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                          <span className="truncate">{product.product_name}</span>
                          <span className="font-medium">{product.quantity}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">Sin productos asignados (necesita API)</p>
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