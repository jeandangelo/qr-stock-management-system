import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Camera, Package, Plus, Minus, QrCode, Type } from 'lucide-react';
import { useWMS, Product } from '@/contexts/WMSContext';

export const ScannerView = () => {
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
  const [operationType, setOperationType] = useState<'entrada' | 'salida'>('entrada');
  const [manualCode, setManualCode] = useState('');
  const [quantity, setQuantity] = useState<string>('1');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const { toast } = useToast();
  // Importar las funciones de persistencia y fetchProducts para refrescar la lista de productos
  const { getProductByCode, updateProductStockInDb, addMovement, products, fetchProducts } = useWMS(); 

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        title: "Cámara no disponible",
        description: "Tu navegador no soporta el acceso a la cámara o no hay cámaras disponibles. Usa el modo manual.",
        variant: "destructive"
      });
      setScanMode('manual');
      return;
    }

    try {
      setIsScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(error => {
            if (error.name === 'AbortError') {
              console.warn('La reproducción de video fue abortada. Esto es normal si el componente se desmonta rápidamente.');
            } else {
              console.error('Error al intentar reproducir el video de la cámara:', error);
              toast({
                title: "Error de reproducción",
                description: `No se pudo iniciar la cámara: ${error.message}`,
                variant: "destructive"
              });
              setScanMode('manual');
            }
            setIsScanning(false);
          });
        };
      }
    } catch (error: any) {
      console.error('Error accediendo a la cámara:', error);
      toast({
        title: "Error de cámara",
        description: `No se puede acceder a la cámara: ${error.message}. Usa el modo manual.`,
        variant: "destructive"
      });
      setScanMode('manual');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsScanning(false);
  };

  const simulateQRScan = () => {
    if (products.length > 0) {
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      processScannedCode(randomProduct.codigo_barra);
    } else {
      toast({
        title: "No hay productos",
        description: "Agrega productos al inventario para simular un escaneo.",
        variant: "default"
      });
    }
  };

  const processScannedCode = (code: string) => {
    const product = getProductByCode(code); 
    if (product) {
      setScannedProduct(product);
      setQuantity('1'); 
      toast({
        title: "Producto encontrado",
        description: `${product.nombre} - Stock actual: ${product.stock}`,
      });
    } else {
      toast({
        title: "Producto no encontrado",
        description: "El código escaneado no existe en el sistema",
        variant: "destructive"
      });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      processScannedCode(manualCode.trim());
    } else {
      toast({
        title: "Código vacío",
        description: "Por favor, ingresa un código de producto válido.",
        variant: "destructive"
      });
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (value === '') {
      setQuantity('');
      return;
    }
    
    const numericValue = Number(value);
    if (!isNaN(numericValue) && numericValue > 0) {
      setQuantity(value);
    }
  };

  const processMovement = async () => { // Hacerla async
    const numericQuantity = Number(quantity);
    
    if (!scannedProduct || numericQuantity <= 0) {
      toast({
        title: "Cantidad inválida",
        description: "La cantidad debe ser mayor a 0",
        variant: "destructive"
      });
      return;
    }

    const newStock = operationType === 'entrada' 
      ? scannedProduct.stock + numericQuantity 
      : scannedProduct.stock - numericQuantity;

    if (operationType === 'salida' && newStock < 0) {
      toast({
        title: "Stock insuficiente",
        description: `No hay suficiente stock para esta operación. Stock actual: ${scannedProduct.stock}`,
        variant: "destructive"
      });
      return;
    }

    try {
        // Primero registrar el movimiento en la DB
        await addMovement({
            type: operationType,
            product: scannedProduct.nombre,
            productCode: scannedProduct.codigo_barra,
            quantity: numericQuantity,
            location: scannedProduct.ubicacion_principal || 'Sin Ubicación',
            user: 'Usuario Actual', // Esto debería ser dinámico en una app real
            reference: `${operationType.toUpperCase()}-${Date.now()}`
        });

        // Luego, actualizar el stock del producto en la DB
        // Pasamos scannedProduct.id (que es el id numérico de la DB)
        await updateProductStockInDb(scannedProduct.id, newStock); 

        toast({
            title: "Movimiento y Stock Actualizados",
            description: `Se procesó ${operationType} de ${numericQuantity} unidades de ${scannedProduct.nombre}. Stock actualizado en DB.`,
        });

        // Opcional: Si quieres que el stock del producto escaneado se refleje instantáneamente en la UI de ScannerView
        // sin esperar un fetchProducts completo, puedes actualizar el estado local aquí:
        setScannedProduct(prev => prev ? { ...prev, stock: newStock } : null);

        setQuantity('1'); // Reset quantity to '1' after processing
    } catch (error: any) {
        console.error('Error procesando movimiento completo:', error);
        toast({
            title: "Error en el movimiento",
            description: `No se pudo completar la operación: ${error.message}`,
            variant: "destructive"
        });
    }
  };

  useEffect(() => {
    if (scanMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    // Cleanup function: se ejecuta cuando el componente se desmonta o cuando scanMode cambia
    return () => {
      stopCamera();
    };
  }, [scanMode, products]); // Añadir products como dependencia para asegurar que `simulateQRScan` tenga la última lista


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Escáner QR/Códigos</h1>
        <p className="text-gray-600">Escanea productos para registrar movimientos de inventario</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <QrCode className="h-5 w-5 text-blue-600" />
              <span>Escáner</span>
            </CardTitle>
            <CardDescription>
              Selecciona el método de captura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode Selector */}
            <div className="flex space-x-2">
              <Button
                variant={scanMode === 'camera' ? 'default' : 'outline'}
                onClick={() => setScanMode('camera')}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Cámara
              </Button>
              <Button
                variant={scanMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setScanMode('manual')}
                className="flex-1"
              >
                <Type className="h-4 w-4 mr-2" />
                Manual
              </Button>
            </div>

            {/* Camera Mode */}
            {scanMode === 'camera' && (
              <div className="space-y-4">
                <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    autoPlay 
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ display: 'none' }}
                  />
                  
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-white border-dashed rounded-lg flex items-center justify-center">
                      <QrCode className="h-12 w-12 text-white opacity-50" />
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={simulateQRScan} 
                  className="w-full"
                  disabled={!isScanning && products.length === 0} 
                >
                  Simular Escaneo QR
                </Button>
              </div>
            )}

            {/* Manual Mode */}
            {scanMode === 'manual' && (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="manual-code">Código de Barras / QR</Label>
                  <Input
                    id="manual-code"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Ej: 123456789012"
                    className="mt-1"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Buscar Producto
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Movement Processing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-green-600" />
              <span>Procesar Movimiento</span>
            </CardTitle>
            <CardDescription>
              Configura y registra el movimiento de inventario
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scannedProduct ? (
              <>
                {/* Product Info */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900">{scannedProduct.nombre}</h4>
                  <p className="text-sm text-blue-700">Código de Barras: {scannedProduct.codigo_barra}</p>
                  <p className="text-sm text-blue-700">Stock actual: {scannedProduct.stock}</p>
                  <p className="text-sm text-blue-700">Ubicación: {scannedProduct.ubicacion_principal || 'N/A'}</p>
                </div>

                {/* Operation Type */}
                <div>
                  <Label>Tipo de Operación</Label>
                  <Select value={operationType} onValueChange={(value: 'entrada' | 'salida') => setOperationType(value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">
                        <div className="flex items-center space-x-2">
                          <Plus className="h-4 w-4 text-green-600" />
                          <span>Entrada</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="salida">
                        <div className="flex items-center space-x-2">
                          <Minus className="h-4 w-4 text-red-600" />
                          <span>Salida</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity */}
                <div>
                  <Label htmlFor="quantity">Cantidad</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={handleQuantityChange}
                    className="mt-1"
                    placeholder="Ingrese la cantidad"
                  />
                </div>

                {/* Process Button */}
                <Button 
                  onClick={processMovement}
                  className={`w-full ${
                    operationType === 'entrada' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  disabled={!quantity || Number(quantity) <= 0}
                >
                  {operationType === 'entrada' ? (
                    <Plus className="h-4 w-4 mr-2" />
                  ) : (
                    <Minus className="h-4 w-4 mr-2" />
                  )}
                  Registrar {operationType === 'entrada' ? 'Entrada' : 'Salida'}
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <QrCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Escanea o ingresa un código para comenzar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};