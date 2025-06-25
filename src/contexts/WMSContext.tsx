// src/contexts/WMSContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast'; 

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'; 

export interface Product {
  id: number; 
  nombre: string;
  codigo_barra: string; 
  descripcion?: string; 
  unidad_medida?: string; 
  fecha_creacion?: string; 
  stock: number; 
  min_stock: number; 
  categoria: string; 
  ubicacion_principal?: string; 
  precio: number; 
}

export interface AddProductFormData {
  name: string; 
  category: string; 
  stock: number; 
  minStock: number; 
  location: string; 
  value: number; 
  supplier: string; 
  codigo_barra: string; 
}

export interface Movement {
  id: string; // Este ID es el que se usa en el frontend, y lo mapearemos desde el backend
  timestamp: string; 
  type: 'entrada' | 'salida' | 'traslado'; 
  product: string; 
  productCode: string; 
  quantity: number;
  location: string; 
  user: string; 
  reference: string; 

  // Propiedades opcionales que vienen del backend
  movimiento_id?: number; // El ID original en la tabla movimientos
  producto_id?: number; 
  ubicacion_origen?: string | null; 
  ubicacion_destino?: string | null; 
  usuario?: string; 
  fecha_movimiento?: string; 
  referencia_externa?: string | null; 
  tipo_movimiento?: string; 
}


interface WMSContextType {
  products: Product[];
  movements: Movement[]; 
  fetchProducts: () => Promise<void>;
  fetchMovements: () => Promise<void>; 
  addProduct: (productData: AddProductFormData) => Promise<void>;
  updateProductStockInDb: (productId: number, newStock: number) => Promise<void>; 
  addMovement: (movement: Omit<Movement, 'id' | 'timestamp'>) => Promise<void>; 
  getProductByCode: (code: string) => Product | undefined; 
}

const WMSContext = createContext<WMSContextType | undefined>(undefined);

export const useWMS = () => {
  const context = useContext(WMSContext);
  if (!context) {
    throw new Error('useWMS debe ser usado dentro de un WMSProvider');
  }
  return context;
};

