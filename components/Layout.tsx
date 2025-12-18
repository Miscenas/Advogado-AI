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
  Sparkles,
  Info,
  Settings,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase, isLive } from '../services/supabaseClient';
import { hasAiKey } from '../services/aiService';
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
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [aiConnected, setAiConnected] = useState(false);

  useEffect(() => {
     const storedUrl = localStorage.getItem('custom_supabase_url');
     const storedKey = localStorage.getItem('custom_supabase_key');
     
     if (storedUrl) setCustomUrl(storedUrl);
     if (storedKey) setCustomKey(storedKey);
     
     setAiConnected(hasAiKey());
  }, [showConnectionModal]);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSaveConnection = () => {
      if (customUrl) localStorage.setItem('custom_supabase_url', customUrl);
      if (customKey) localStorage.setItem('custom_supabase_key', customKey);
      
      window.location.reload();
  };

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, color: 'text-blue-500' },
    { id: 'new-petition', label: 'Nova Petição', icon: FileText, color: 'text-indigo-500' },
    { id: 'new-defense', label: 'Contestação', icon: ShieldAlert, color: 'text-rose-500' },
    { id: 'my-petitions', label: 'Documentos', icon: Files, color: 'text-amber-500' },
    { id: 'jurisprudence', label: 'Pesquisa', icon: BookOpen, color: 'text-emerald-500' },
    { id: 'deadlines', label: 'Prazos', icon: CalendarDays, color: 'text-purple-500' },
    { id: 'portals', label: 'Tribunais', icon: Globe, color: 'text-cyan-500' },
    { id: 'subscription', label: 'Plano', icon: CreditCard, color: 'text-slate-500' },
    { id: 'profile', label: 'Perfil', icon: User, color: 'text-slate-500' },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin', icon: ShieldCheck, color: 'text-red-500' });
  }

  const NavContent = () => (
    <div className="flex flex-col h-full bg-white/70 backdrop-blur-xl border-r border-slate-200/50">
      <div className="flex items-center gap-3 px-7 py-8">
        <div className="bg-gradient-to-br from-slate-800 to-black p-2 rounded-2xl shadow-lg">
            <Scale className="h-6 w-6 text-white" />
        </div>
        <span className="text-xl font-bold text-slate-900 tracking-tight">JurisPet AI</span>
      </div>
      
      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
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
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 translate-x-1' 
                  : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-white/10' : 'bg-transparent'}`}>
                <Icon size={18} className={`${isActive ? 'text-white' : item.color}`} />
              </div>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-6 mt-auto">
        <div 
            className="mb-6 p-4 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col gap-3 cursor-pointer hover:bg-slate-100 transition-colors group"
            onClick={() => setShowConnectionModal(true)}
        >
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistema</span>
                <div className="flex gap-1">
                    <div className={`h-2 w-2 rounded-full ${isLive ? 'bg-green-500' : 'bg-amber-400'}`} title={isLive ? "Conectado ao Supabase" : "Modo Mock"} />
                    <div className={`h-2 w-2 rounded-full ${aiConnected ? 'bg-blue-400' : 'bg-slate-300'}`} title={aiConnected ? "IA Ativa" : "IA Desativada"} />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-900 font-bold border border-slate-100">
                    {userEmail?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 truncate font-bold leading-tight">{userEmail?.split('@')[0]}</p>
                    <p className="text-[10px] text-slate-400 truncate uppercase font-semibold">Online</p>
                </div>
            </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-2xl transition-all border border-transparent hover:border-rose-100"
        >
          <LogOut size={16} />
          Encerrar Sessão
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex font-sans">
      <aside className="hidden md:flex flex-col w-72 h-screen sticky top-0 z-20">
        <NavContent />
      </aside>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 flex flex-col shadow-2xl animate-in slide-in-from-left duration-500">
            <NavContent />
          </div>
        </div>
      )}

      {showConnectionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 relative">
                <button onClick={() => setShowConnectionModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition-colors"><X size={18} /></button>
                <div className="flex items-center gap-4 mb-8">
                    <div className="bg-slate-900 p-3 rounded-2xl text-white"><Settings size={24} /></div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Configurações</h3>
                </div>
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                           <Database size={14}/> Banco de Dados
                        </h4>
                        <Input label="Supabase URL" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://..." />
                        <Input label="Supabase Anon Key" value={customKey} onChange={(e) => setCustomKey(e.target.value)} type="password" placeholder="eyJ..." />
                        
                        <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${aiConnected ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'}`}>
                           <div className="flex items-center justify-between">
                             <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${aiConnected ? 'text-blue-900' : 'text-amber-900'}`}>
                                <Sparkles size={14}/> Inteligência Artificial
                             </h4>
                             {aiConnected ? (
                               <div className="flex items-center gap-1 text-blue-600 font-bold text-[10px]">
                                 <CheckCircle2 size={12}/> ATIVA
                               </div>
                             ) : (
                               <div className="flex items-center gap-1 text-amber-600 font-bold text-[10px]">
                                 <AlertCircle size={12}/> DESATIVADA
                               </div>
                             )}
                           </div>
                           
                           <p className={`text-[10px] leading-relaxed font-medium ${aiConnected ? 'text-blue-700' : 'text-amber-700'}`}>
                              {aiConnected 
                                ? "O sistema está conectado com sucesso ao Google Gemini e pronto para gerar petições."
                                : "A chave de API do Gemini não foi detectada no ambiente do servidor (API_KEY)."}
                           </p>
                           
                           {!aiConnected && (
                             <a 
                                href="https://aistudio.google.com/app/apikey" 
                                target="_blank" 
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 hover:underline"
                             >
                                Obter chave gratuita no Google AI Studio <ExternalLink size={10}/>
                             </a>
                           )}
                        </div>
                    </div>
                    <Button onClick={handleSaveConnection} className="w-full h-12 rounded-2xl text-sm font-bold bg-slate-900">Salvar e Reiniciar</Button>
                </div>
            </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-slate-900" />
            <span className="font-bold text-lg text-slate-900 tracking-tight">JurisPet AI</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 rounded-xl bg-slate-100 text-slate-900"><Menu size={24} /></button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-10 lg:p-12">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};