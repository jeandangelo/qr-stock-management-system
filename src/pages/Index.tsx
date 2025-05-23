
import { useState, useEffect } from 'react';
import { WMSDashboard } from '@/components/WMSDashboard';
import { AuthForm } from '@/components/AuthForm';

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem('wms_token');
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (token: string) => {
    localStorage.setItem('wms_token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('wms_token');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando WMS...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm onLogin={handleLogin} />;
  }

  return <WMSDashboard onLogout={handleLogout} />;
};

export default Index;
