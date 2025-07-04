import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWMS } from '@/contexts/WMSContext';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

export const AddProductDialog = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    // code: '', // <-- ELIMINADO: Ya no necesitamos un 'código interno' separado
    name: '',
    category: '',
    stock: 0,
    minStock: 0,
    location: '',
    value: 0,
    supplier: '',
    codigo_barra: '' // Este será el identificador único para el escaneo
  });

  const { addProduct } = useWMS();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones: Ahora solo necesitamos validar codigo_barra, nombre y categoría
    if (!formData.codigo_barra.trim() || !formData.name.trim() || !formData.category.trim()) {
      toast({
        title: "Error de validación",
        description: "Por favor completa el Código de Barras, el Nombre del Producto y la Categoría (*). Asegúrate de que no estén solo en blanco.",
        variant: "destructive"
      });
      return;
    }

    try {
      await addProduct(formData); 
      toast({
        title: "Producto agregado",
        description: `${formData.name} ha sido agregado al inventario.`,
      });

      // Resetear el formulario después de un éxito
      setFormData({
        // code: '', // ELIMINADO
        name: '',
        category: '',
        stock: 0,
        minStock: 0,
        location: '',
        value: 0,
        supplier: '',
        codigo_barra: '' 
      });
      
      setOpen(false); // Cerrar el diálogo
    } catch (error: any) {
      console.error("Error al agregar producto en el diálogo:", error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Producto</DialogTitle>
          <DialogDescription>
            Completa la información del producto que deseas agregar al inventario. Los campos con (*) son obligatorios.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* <<< CAMBIO: Se eliminó el campo 'Código Interno' (code) aquí >>> */}
            <div>
              <Label htmlFor="category">Categoría*</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="Electrónicos"
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="name">Nombre del Producto*</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Nombre del producto"
              required
            />
          </div>

          {/* <<< ESTE ES AHORA EL ÚNICO IDENTIFICADOR PARA EL FRONTEND Y LA DB >>> */}
          <div>
            <Label htmlFor="codigo_barra">Código de Barras / QR*</Label>
            <Input
              id="codigo_barra" 
              value={formData.codigo_barra} 
              onChange={(e) => handleInputChange('codigo_barra', e.target.value)} 
              placeholder="Ej: 123456789012" 
              required
            />
          </div>
          {/* <<< FIN DEL CAMBIO CLAVE >>> */}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock">Stock Inicial</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="minStock">Stock Mínimo</Label>
              <Input
                id="minStock"
                type="number"
                min="0"
                value={formData.minStock}
                onChange={(e) => handleInputChange('minStock', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Ubicación Principal</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="A1-01"
              />
            </div>
            <div>
              <Label htmlFor="value">Valor Unitario</Label>
              <Input
                id="value"
                type="number"
                min="0"
                step="0.01"
                value={formData.value}
                onChange={(e) => handleInputChange('value', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="supplier">Proveedor</Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => handleInputChange('supplier', e.target.value)}
              placeholder="Nombre del proveedor"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Agregar Producto
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};