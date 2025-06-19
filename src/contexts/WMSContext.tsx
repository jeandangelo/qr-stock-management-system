// src/contexts/WMSContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast'; // Asegúrate de que la ruta a useToast sea correcta

// URL base de tu backend
const API_BASE_URL = 'http://localhost:3001/api'; // <--- ¡IMPORTANTE! VERIFICA QUE ESTA URL SEA LA CORRECTA PARA TU BACKEND

// 1. Definir interfaces que reflejan los datos del BACKEND
// La interfaz 'Product' ahora coincide con lo que retorna tu API de /api/items
export interface Product {
  id: number; // Viene como 'id' numérico de la base de datos
  nombre: string;
  codigo: string;
  stock: number;
  precio: number; // Corresponde al 'value' del formulario frontend
  categoria: string;
  min_stock: number;
  ubicacion_principal?: string; // Propiedad opcional que viene del JOIN en el backend
  descripcion?: string; // Puedes mapear el 'name' del frontend aquí
  qr_code_data?: string; // Si se maneja en el futuro
}

// Interfaz para los datos que se envían desde el formulario 'AddProductDialog'
// Coincide con la estructura de 'formData' que ya tienes en AddProductDialog.tsx
export interface AddProductFormData {
  code: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  location: string;
  value: number; // Se mapea a 'precio' en el backend
  supplier: string; // Este campo no tiene un mapeo directo en el backend 'productos' actual
}

// Para 'Movement', por ahora, mantendremos la lógica local para simplificar este paso.
// Integrar 'Movement' con el backend requeriría más lógica de búsqueda de IDs y mapeo.
export interface Movement {
  id: string;
  timestamp: string;
  type: 'entrada' | 'salida';
  product: string;
  productCode: string;
  quantity: number;
  location: string;
  user: string;
  reference: string;
}

interface WMSContextType {
  products: Product[];
  movements: Movement[]; // Se mantiene para estado local por ahora
  fetchProducts: () => Promise<void>;
  addProduct: (productData: AddProductFormData) => Promise<void>;
  updateProductStock: (productCode: string, newStock: number) => void; // Aún local (solo afecta el estado local)
  addMovement: (movement: Omit<Movement, 'id' | 'timestamp'>) => void; // Aún local
  getProductByCode: (code: string) => Product | undefined; // Aún local (opera sobre `products` del estado)
}

// Crear el contexto
const WMSContext = createContext<WMSContextType | undefined>(undefined);

// Hook personalizado para consumir el contexto (tu implementación ya es correcta)
export const useWMS = () => {
  const context = useContext(WMSContext);
  if (!context) {
    throw new Error('useWMS debe ser usado dentro de un WMSProvider');
  }
  return context;
};

// Proveedor del Contexto
export const WMSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]); // Estado inicial vacío, se llenará con la API
  const [movements, setMovements] = useState<Movement[]>(() => {
    // Los movimientos aún se gestionan con localStorage y estado local por ahora
    const saved = localStorage.getItem('wms_movements');
    return saved ? JSON.parse(saved) : [];
  });
  const { toast } = useToast();

  // Efecto para guardar movimientos en localStorage (se mantiene local)
  useEffect(() => {
    localStorage.setItem('wms_movements', JSON.stringify(movements));
  }, [movements]);

  // Función para obtener todos los productos del backend
  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/items`);
      if (!response.ok) {
        throw new Error('Error al obtener los productos del servidor.');
      }
      const data: Product[] = await response.json();
      setProducts(data);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error de conexión",
        description: `No se pudieron cargar los productos: ${error.message}. Asegúrate de que tu backend esté funcionando en ${API_BASE_URL}.`,
        variant: "destructive"
      });
    }
  }, [toast]); // `toast` como dependencia para useCallback

  // Función para añadir un nuevo producto al backend
  const addProduct = async (productData: AddProductFormData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: productData.name,
          descripcion: productData.name, // Usamos el nombre como descripción por simplicidad
          stock: productData.stock,
          precio: productData.value, // Mapea 'value' del frontend a 'precio' del backend
          codigo: productData.code,
          categoria: productData.category,
          min_stock: productData.minStock,
          qr_code_data: null, // Asume que no hay datos QR por ahora
          ubicacion_principal: productData.location, // Envía la ubicación principal
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Error desconocido al añadir producto en el servidor');
      }

      toast({
        title: "Producto agregado",
        description: `${productData.name} ha sido agregado al inventario.`,
      });

      // ¡Importante! Refresca la lista de productos después de añadir uno
      await fetchProducts(); // Llama a la función que obtiene los datos del backend
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast({
        title: "Error al agregar producto",
        description: `No se pudo agregar el producto: ${error.message}`,
        variant: "destructive"
      });
      throw error; // Re-lanza el error para que AddProductDialog pueda manejarlo si lo necesita
    }
  };

  // Funciones que aún operan sobre el estado local y localStorage (no backend)
  const updateProductStock = (productCode: string, newStock: number) => {
    setProducts(prev =>
      prev.map(product =>
        product.codigo === productCode // Usar product.codigo para coincidir
          ? { ...product, stock: newStock }
          : product
      )
    );
  };

  const addMovement = (movementData: Omit<Movement, 'id' | 'timestamp'>) => {
    const newMovement: Movement = {
      ...movementData,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    setMovements(prev => [newMovement, ...prev]);
  };

  const getProductByCode = (code: string) => {
    return products.find(product => product.codigo === code);
  };

  // Cargar productos al montar el proveedor del contexto (la primera vez)
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Valor del contexto que será accesible para los componentes hijos
  const contextValue = {
    products,
    movements,
    fetchProducts,
    addProduct,
    updateProductStock,
    addMovement,
    getProductByCode
  };

  return (
    <WMSContext.Provider value={contextValue}>
      {children}
    </WMSContext.Provider>
  );
};