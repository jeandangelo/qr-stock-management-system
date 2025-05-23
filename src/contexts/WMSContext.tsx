
import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  location: string;
  value: number;
  supplier: string;
}

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
  movements: Movement[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProductStock: (productCode: string, newStock: number) => void;
  addMovement: (movement: Omit<Movement, 'id' | 'timestamp'>) => void;
  getProductByCode: (code: string) => Product | undefined;
}

const WMSContext = createContext<WMSContextType | undefined>(undefined);

export const useWMS = () => {
  const context = useContext(WMSContext);
  if (!context) {
    throw new Error('useWMS must be used within a WMSProvider');
  }
  return context;
};

const initialProducts: Product[] = [
  {
    id: '1',
    code: 'PROD001',
    name: 'Laptop Dell XPS 13',
    category: 'Electrónicos',
    stock: 25,
    minStock: 10,
    location: 'A1-01',
    value: 1299.99,
    supplier: 'Dell Technologies'
  },
  {
    id: '2',
    code: 'PROD002',
    name: 'Mouse Logitech MX Master',
    category: 'Accesorios',
    stock: 15,
    minStock: 15,
    location: 'B2-05',
    value: 89.99,
    supplier: 'Logitech'
  },
  {
    id: '3',
    code: 'PROD003',
    name: 'Teclado Mecánico RGB',
    category: 'Accesorios',
    stock: 18,
    minStock: 12,
    location: 'B1-03',
    value: 149.99,
    supplier: 'Corsair'
  },
  {
    id: '4',
    code: 'PROD004',
    name: 'Monitor Samsung 27"',
    category: 'Electrónicos',
    stock: 12,
    minStock: 8,
    location: 'A3-02',
    value: 299.99,
    supplier: 'Samsung'
  },
  {
    id: '5',
    code: 'PROD005',
    name: 'Cable USB-C',
    category: 'Cables',
    stock: 45,
    minStock: 30,
    location: 'C1-10',
    value: 19.99,
    supplier: 'Anker'
  }
];

const initialMovements: Movement[] = [
  {
    id: '1',
    timestamp: '2024-01-15T10:30:00',
    type: 'entrada',
    product: 'Laptop Dell XPS 13',
    productCode: 'PROD001',
    quantity: 5,
    location: 'A1-01',
    user: 'Juan Pérez',
    reference: 'PO-2024-001'
  },
  {
    id: '2',
    timestamp: '2024-01-15T10:15:00',
    type: 'salida',
    product: 'Mouse Logitech MX Master',
    productCode: 'PROD002',
    quantity: 12,
    location: 'B2-05',
    user: 'María García',
    reference: 'SO-2024-045'
  }
];

export const WMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('wms_products');
    return saved ? JSON.parse(saved) : initialProducts;
  });

  const [movements, setMovements] = useState<Movement[]>(() => {
    const saved = localStorage.getItem('wms_movements');
    return saved ? JSON.parse(saved) : initialMovements;
  });

  useEffect(() => {
    localStorage.setItem('wms_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('wms_movements', JSON.stringify(movements));
  }, [movements]);

  const addProduct = (productData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...productData,
      id: Date.now().toString()
    };
    setProducts(prev => [...prev, newProduct]);
  };

  const updateProductStock = (productCode: string, newStock: number) => {
    setProducts(prev => 
      prev.map(product => 
        product.code === productCode 
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
    return products.find(product => product.code === code);
  };

  return (
    <WMSContext.Provider value={{
      products,
      movements,
      addProduct,
      updateProductStock,
      addMovement,
      getProductByCode
    }}>
      {children}
    </WMSContext.Provider>
  );
};
