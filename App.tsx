
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

  useEffect(() => {
    // Carregar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchData(session.user.id, session.user, session);
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    });

    // Ouvinte de mudanças de estado
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchData(session.user.id, session.user, session);
      } else {
        setAuthState({
          session: null,
          user: null,
          profile: null,
          usage: null,
          loading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async (userId: string, userObject: any, session: any) => {
    try {
      // Busca perfil
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError && profileError.code === '42P01') {
           setDbError({ isError: true });
           return;
      }

      // Busca limites de uso
      const { data: usageData } = await supabase
        .from('usage_limits')
        .select('*')
        .eq('user_id', userId)
        .single();

      setAuthState({
        session,
        user: userObject,
        profile: profileData,
        usage: usageData,
        loading: false
      });
    } catch (error) { 
      console.error("Erro ao carregar dados do usuário:", error);
      setAuthState(prev => ({ ...prev, loading: false })); 
    }
  };

  if (authState.loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent shadow-xl"></div>
        <p className="font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-[0.3em] animate-pulse">Iniciando JurisPet AI...</p>
      </div>
    );
  }

  if (dbError.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-10 text-center">
        <div className="max-w-md space-y-4">
          <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Erro de Conexão com o Banco de Dados.</p>
          <p className="text-slate-400 text-[10px] uppercase tracking-tighter">A tabela 'profiles' não foi encontrada ou o serviço está offline.</p>
        </div>
      </div>
    );
  }

  if (!authState.session) {
    return <AuthPage />;
  }

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
      {renderContent()}
    </Layout>
  );
}

export default App;
