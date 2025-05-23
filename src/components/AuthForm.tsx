
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Warehouse, Shield } from 'lucide-react';

interface AuthFormProps {
  onLogin: (token: string) => void;
}

export const AuthForm = ({ onLogin }: AuthFormProps) => {
  const [email, setEmail] = useState('admin@wms.com');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call - in real app, this would call your backend
    setTimeout(() => {
      if (email === 'admin@wms.com' && password === 'password123') {
        const mockToken = 'mock-jwt-token-' + Date.now();
        onLogin(mockToken);
        toast({
          title: "Inicio de sesión exitoso",
          description: "Bienvenido al sistema WMS",
        });
      } else {
        toast({
          title: "Error de autenticación",
          description: "Credenciales incorrectas",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and branding */}
        <div className="text-center text-white">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <Warehouse className="h-12 w-12" />
            <QrCode className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold mb-2">WMS Pro</h1>
          <p className="text-blue-200">Sistema de Gestión de Almacén</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center">Iniciar Sesión</CardTitle>
            <CardDescription className="text-center">
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                  placeholder="tu@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12"
                  placeholder="••••••••"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Autenticando...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>Iniciar Sesión</span>
                  </div>
                )}
              </Button>
            </form>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Credenciales de prueba:</h4>
              <p className="text-sm text-blue-700">Email: admin@wms.com</p>
              <p className="text-sm text-blue-700">Contraseña: password123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
