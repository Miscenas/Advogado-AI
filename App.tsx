
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
import { AlertCircle, HelpCircle, RefreshCw, Terminal, ExternalLink } from 'lucide-react';
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
  const [showVercelGuide, setShowVercelGuide] = useState(false);

  useEffect(() => {
    const verifySystemStatus = async () => {
      const win = window as any;
      const apiKey = win.process?.env?.API_KEY;
      const hasKey = apiKey && apiKey !== 'undefined' && apiKey.length > 10;
      
      if (!hasKey) {
        const aistudio = win.aistudio;
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
                <h4 className="font-black text-amber-950 dark:text-amber-100 uppercase text-xs tracking-widest">Sincronização Necessária</h4>
                <p className="text-[10px] font-bold text-amber-800 dark:text-amber-500 uppercase leading-relaxed mt-2">
                  Você configurou a <b>VITE_API_KEY</b> no Vercel. Agora o site precisa ser "reconstruído" para ler essa chave.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button onClick={() => setShowVercelGuide(true)} className="bg-amber-600 hover:bg-amber-700 text-white border-none rounded-xl h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95">
                <HelpCircle size={16} className="mr-2" /> Como Atualizar?
              </Button>
            </div>
          </div>
        </div>
      )}

      {showVercelGuide && (
        <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="p-8 md:p-12 space-y-8">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Guia de Atualização Vercel</h3>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Siga os passos abaixo para ativar sua chave</p>
                </div>
                <button onClick={() => setShowVercelGuide(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white"><RefreshCw size={24}/></button>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 font-black">1</div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No painel que você tirou o print, clique no botão <b>"Redeploy"</b>.</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 font-black">2</div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Uma janela flutuante branca irá aparecer no meio da tela.</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 font-black">3</div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Nesta nova janela, clique no botão azul <b>"Redeploy"</b> (não precisa marcar nada se não aparecer a opção de cache).</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black">4</div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aguarde 2 minutos até o status mudar para <b>Ready</b>. O site então estará com a IA ativa!</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-2">
                   <Terminal size={18} />
                   <span className="text-[10px] font-black uppercase tracking-widest">Dica Técnica</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-500 leading-relaxed italic">O Vercel gera um site estático. Para ele "enxergar" variáveis novas, ele precisa gerar um novo build (Redeploy).</p>
              </div>

              <Button onClick={() => setShowVercelGuide(false)} className="w-full h-16 rounded-2xl bg-slate-900 dark:bg-indigo-600 text-white font-black uppercase text-xs tracking-widest shadow-xl border-none">Entendi, vou fazer o Redeploy</Button>
            </div>
          </div>
        </div>
      )}

      {currentRoute === 'dashboard' && <DashboardHome profile={authState.profile} usage={authState.usage} onNavigate={setCurrentRoute} />}
      {currentRoute === 'new-petition' && <PetitionWizard userId={authState.user?.id} onCancel={() => setCurrentRoute('dashboard')} onSuccess={() => setCurrentRoute('my-petitions')} usage={authState.usage} accountStatus={authState.profile?.account_status || 'trial'} isAdmin={authState.profile?.role === 'admin'} />}
      {currentRoute === 'my-petitions' && <PetitionList userId={authState.user?.id} />}
      {currentRoute === 'jurisprudence' && <JurisprudenceSearch userId={authState.user?.id} />}
      {currentRoute === 'dje-search' && <DJESearch />}
      {currentRoute === 'cnj-metadata' && <CNJMetadataSearch />}
      {currentRoute === 'token-counter' && <TokenCounter />}
      {currentRoute === 'labor-calculator' && <LaborCalculator />}
      {currentRoute === 'deadlines' && <DeadlineManager userId={authState.user?.id} />}
      {currentRoute === 'portals' && <CourtPortals />}
      {currentRoute === 'subscription' && <SubscriptionPage user={authState.profile} onNavigate={setCurrentRoute} />}
      {currentRoute === 'profile' && <UserProfileView profile={authState.profile} />}
      {currentRoute === 'admin' && <AdminPanel />}
    </Layout>
  );
}

export default App;
