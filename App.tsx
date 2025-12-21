
import React, { useEffect, useState } from 'react';
import { supabase } from './services/supabaseClient';
import { AuthState } from './types';
import { AuthPage } from './pages/AuthPage';
import { Layout } from './components/Layout';
import { DashboardHome } from './components/DashboardHome';
import { PetitionWizard } from './components/NewPetition/PetitionWizard';
import { PetitionList } from './components/PetitionList';
import { AdminPanel } from './components/AdminPanel';
import { UserProfileView } from './components/UserProfile';
import { DeadlineManager } from './components/DeadlineManager';
import { JurisprudenceSearch } from './components/JurisprudenceSearch';
import { CNJMetadataSearch } from './components/CNJMetadataSearch';
import { DJESearch } from './components/DJESearch';
import { CourtPortals } from './components/CourtPortals';
import { SubscriptionPage } from './components/SubscriptionPage';
import { LaborCalculator } from './components/LaborCalculator';
import { TokenCounter } from './components/TokenCounter';
import { AlertCircle, Key, RefreshCw, Settings, HelpCircle } from 'lucide-react';
import { Button } from './components/ui/Button';

function App() {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    usage: null,
    loading: true,
  });
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const [dbError, setDbError] = useState<{isError: boolean, code?: string, message?: string}>({ isError: false });
  const [showKeyWarning, setShowKeyWarning] = useState(false);

  useEffect(() => {
    const verifySystemStatus = async () => {
      // Verifica se a chave foi injetada pelo bootstrap do index.tsx
      const apiKey = (window as any).process?.env?.API_KEY;
      const hasKey = apiKey && apiKey !== 'undefined' && apiKey.length > 10;
      
      if (!hasKey) {
        // Se não tem master, checa se o usuário conectou a dele via Google AI Studio
        const aistudio = (window as any).aistudio;
        if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
          try {
            const hasSelected = await aistudio.hasSelectedApiKey();
            setShowKeyWarning(!hasSelected);
          } catch (e) { setShowKeyWarning(true); }
        } else {
          setShowKeyWarning(true);
        }
      } else {
        setShowKeyWarning(false);
      }
    };
    verifySystemStatus();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchData(session.user.id, session.user, session);
      else setAuthState(prev => ({ ...prev, loading: false }));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchData(session.user.id, session.user, session);
      else setAuthState({ session: null, user: null, profile: null, usage: null, loading: false });
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleManualAction = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      try {
        await aistudio.openSelectKey();
        window.location.reload();
      } catch (e) {
        alert("Erro ao abrir seletor de chaves.");
      }
    } else {
      // Se não está em ambiente de preview, damos a instrução direta de redeploy
      alert("⚠️ CHAVE NÃO DETECTADA NO BUNDLE\n\n1. Clique no botão de 3 pontinhos no Vercel (onde você tirou o print).\n2. Clique em 'Redeploy'.\n3. Uma janela abrirá. Clique no botão azul 'Redeploy' dessa janela.\n\nIsso fará o site ler a chave VITE_API_KEY que você configurou.");
    }
  };

  const fetchData = async (userId: string, userObject: any, session: any) => {
    try {
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (profileError && profileError.code === '42P01') { setDbError({ isError: true }); return; }
      const { data: usageData } = await supabase.from('usage_limits').select('*').eq('user_id', userId).single();
      setAuthState({ session, user: userObject, profile: profileData, usage: usageData, loading: false });
    } catch (error) { setAuthState(prev => ({ ...prev, loading: false })); }
  };

  if (authState.loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent shadow-xl"></div>
      <p className="font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest animate-pulse">Iniciando JurisPet AI...</p>
    </div>
  );

  if (dbError.isError) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-10 text-center">
      <div className="space-y-4">
        <p className="text-slate-500 font-black uppercase text-xs tracking-widest">Erro de Conexão com o Banco</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="rounded-xl"><RefreshCw size={14} className="mr-2"/> Recarregar</Button>
      </div>
    </div>
  );

  if (!authState.session) return <AuthPage />;

  const renderContent = () => {
    const isAdmin = authState.profile?.role === 'admin';
    switch (currentRoute) {
      case 'dashboard': return <DashboardHome profile={authState.profile} usage={authState.usage} onNavigate={setCurrentRoute} />;
      case 'new-petition': return <PetitionWizard userId={authState.user?.id} onCancel={() => setCurrentRoute('dashboard')} onSuccess={() => setCurrentRoute('my-petitions')} usage={authState.usage} accountStatus={authState.profile?.account_status || 'trial'} isAdmin={isAdmin} />;
      case 'my-petitions': return <PetitionList userId={authState.user?.id} />;
      case 'jurisprudence': return <JurisprudenceSearch userId={authState.user?.id} />;
      case 'dje-search': return <DJESearch />;
      case 'cnj-metadata': return <CNJMetadataSearch />;
      case 'token-counter': return <TokenCounter />;
      case 'labor-calculator': return <LaborCalculator />;
      case 'deadlines': return <DeadlineManager userId={authState.user?.id} />;
      case 'portals': return <CourtPortals />;
      case 'subscription': return <SubscriptionPage user={authState.profile} onNavigate={setCurrentRoute} />;
      case 'profile': return <UserProfileView profile={authState.profile} />;
      case 'admin': return <AdminPanel />;
      default: return <DashboardHome profile={authState.profile} usage={authState.usage} onNavigate={setCurrentRoute} />;
    }
  };

  return (
    <Layout activeRoute={currentRoute} onNavigate={setCurrentRoute} userEmail={authState.user?.email} isAdmin={authState.profile?.role === 'admin'}>
      {showKeyWarning && (
        <div className="mb-8 mx-auto max-w-5xl animate-in slide-in-from-top-4 duration-500">
          <div className="bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-200 dark:border-amber-800/50 p-6 md:p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-start gap-5 text-left">
              <div className="bg-amber-200 dark:bg-amber-900/40 p-4 rounded-2xl text-amber-700 dark:text-amber-400 shrink-0">
                <AlertCircle size={24} />
              </div>
              <div>
                <h4 className="font-black text-amber-950 dark:text-amber-100 uppercase text-xs tracking-widest">Aguardando Redeploy</h4>
                <p className="text-[10px] font-bold text-amber-800 dark:text-amber-500 uppercase leading-relaxed mt-2">
                  Você configurou a chave no painel do Vercel, mas o site atual foi construído antes disso. 
                  Clique em <b>REDEPLOAR AGORA</b> para atualizar o sistema com sua chave.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button onClick={handleManualAction} className="bg-amber-600 hover:bg-amber-700 text-white border-none rounded-xl h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95">
                <HelpCircle size={16} className="mr-2" /> Redeploar Agora
              </Button>
            </div>
          </div>
        </div>
      )}
      {renderContent()}
    </Layout>
  );
}

export default App;
