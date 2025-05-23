
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Package, Edit, AlertTriangle } from 'lucide-react';
import { useWMS } from '@/contexts/WMSContext';
import { AddProductDialog } from '@/components/AddProductDialog';

export const InventoryView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { products } = useWMS();

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) return { label: 'Sin Stock', color: 'bg-red-500' };
    if (stock <= minStock) return { label: 'Stock Bajo', color: 'bg-orange-500' };
    return { label: 'Stock Normal', color: 'bg-green-500' };
  };

  const totalValue = products.reduce((sum, product) => sum + (product.stock * product.value), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-600">Gestión de productos y stock</p>
        </div>
        <AddProductDialog />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-gray-500">productos únicos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">valor del inventario</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter(p => p.stock <= p.minStock).length}
            </div>
            <p className="text-xs text-gray-500">productos con stock bajo</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Búsqueda de Productos</CardTitle>
          <CardDescription>Encuentra productos por nombre, código o categoría</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
          <CardDescription>
            {filteredProducts.length} de {products.length} productos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Producto</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Código</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Stock</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Ubicación</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Valor Unit.</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product.stock, product.minStock);
                  return (
                    <tr key={product.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-500">{product.category}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {product.code}
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{product.stock}</p>
                          <p className="text-xs text-gray-500">Min: {product.minStock}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className={`${status.color} text-white`}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {product.location}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">${product.value}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
