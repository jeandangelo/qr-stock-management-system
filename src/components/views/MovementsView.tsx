// src/components/views/MovementsView.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Download, ArrowUpCircle, ArrowDownCircle, Clock } from 'lucide-react';
import { useWMS } from '@/contexts/WMSContext';

export const MovementsView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const { movements, fetchMovements } = useWMS();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await fetchMovements();
      } catch (err: any) {
        console.error("Error loading movements:", err);
        setError(err.message || "No se pudieron cargar los movimientos.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [fetchMovements]);

  const filteredMovements = movements.filter(movement => {
    const matchesSearch = movement.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.referencia_externa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.user.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterType === 'all' || movement.type.toLowerCase() === filterType;

    return matchesSearch && matchesFilter;
  });

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('es-ES'),
      time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getMovementIcon = (type: string) => {
    return type.toLowerCase() === 'entrada' ? (
      <ArrowUpCircle className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getMovementBadge = (type: string) => {
    return type.toLowerCase() === 'entrada' ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Entrada
      </Badge>
    ) : type.toLowerCase() === 'salida' ? (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        Salida
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
        Traslado
      </Badge>
    );
  };

  const todayMovements = movements.filter(m =>
    new Date(m.fecha_movimiento || m.timestamp).toDateString() === new Date().toDateString()
  ).length;

  const totalEntradas = movements.filter(m => m.type.toLowerCase() === 'entrada').length;
  const totalSalidas = movements.filter(m => m.type.toLowerCase() === 'salida').length;

  if (loading) {
    return <p>Cargando movimientos...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Movimientos de Inventario</h1>
          <p className="text-gray-600">Historial de entradas y salidas</p>
        </div>
        <Button variant="outline" className="flex items-center space-x-2">
          <Download className="h-4 w-4" />
          <span>Exportar</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movimientos Hoy</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayMovements}</div>
            <p className="text-xs text-gray-500">transacciones registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entradas</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalEntradas}</div>
            <p className="text-xs text-gray-500">movimientos de entrada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Salidas</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalSalidas}</div>
            <p className="text-xs text-gray-500">movimientos de salida</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-blue-600" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por producto, referencia o usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo de movimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="entrada">Solo Entradas</SelectItem>
                <SelectItem value="salida">Solo Salidas</SelectItem>
                <SelectItem value="traslado">Solo Traslados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Movements List */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos</CardTitle>
          <CardDescription>
            Mostrando {filteredMovements.length} de {movements.length} movimientos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredMovements.map((movement) => {
              const dateTime = formatDate(movement.fecha_movimiento || movement.timestamp);
              return (
                <div key={movement.movimiento_id || movement.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getMovementIcon(movement.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-gray-900 truncate">
                          {movement.product}
                        </p>
                        {getMovementBadge(movement.type)}
                      </div>
                      <div className="flex flex-wrap items-center space-x-4 text-sm text-gray-500">
                        <span>Cantidad: {movement.quantity}</span>
                        <span>
                          Ubicación:
                          {movement.ubicacion_origen && ` de ${movement.ubicacion_origen}`}
                          {movement.ubicacion_destino && ` a ${movement.ubicacion_destino}`}
                          {!movement.ubicacion_origen && !movement.ubicacion_destino && 'N/A'}
                        </span>
                        <span>Usuario: {movement.usuario || movement.user}</span>
                      </div>
                      {movement.referencia_externa && (
                        <p className="text-xs text-gray-400 mt-1">
                          Ref: {movement.referencia_externa}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p className="font-medium">{dateTime.date}</p>
                    <p>{dateTime.time}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredMovements.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron movimientos que coincidan con los filtros</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};