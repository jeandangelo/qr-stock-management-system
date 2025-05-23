
import { Button } from '@/components/ui/button';
import { ViewType } from '@/components/WMSDashboard';
import { 
  Home, 
  Package, 
  QrCode, 
  ClipboardList, 
  MapPin, 
  LogOut, 
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isOpen: boolean;
  onToggle: () => void;
  onLogout: () => void;
}

const menuItems = [
  { id: 'dashboard' as ViewType, label: 'Dashboard', icon: Home },
  { id: 'inventory' as ViewType, label: 'Inventario', icon: Package },
  { id: 'scanner' as ViewType, label: 'Escáner QR', icon: QrCode },
  { id: 'movements' as ViewType, label: 'Movimientos', icon: ClipboardList },
  { id: 'locations' as ViewType, label: 'Ubicaciones', icon: MapPin },
];

export const Sidebar = ({ currentView, onViewChange, isOpen, onToggle, onLogout }: SidebarProps) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      <aside className={cn(
        "fixed left-0 top-0 h-screen bg-white border-r border-gray-200 shadow-lg transition-all duration-300 z-50",
        isOpen ? "w-64" : "w-16"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {isOpen && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-800">WMS Pro</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="p-2"
          >
            {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  !isOpen && "px-2",
                  isActive && "bg-blue-600 hover:bg-blue-700 text-white"
                )}
                onClick={() => onViewChange(item.id)}
              >
                <Icon className={cn("h-5 w-5", isOpen && "mr-3")} />
                {isOpen && <span>{item.label}</span>}
              </Button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-4 left-4 right-4">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50",
              !isOpen && "px-2"
            )}
            onClick={onLogout}
          >
            <LogOut className={cn("h-5 w-5", isOpen && "mr-3")} />
            {isOpen && <span>Cerrar Sesión</span>}
          </Button>
        </div>
      </aside>
    </>
  );
};
