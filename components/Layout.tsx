import React, { useState, useEffect } from 'react';
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
  ShieldAlert,
  BookOpen,
  Globe,
  CreditCard,
  Database,
  Save,
  Unplug,
  Sparkles
} from 'lucide-react';
import { supabase, isLive, updateConnection, disconnectCustom } from '../services/supabaseClient';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

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
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  
  // Connection Form State
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [customAiKey, setCustomAiKey] = useState('');

  useEffect(() => {
     // Pre-fill if exists in local storage
     const storedUrl = localStorage.getItem('custom_supabase_url');
     const storedKey = localStorage.getItem('custom_supabase_key');
     const storedAiKey = localStorage.getItem('custom_gemini_api_key');
     if (storedUrl) setCustomUrl(storedUrl);
     if (storedKey) setCustomKey(storedKey);
     if (storedAiKey) setCustomAiKey(storedAiKey);
  }, []);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSaveConnection = () => {
      // Permitir salvar apenas a chave de IA se o banco estiver vazio, ou ambos
      if (!customAiKey && (!customUrl || !customKey)) {
          alert("Preencha as configurações que deseja salvar (Banco de Dados ou IA).");
          return;
      }
      updateConnection(customUrl, customKey, customAiKey);
  };

  const handleDisconnect = () => {
      if(confirm("Deseja desconectar e limpar todas as chaves (Supabase e IA)?")) {
          disconnectCustom();
      }
  };

  const navItems = [
    { id: 'dashboard', label: 'Painel do Advogado', icon: LayoutDashboard },
    { id: 'new-petition', label: 'Criar Petição', icon: FileText },
    { id: 'new-defense', label: 'Criar Contestação', icon: ShieldAlert },
    { id: 'my-petitions', label: 'Minhas Petições', icon: Files },
    { id: 'jurisprudence', label: 'Pesquisa Jurídica', icon: BookOpen },
    { id: 'deadlines', label: 'Prazos & Agenda', icon: CalendarDays },
    { id: 'portals', label: 'Portais da Justiça', icon: Globe },
    { id: 'subscription', label: 'Assinatura & Planos', icon: CreditCard },
    { id: 'profile', label: 'Perfil & Senha', icon: User },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Administração', icon: ShieldCheck });
  }

  const NavContent = () => (
    <>
      <div className="flex items-center gap-3 px-6 py-6 border-b border-juris-800">
        <div className="bg-sky-500/10 p-2 rounded-lg">
            <Scale className="h-6 w-6 text-sky-400 flex-shrink-0" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">Advogado IA</span>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
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
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-juris-800 text-white shadow-md border-l-4 border-sky-400' 
                  : 'text-juris-100 hover:bg-juris-800 hover:text-white border-l-4 border-transparent'
              }`}
            >
              <Icon size={20} className={`flex-shrink-0 transition-colors ${isActive ? 'text-sky-400' : 'text-juris-300 group-hover:text-white'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-juris-800 bg-juris-950/30">
        <div className="mb-4 px-2">
          {/* Status Indicator - Clickable to open Modal */}
          <div 
            className="flex items-center justify-between mb-2 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors group"
            onClick={() => setShowConnectionModal(true)}
            title="Clique para configurar conexão e chaves de API"
          >
             <p className="text-xs text-juris-400 uppercase font-semibold tracking-wider group-hover:text-juris-200 transition-colors">Configurações</p>
             <div className="flex items-center gap-2">
                <Database size={12} className={isLive ? "text-green-500" : "text-juris-500"} />
                <div 
                  className={`h-2.5 w-2.5 rounded-full ${isLive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} 
                />
             </div>
          </div>

          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-juris-700 flex items-center justify-center text-xs font-bold text-white">
                {userEmail?.charAt(0).toUpperCase() || 'U'}
             </div>
             <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate font-medium" title={userEmail}>{userEmail}</p>
                {isAdmin && <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/30">Administrador</span>}
             </div>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-900/20 hover:text-red-200 rounded-lg transition-colors border border-transparent hover:border-red-900/30"
        >
          <LogOut size={18} className="flex-shrink-0" />
          Sair do Sistema
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-juris-900 text-white flex-shrink-0 h-screen sticky top-0 shadow-xl z-20">
        <NavContent />
      </aside>

      {/* Mobile Sidebar (Overlay) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-juris-900 text-white flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-md hover:bg-juris-800 text-juris-300 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <NavContent />
          </div>
        </div>
      )}

      {/* Connection Config Modal */}
      {showConnectionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 relative overflow-y-auto max-h-[90vh]">
                <button 
                    onClick={() => setShowConnectionModal(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>
                
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-juris-100 p-3 rounded-full text-juris-700">
                        <Database size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Configurações</h3>
                        <p className="text-sm text-gray-500">Banco de Dados e Inteligência Artificial</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Database Section */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Database size={16} /> Supabase (Banco de Dados)
                        </h4>
                        <div className="text-xs text-blue-800 bg-blue-50 p-2 rounded border border-blue-100 mb-3">
                            Status: <strong>{isLive ? 'Conectado (Ao Vivo)' : 'Modo Demonstração (Local)'}</strong>
                        </div>
                        <div className="space-y-3">
                            <Input 
                                label="Project URL" 
                                placeholder="https://xyz.supabase.co" 
                                value={customUrl}
                                onChange={(e) => setCustomUrl(e.target.value)}
                            />
                            <Input 
                                label="Anon Public Key" 
                                placeholder="eyJhbGciOiJIUzI1NiIsInR..." 
                                value={customKey}
                                onChange={(e) => setCustomKey(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* AI Section */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Sparkles size={16} className="text-amber-500" /> Google Gemini API
                        </h4>
                        <p className="text-xs text-gray-500 mb-3">
                            Necessário para geração de petições e análise de documentos. 
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                                Obter chave aqui
                            </a>.
                        </p>
                        <Input 
                            label="API Key (Começa com AIza...)" 
                            placeholder="AIzaSy..." 
                            value={customAiKey}
                            onChange={(e) => setCustomAiKey(e.target.value)}
                            type="password"
                        />
                    </div>

                    <div className="flex flex-col gap-3 mt-2">
                        <Button onClick={handleSaveConnection} className="w-full">
                            <Save size={16} className="mr-2" /> Salvar Configurações
                        </Button>
                        
                        {(localStorage.getItem('custom_supabase_url') || localStorage.getItem('custom_gemini_api_key')) && (
                            <Button variant="outline" onClick={handleDisconnect} className="w-full text-red-600 border-red-200 hover:bg-red-50">
                                <Unplug size={16} className="mr-2" /> Limpar Tudo (Resetar)
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden bg-juris-900 text-white p-4 flex items-center justify-between shadow-md sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-sky-400" />
            <span className="font-bold text-lg tracking-tight">Advogado IA</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-md hover:bg-juris-800 transition-colors"
          >
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};