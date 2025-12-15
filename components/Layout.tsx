import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Files, 
  User, 
  LogOut, 
  Menu, 
  X,
  Scale,
  ShieldCheck,
  CalendarDays,
  Wifi,
  WifiOff
} from 'lucide-react';
import { supabase, isLive } from '../services/supabaseClient';

interface LayoutProps {
  children: React.ReactNode;
  activeRoute: string;
  onNavigate: (route: string) => void;
  userEmail?: string;
  isAdmin?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeRoute, 
  onNavigate,
  userEmail,
  isAdmin = false
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { id: 'dashboard', label: 'Painel do Advogado', icon: LayoutDashboard },
    { id: 'new-petition', label: 'Nova Petição', icon: FileText },
    { id: 'my-petitions', label: 'Minhas Petições', icon: Files },
    { id: 'deadlines', label: 'Prazos & Agenda', icon: CalendarDays },
    { id: 'profile', label: 'Perfil & Senha', icon: User },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Administração', icon: ShieldCheck });
  }

  const NavContent = () => (
    <>
      <div className="flex items-center gap-2 px-6 py-6 border-b border-juris-800">
        <Scale className="h-8 w-8 text-sky-400" />
        <span className="text-xl font-bold text-white tracking-tight">Advogado AI</span>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoute === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive 
                  ? 'bg-juris-800 text-white shadow-md' 
                  : 'text-juris-100 hover:bg-juris-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-juris-800">
         {/* Database Connection Status Indicator */}
        <div className={`mb-4 px-3 py-2 rounded border flex items-center justify-between text-xs font-medium ${
            isLive 
            ? 'bg-green-900/40 border-green-800 text-green-200' 
            : 'bg-amber-900/40 border-amber-800 text-amber-200'
        }`}>
            <span className="flex items-center gap-2">
                {isLive ? <Wifi size={14} /> : <WifiOff size={14} />}
                {isLive ? 'Conectado' : 'Modo Simulação'}
            </span>
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`}></div>
        </div>

        <div className="mb-4 px-2">
          <p className="text-xs text-juris-400 uppercase font-semibold">Conta</p>
          <p className="text-sm text-juris-100 truncate">{userEmail}</p>
          {isAdmin && <span className="text-xs bg-sky-500 text-white px-2 py-0.5 rounded-full inline-block mt-1">Admin</span>}
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-900/20 hover:text-red-200 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          Sair do Sistema
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-juris-900 text-white flex-shrink-0 h-screen sticky top-0">
        <NavContent />
      </aside>

      {/* Mobile Sidebar (Overlay) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-juris-900 text-white flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-md hover:bg-juris-800 text-juris-300 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <NavContent />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden bg-juris-900 text-white p-4 flex items-center justify-between shadow-sm sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-sky-400" />
            <span className="font-bold">Advogado AI</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-md hover:bg-juris-800"
          >
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};