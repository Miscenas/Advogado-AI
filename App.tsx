
import React, { useEffect, useState } from 'react';
import { supabase } from './services/supabaseClient';
import { AuthState } from './types';
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
import { RefreshCw } from 'lucide-react';
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

  useEffect(() => {
    // Inicialização direta do estado para modo local
    const initLocalSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Busca perfil mockado
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setAuthState({
          session,
          user: session.user,
          profile: profile,
          usage: { user_id: session.user.id, petitions_limit: 10, petitions_this_month: 0, last_reset: '', storage_limit_bytes: 0, used_storage_bytes: 0, last_update: '' },
          loading: false
        });
      }
    };

    initLocalSession();
  }, []);

  if (authState.loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest animate-pulse">Iniciando JurisPet Local...</p>
    </div>
  );

  return (
    <Layout 
      activeRoute={currentRoute} 
      onNavigate={setCurrentRoute} 
      userEmail={authState.user?.email || 'advogado@local.com'} 
      isAdmin={true}
    >
      {currentRoute === 'dashboard' && <DashboardHome profile={authState.profile} usage={authState.usage} onNavigate={setCurrentRoute} />}
      {currentRoute === 'new-petition' && <PetitionWizard userId={authState.user?.id} onCancel={() => setCurrentRoute('dashboard')} onSuccess={() => setCurrentRoute('my-petitions')} usage={authState.usage} accountStatus={'active'} isAdmin={true} />}
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
