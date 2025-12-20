
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
  BookOpen,
  CalendarDays,
  Globe,
  CreditCard,
  Newspaper,
  SearchCode,
  Calculator,
  Moon,
  Sun,
  Hash
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

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
  userEmail
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Painel do Advogado', icon: LayoutDashboard, color: 'text-indigo-500 dark:text-indigo-400' },
    { id: 'new-petition', label: 'Nova Petição', icon: FileText, color: 'text-emerald-500 dark:text-emerald-400' },
    { id: 'my-petitions', label: 'Minhas Petições', icon: Files, color: 'text-amber-500 dark:text-amber-400' },
    { id: 'jurisprudence', label: 'Jurisprudência', icon: BookOpen, color: 'text-blue-500 dark:text-blue-400' },
    { id: 'dje-search', label: 'Consulta DJE', icon: Newspaper, color: 'text-purple-500 dark:text-purple-400' },
    { id: 'cnj-metadata', label: 'Metadados CNJ', icon: SearchCode, color: 'text-slate-500 dark:text-slate-400' },
    { id: 'token-counter', label: 'Contador Tokens', icon: Hash, color: 'text-indigo-500 dark:text-indigo-400' },
    { id: 'labor-calculator', label: 'Calculadora Trabalhista', icon: Calculator, color: 'text-emerald-600' },
    { id: 'deadlines', label: 'Prazos', icon: CalendarDays, color: 'text-purple-500 dark:text-purple-400' },
    { id: 'portals', label: 'Tribunais', icon: Globe, color: 'text-cyan-500 dark:text-cyan-400' },
    { id: 'subscription', label: 'Plano', icon: CreditCard, color: 'text-slate-500 dark:text-slate-400' },
    { id: 'profile', label: 'Perfil', icon: User, color: 'text-slate-500 dark:text-slate-400' },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 w-full overflow-hidden transition-colors duration-300">
      <div className="flex items-center gap-4 px-6 py-8 shrink-0">
        <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-indigo-950/40 shrink-0">
            <Scale className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col overflow-hidden text-left">
            <span className="text-lg font-black text-slate-900 dark:text-white tracking-tighter leading-none truncate">JurisPet AI</span>
            <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mt-1">Advocacia com IA</span>
        </div>
        <button 
          onClick={toggleTheme}
          className="ml-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-all hidden lg:block"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
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
              className={`w-full flex items-center gap-4 px-4 py-3 text-xs font-bold rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-slate-100'
              }`}
            >
              <div className={`${isActive ? 'text-white' : item.color} shrink-0`}>
                <Icon size={18} />
              </div>
              <span className="truncate tracking-tight uppercase tracking-wider text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-100 dark:border-slate-800/50 shrink-0">
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-inner">
                {userEmail?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0 text-left">
                <p className="text-[10px] text-slate-900 dark:text-white truncate font-black leading-none mb-1 uppercase tracking-tight">
                  {userEmail?.split('@')[0] || 'Advogado'}
                </p>
                <div className="flex items-center gap-1.5">
                    <div className="h-1 w-1 rounded-full bg-emerald-500" />
                    <p className="text-[8px] text-slate-400 dark:text-slate-500 truncate uppercase font-bold tracking-widest">Sessão Ativa</p>
                </div>
            </div>
        </div>
        <button 
          onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center justify-center gap-2 py-3 mt-1 text-[9px] font-black text-slate-400 hover:text-rose-500 transition-all uppercase tracking-widest"
        >
          <LogOut size={12} />
          Sair do Sistema
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-[#020617] font-sans flex text-left justify-start items-stretch overflow-x-hidden transition-colors duration-300">
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 xl:w-72 z-30 shadow-sm dark:shadow-none transition-all no-print">
        <NavContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72 bg-[#f8fafc] dark:bg-[#020617] w-full items-stretch transition-all duration-300">
        <header className="lg:hidden bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm shrink-0 z-20 transition-colors no-print">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span className="font-black text-slate-900 dark:text-white tracking-tighter text-xl leading-none">JurisPet</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-all mr-2"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-lg active:scale-95 transition-transform"
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10 bg-[#f8fafc] dark:bg-[#020617] w-full flex flex-col items-stretch max-w-[1920px] mx-auto overflow-y-auto transition-colors duration-300">
          {children}
        </main>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm animate-in fade-in" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="absolute top-4 right-4 z-10 lg:hidden">
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 dark:text-white/50 hover:text-indigo-600 dark:hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <NavContent />
          </div>
        </div>
      )}
    </div>
  );
};
