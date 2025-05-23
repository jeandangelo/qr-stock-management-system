
import { useState } from 'react';
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
  const { movements } = useWMS();

  const filteredMovements = movements.filter(movement => {
    const matchesSearch = movement.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.user.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || movement.type === filterType;
    
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
    return type === 'entrada' ? (
      <ArrowUpCircle className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getMovementBadge = (type: string) => {
    return type === 'entrada' ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Entrada
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        Salida
      </Badge>
    );
  };

  const todayMovements = movements.filter(m => 
    new Date(m.timestamp).toDateString() === new Date().toDateString()
  ).length;

  const totalEntradas = movements.filter(m => m.type === 'entrada').length;
  const totalSalidas = movements.filter(m => m.type === 'salida').length;

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
                placeholder="Buscar por producto, código o usuario..."
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
              const dateTime = formatDate(movement.timestamp);
              return (
                <div key={movement.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
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
                        <span>Código: {movement.productCode}</span>
                        <span>Cantidad: {movement.quantity}</span>
                        <span>Ubicación: {movement.location}</span>
                        <span>Usuario: {movement.user}</span>
                      </div>
                      {movement.reference && (
                        <p className="text-xs text-gray-400 mt-1">
                          Ref: {movement.reference}
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
