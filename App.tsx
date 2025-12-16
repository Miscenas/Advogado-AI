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
import { DeadlineManager } from './components/DeadlineManager';
import { Lock, Database, AlertTriangle } from 'lucide-react';
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
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState((prev) => ({ ...prev, session, user: session?.user ?? null }));
      if (session?.user) fetchData(session.user.id, session.user);
      else setAuthState(prev => ({ ...prev, loading: false }));
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState((prev) => ({ ...prev, session, user: session?.user ?? null }));
      if (session?.user) {
        fetchData(session.user.id, session.user);
      } else {
        setAuthState(prev => ({ ...prev, profile: null, usage: null, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async (userId: string, userObject: any) => {
    setAuthState(prev => ({ ...prev, loading: true }));
    setDbError(false);
    
    try {
      // Fetch Profile
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        // Handle "Relation does not exist" (42P01) OR "Infinite Recursion" (42P17)
        // 42P17 means the policies are broken and need the SQL script fix.
        if (profileError.code === '42P01' || profileError.code === '42P17') {
           console.error('Critical DB Error:', profileError.message);
           setDbError(true);
           setAuthState(prev => ({ ...prev, loading: false }));
           return;
        }

        // Handle "No rows found" (Profile missing) - Auto-create self-healing
        if (profileError.code === 'PGRST116') {
             console.log('Profile not found. Attempting to create default profile...');
             const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert([{
                   id: userId,
                   email: userObject.email,
                   full_name: userObject.user_metadata?.full_name || 'Novo Usuário',
                   role: 'user',
                   account_status: 'trial'
                }])
                .select()
                .single();
             
             if (!createError && newProfile) {
                profileData = newProfile;
                
                // Initialize usage limit too
                await supabase.from('usage_limits').insert([{ user_id: userId }]);
             } else {
                console.error('Error creating profile fallback:', createError);
             }
        } else {
             // Log other errors clearly
             console.error('Error fetching profile:', JSON.stringify(profileError, null, 2));
        }
      }

      // Fetch Usage
      const { data: usageData, error: usageError } = await supabase
        .from('usage_limits')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (usageError && usageError.code !== 'PGRST116') {
         // Don't alert on usage error, just log
         console.warn('Error fetching usage:', usageError);
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

  if (dbError) {
      return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
              <div className="max-w-xl w-full bg-white rounded-xl shadow-xl p-8 border border-red-200">
                  <div className="flex flex-col items-center text-center">
                      <div className="bg-red-100 p-4 rounded-full mb-4">
                          <Database size={48} className="text-red-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuração do Banco Necessária</h2>
                      <p className="text-gray-600 mb-6">
                          O sistema detectou um problema nas permissões ou tabelas do banco de dados (Erro de Recursão ou Tabela Faltante).
                      </p>
                      
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-left w-full mb-6">
                          <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                              <AlertTriangle size={16} className="text-amber-500" /> Ação Necessária:
                          </h4>
                          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                              <li>Acesse o <strong>SQL Editor</strong> no painel do Supabase.</li>
                              <li>Copie o conteúdo atualizado do arquivo <code>SUPABASE_SETUP.sql</code>.</li>
                              <li>Execute o script para corrigir as políticas de segurança.</li>
                              <li>Recarregue esta página.</li>
                          </ol>
                      </div>

                      <Button onClick={() => window.location.reload()}>
                          Já executei o script, recarregar
                      </Button>
                  </div>
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
              if (authState.user) fetchData(authState.user.id, authState.user);
              setCurrentRoute('my-petitions');
            }}
          />
        );
      case 'my-petitions':
        return <PetitionList userId={authState.user?.id} />;
      case 'deadlines':
        return <DeadlineManager userId={authState.user?.id} />;
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