import React, { useEffect, useState } from 'react';
import { supabase } from './services/supabaseClient';
import { AuthState, UserProfile, UsageLimit } from './types';
import { AuthPage } from './pages/AuthPage';
import { Layout } from './components/Layout';
import { DashboardHome } from './components/DashboardHome';
import { PetitionWizard } from './components/NewPetition/PetitionWizard';
import { DefenseWizard } from './components/NewPetition/DefenseWizard';
import { PetitionList } from './components/PetitionList';
import { AdminPanel } from './components/AdminPanel';
import { UserProfileView } from './components/UserProfile';
import { DeadlineManager } from './components/DeadlineManager';
import { Lock, Database, AlertTriangle, FileCode, Copy, Check, RefreshCw } from 'lucide-react';
import { Button } from './components/ui/Button';

// Script SQL para correção disponível diretamente na UI em caso de erro
const SQL_FIX_SCRIPT = `-- CORREÇÃO DEFINITIVA PARA ERRO 42P17 (RECURSÃO INFINITA)
-- Execute este script no SQL Editor do Supabase.

-- 1. Função segura para verificar se é admin
-- SECURITY DEFINER: roda com permissões do dono (postgres), ignorando o RLS da tabela profiles para evitar o loop.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- 2. Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Remover TODAS as políticas existentes da tabela profiles para limpar conflitos
-- Isso garante que nenhuma política antiga continue causando recursão.
DO $$ 
DECLARE 
    pol record; 
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname); 
    END LOOP; 
END $$;

-- 4. Criar Políticas Seguras

-- Leitura: Usuário vê o próprio perfil OU Admin vê todos
CREATE POLICY "Profiles View Policy" 
ON profiles FOR SELECT 
USING ( (auth.uid() = id) OR (is_admin()) );

-- Atualização: Usuário edita o próprio OU Admin edita todos
CREATE POLICY "Profiles Update Policy" 
ON profiles FOR UPDATE 
USING ( (auth.uid() = id) OR (is_admin()) );

-- Inserção: Usuário pode criar seu próprio perfil (ao se cadastrar)
CREATE POLICY "Profiles Insert Policy" 
ON profiles FOR INSERT 
WITH CHECK ( auth.uid() = id );

-- 5. Garantir permissões na função
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated, service_role;
`;

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
  const [dbError, setDbError] = useState<{isError: boolean, code?: string, message?: string}>({ isError: false });
  const [copied, setCopied] = useState(false);

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
    setDbError({ isError: false });
    
    try {
      // Fetch Profile
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        // Handle "Relation does not exist" (42P01) OR "Infinite Recursion" (42P17)
        if (
            profileError.code === '42P01' || 
            profileError.code === '42P17' || 
            profileError.message?.toLowerCase().includes('infinite recursion')
        ) {
           console.error('Critical DB Error:', profileError.message);
           setDbError({ isError: true, code: profileError.code || '42P17', message: profileError.message });
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

  const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(SQL_FIX_SCRIPT);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        alert('Erro ao copiar automaticamente. Selecione o texto e pressione Ctrl+C.');
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

  if (dbError.isError) {
      return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
              <div className="max-w-2xl w-full bg-white rounded-xl shadow-xl p-8 border border-red-200">
                  <div className="flex flex-col items-center text-center">
                      <div className="bg-red-100 p-4 rounded-full mb-4">
                          <Database size={48} className="text-red-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Correção Crítica Necessária</h2>
                      <p className="text-gray-600 mb-6">
                          O sistema detectou um erro de <strong>Recursão Infinita (42P17)</strong> nas políticas de segurança.
                          <br/>Isso ocorre quando a verificação de permissão entra em loop.
                      </p>
                      
                      <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 text-left w-full mb-6 relative">
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                              <AlertTriangle size={18} className="text-amber-500" /> Como resolver:
                          </h4>
                          <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2 mb-4">
                              <li>Copie o script SQL abaixo.</li>
                              <li>Abra o <strong>Supabase Dashboard</strong> &rarr; <strong>SQL Editor</strong>.</li>
                              <li>Cole o código e clique em <strong>RUN</strong>.</li>
                          </ol>

                          <div className="relative group">
                              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto h-48 border border-gray-700 whitespace-pre-wrap">
                                  {SQL_FIX_SCRIPT}
                              </pre>
                              <button 
                                  onClick={copyToClipboard}
                                  className="absolute top-2 right-2 bg-white text-gray-900 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 hover:bg-gray-100 transition-colors shadow-sm cursor-pointer z-10"
                              >
                                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                  {copied ? 'Copiado!' : 'Copiar SQL'}
                              </button>
                          </div>
                      </div>

                      <div className="flex gap-4 w-full">
                        <Button onClick={() => window.location.reload()} className="w-full flex items-center justify-center gap-2">
                            <RefreshCw size={18} /> Já executei o script, Tentar Novamente
                        </Button>
                      </div>
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
        // Check blocks/limits for new petition
        if (authState.profile?.account_status === 'blocked' || (authState.profile?.account_status === 'trial' && (authState.usage?.used_this_month || 0) >= (authState.usage?.monthly_limit || 5))) {
            return <BlockedScreen />;
        }
        return (
          <PetitionWizard 
            userId={authState.user?.id}
            onCancel={() => setCurrentRoute('dashboard')}
            onSuccess={() => {
              if (authState.user) fetchData(authState.user.id, authState.user);
              setCurrentRoute('my-petitions');
            }}
          />
        );
      case 'new-defense':
        // Check blocks/limits for new defense (shares same limits)
         if (authState.profile?.account_status === 'blocked' || (authState.profile?.account_status === 'trial' && (authState.usage?.used_this_month || 0) >= (authState.usage?.monthly_limit || 5))) {
            return <BlockedScreen />;
        }
        return (
            <DefenseWizard 
                userId={authState.user?.id}
                onCancel={() => setCurrentRoute('dashboard')}
                onSuccess={() => {
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