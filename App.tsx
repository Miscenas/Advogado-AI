import React, { useEffect, useState } from 'react';
import { supabase } from './services/supabaseClient';
import { AuthState, UserProfile, UsageLimit } from './types';
import { AuthPage } from './pages/AuthPage';
import { Layout } from './components/Layout';
import { DashboardHome } from './components/DashboardHome';
import { PetitionWizard } from './components/NewPetition/PetitionWizard';
import { PetitionList } from './components/PetitionList';
import { AdminPanel } from './components/AdminPanel';
import { UserProfileView } from './components/UserProfile';
import { Lock } from 'lucide-react';
import { Button } from './components/ui/Button';

const BlockedScreen = () => (
    <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <Lock className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-red-900 mb-2">Conta Bloqueada ou Limite Atingido</h3>
            <p className="text-red-700 mb-6">Sua conta está bloqueada ou atingiu o limite do plano gratuito. Entre em contato para regularizar seu acesso.</p>
            <Button variant="danger" size="lg">Regularizar Acesso</Button>
        </div>
    </div>
);

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
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState((prev) => ({ ...prev, session, user: session?.user ?? null }));
      if (session?.user) fetchData(session.user.id);
      else setAuthState(prev => ({ ...prev, loading: false }));
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState((prev) => ({ ...prev, session, user: session?.user ?? null }));
      if (session?.user) {
        fetchData(session.user.id);
      } else {
        setAuthState(prev => ({ ...prev, profile: null, usage: null, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async (userId: string) => {
    setAuthState(prev => ({ ...prev, loading: true }));
    try {
      // Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      // Fetch Usage
      const { data: usageData, error: usageError } = await supabase
        .from('usage_limits')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (usageError && usageError.code !== 'PGRST116') {
         console.error('Error fetching usage:', usageError);
      }

      setAuthState(prev => ({
        ...prev,
        profile: profileData,
        usage: usageData,
        loading: false
      }));

    } catch (error) {
      console.error('Unexpected error fetching data', error);
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  if (authState.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-juris-900"></div>
           <p className="text-juris-700 font-medium animate-pulse">Carregando Advogado AI...</p>
        </div>
      </div>
    );
  }

  if (!authState.session) {
    return <AuthPage />;
  }

  const renderContent = () => {
    // Admin only route protection
    if (currentRoute === 'admin' && authState.profile?.role !== 'admin') {
       return <div className="text-center p-8 text-red-600">Acesso não autorizado.</div>;
    }

    switch (currentRoute) {
      case 'dashboard':
        return (
          <DashboardHome 
            profile={authState.profile} 
            usage={authState.usage} 
            onNewPetition={() => setCurrentRoute('new-petition')} 
          />
        );
      case 'new-petition':
        // Check blocks/limits
        // If blocked, stop. If trial and limit reached, stop.
        const isBlocked = authState.profile?.account_status === 'blocked';
        const isTrialLimit = authState.profile?.account_status === 'trial' && (authState.usage?.used_this_month || 0) >= (authState.usage?.monthly_limit || 5);
        
        if (isBlocked || isTrialLimit) {
          // If active, they are never blocked by limit in this logic (per requirements "Active has unlimited")
          // But if status is explicitly 'blocked', we show block screen.
          if (authState.profile?.account_status === 'active' && !isBlocked) {
             // Pass through if active and not blocked
          } else {
             return <BlockedScreen />;
          }
        }
        
        return (
          <PetitionWizard 
            userId={authState.user?.id}
            onCancel={() => setCurrentRoute('dashboard')}
            onSuccess={() => {
              // Refresh usage if needed, then navigate
              if (authState.user) fetchData(authState.user.id);
              setCurrentRoute('my-petitions');
            }}
          />
        );
      case 'my-petitions':
        return <PetitionList userId={authState.user?.id} />;
      case 'profile':
        return <UserProfileView profile={authState.profile} />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <DashboardHome profile={authState.profile} usage={authState.usage} onNewPetition={() => setCurrentRoute('new-petition')} />;
    }
  };

  return (
    <Layout 
      activeRoute={currentRoute} 
      onNavigate={setCurrentRoute}
      userEmail={authState.user?.email}
      isAdmin={authState.profile?.role === 'admin'}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;