export const WMSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]); 
  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/items`);
      if (!response.ok) {
        throw new Error('Error al obtener los productos del servidor.');
      }
      const rawData: any[] = await response.json();
      
      const processedData: Product[] = rawData.map(item => ({
        id: item.id,
        nombre: item.nombre,
        codigo_barra: item.codigo_barra,
        descripcion: item.descripcion,
        unidad_medida: item.unidad_medida,
        fecha_creacion: item.fecha_creacion,
        stock: parseFloat(item.stock) || 0,
        min_stock: parseFloat(item.min_stock) || 0,
        categoria: item.categoria,
        ubicacion_principal: item.ubicacion_principal,
        precio: parseFloat(item.precio) || 0
      }));
      setProducts(processedData);

    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error de conexión",
        description: `No se pudieron cargar los productos: ${error.message}. Asegúrate de que tu backend esté funcionando en ${API_BASE_URL}.`,
        variant: "destructive"
      });
    }
  }, [toast]);

  const fetchMovements = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/movements`);
      if (!response.ok) {
        throw new Error('Error al obtener los movimientos del servidor.');
      }
      const rawData: any[] = await response.json();
      
      const processedMovements: Movement[] = rawData.map(movement => ({
        id: movement.id ? movement.id.toString() : Date.now().toString(), // <<< CORREGIDO: Usar movement.id y fallback para safety >>>
        timestamp: movement.fecha_movimiento || new Date().toISOString(), // Usar fecha_movimiento si existe, sino crear una
        
        type: movement.tipo_movimiento ? movement.tipo_movimiento.toLowerCase() as 'entrada' | 'salida' | 'traslado' : 'entrada', // Corregido: safety check
        product: movement.product_name || 'Desconocido', // Corregido: safety check
        productCode: movement.product_code || '', 
        quantity: parseFloat(movement.cantidad) || 0, 
        location: movement.ubicacion_origen || movement.ubicacion_destino || 'N/A', 
        user: movement.usuario || 'Desconocido', // Corregido: safety check
        reference: movement.referencia_externa || '',

        // Mapeo directo de campos de la DB
        movimiento_id: movement.movimiento_id,
        producto_id: movement.producto_id,
        ubicacion_origen: movement.ubicacion_origen,
        ubicacion_destino: movement.ubicacion_destino,
        usuario: movement.usuario,
        fecha_movimiento: movement.fecha_movimiento,
        referencia_externa: movement.referencia_externa,
        tipo_movimiento: movement.tipo_movimiento, 
      }));
      setMovements(processedMovements);
    } catch (error: any) {
      console.error('Error fetching movements:', error);
      toast({
        title: "Error de conexión",
        description: `No se pudieron cargar los movimientos: ${error.message}. Asegúrate de que tu backend esté funcionando en ${API_BASE_URL}.`,
        variant: "destructive"
      });
    }
  }, [toast]);


  const addProduct = async (productData: AddProductFormData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: productData.name || 'Producto Desconocido',
          descripcion: productData.name || 'Sin Descripción',
          codigo_barra: productData.codigo_barra,
          stock: productData.stock,
          min_stock: productData.minStock,
          valor_unitario: productData.value, 
          categoria: productData.category,
          ubicacion_principal: productData.location, 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || errorData.message || 'Error desconocido al añadir producto en el servidor');
      }

      toast({
        title: "Producto agregado",
        description: `${productData.name} ha sido agregado al inventario.`,
      });

      await fetchProducts(); 
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast({
        title: "Error al agregar producto",
        description: `No se pudo agregar el producto: ${error.message}`,
        variant: "destructive"
      });
      throw error; 
    }
  };

  const updateProductStockInDb = async (productId: number, newStock: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/items/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stock: newStock }), 
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || errorData.message || 'Error desconocido al actualizar stock en el servidor');
      }

      await fetchProducts(); 
      console.log(`Stock del producto ${productId} actualizado a ${newStock} en la DB.`);
    } catch (error: any) {
      console.error('Error updating product stock in DB:', error);
      toast({
        title: "Error al actualizar stock",
        description: `No se pudo actualizar el stock: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  const addMovement = async (movementData: Omit<Movement, 'id' | 'timestamp'>) => {
    try {
      const productInList = products.find(p => p.codigo_barra === movementData.productCode);

      if (!productInList) {
        throw new Error(`Producto con código ${movementData.productCode} no encontrado para registrar movimiento.`);
      }
      
      const response = await fetch(`${API_BASE_URL}/movements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          producto_id: productInList.id, 
          cantidad: movementData.quantity,
          tipo_movimiento: movementData.type.toUpperCase(), 
          ubicacion_origen_id: movementData.type === 'salida' ? 1 : null, 
          ubicacion_destino_id: movementData.type === 'entrada' ? 1 : null, 
          usuario_id: 1, 
          referencia_externa: movementData.reference,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || errorData.message || 'Error desconocido al registrar movimiento en el servidor');
      }

      toast({
        title: "Movimiento registrado",
        description: `Movimiento de ${movementData.product} (${movementData.quantity}) tipo ${movementData.type} registrado.`,
      });

      await fetchMovements(); 
    } catch (error: any) {
      console.error('Error adding movement:', error);
      toast({
        title: "Error al registrar movimiento",
        description: `No se pudo registrar el movimiento: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  const getProductByCode = (code: string) => {
    return products.find(product => product.codigo_barra === code); 
  };

  useEffect(() => {
    fetchProducts();
    fetchMovements(); 
  }, [fetchProducts, fetchMovements]);

  const contextValue = {
    products,
    movements,
    fetchProducts,
    fetchMovements,
    addProduct,
    updateProductStockInDb, 
    addMovement,
    getProductByCode
  };

  return (
    <WMSContext.Provider value={contextValue}>
      {children}
    </WMSContext.Provider>
  );
};