
import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardView } from '@/components/views/DashboardView';
import { InventoryView } from '@/components/views/InventoryView';
import { ScannerView } from '@/components/views/ScannerView';
import { MovementsView } from '@/components/views/MovementsView';
import { LocationsView } from '@/components/views/LocationsView';
import { WMSProvider } from '@/contexts/WMSContext';

interface WMSDashboardProps {
  onLogout: () => void;
}

export type ViewType = 'dashboard' | 'inventory' | 'scanner' | 'movements' | 'locations';

export const WMSDashboard = ({ onLogout }: WMSDashboardProps) => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'inventory':
        return <InventoryView />;
      case 'scanner':
        return <ScannerView />;
      case 'movements':
        return <MovementsView />;
      case 'locations':
        return <LocationsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <WMSProvider>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onLogout={onLogout}
        />
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
          <div className="p-6">
            {renderView()}
          </div>
        </main>
      </div>
    </WMSProvider>
  );
};
