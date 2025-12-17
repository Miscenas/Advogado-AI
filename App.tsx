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
import { JurisprudenceSearch } from './components/JurisprudenceSearch';
import { CourtPortals } from './components/CourtPortals';
import { SubscriptionPage, PaymentSuccess, PaymentFailure } from './components/SubscriptionPage';
import { Lock, Database, AlertTriangle, FileCode, Copy, Check, RefreshCw, Info } from 'lucide-react';
import { Button } from './components/ui/Button';

// Script SQL para correção disponível diretamente na UI em caso de erro
const SQL_FIX_SCRIPT = `-- CORREÇÃO COMPLETA DE SEGURANÇA E ESTRUTURA
-- Execute este script no SQL Editor do Supabase para blindar sua aplicação.

-- 1. FUNÇÕES AUXILIARES DE SEGURANÇA (Evita erro 42P17 - Recursão Infinita)
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

-- 2. TABELA DE PERFIS (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  email text,
  account_status text DEFAULT 'trial' CHECK (account_status IN ('trial', 'active', 'blocked')),
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas antigas para evitar conflitos
DO $$ 
DECLARE pol record; 
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname); 
    END LOOP; 
END $$;

-- Políticas Profiles:
-- Todos podem ver perfis (necessário para admin ver users)
CREATE POLICY "Profiles are viewable by users and admins" ON profiles FOR SELECT USING ( (auth.uid() = id) OR (is_admin()) );
-- Usuários só podem inserir seu próprio perfil
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
-- Usuários podem editar seu próprio perfil
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 3. TABELA DE PETIÇÕES (PETITIONS)
CREATE TABLE IF NOT EXISTS public.petitions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  area text,
  action_type text,
  content text,
  plaintiff_name text,
  defendant_name text,
  filed boolean DEFAULT false,
  analyzed_documents jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE petitions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'petitions' LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON petitions', pol.policyname); 
    END LOOP; 
END $$;

CREATE POLICY "Users can CRUD own petitions" ON petitions
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. TABELA DE PRAZOS (DEADLINES)
CREATE TABLE IF NOT EXISTS public.deadlines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL,
  description text,
  due_date timestamp with time zone NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'deadlines' LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON deadlines', pol.policyname); 
    END LOOP; 
END $$;

CREATE POLICY "Users can CRUD own deadlines" ON deadlines
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. TABELA DE LIMITES DE USO (USAGE_LIMITS)
CREATE TABLE IF NOT EXISTS public.usage_limits (
  user_id uuid REFERENCES auth.users(id) PRIMARY KEY,
  monthly_limit int DEFAULT 5,
  used_this_month int DEFAULT 0,
  last_reset timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'usage_limits' LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON usage_limits', pol.policyname); 
    END LOOP; 
END $$;

CREATE POLICY "Users can view own usage" ON usage_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage" ON usage_limits FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Update permitido para o MVP. Em produção real, use SECURITY DEFINER functions.
CREATE POLICY "Users can update own usage" ON usage_limits FOR UPDATE USING (auth.uid() = user_id);

-- 6. JURISPRUDÊNCIA SALVA
CREATE TABLE IF NOT EXISTS saved_jurisprudence (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  query text NOT NULL,
  result text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE saved_jurisprudence ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'saved_jurisprudence' LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON saved_jurisprudence', pol.policyname); 
    END LOOP; 
END $$;

CREATE POLICY "Users manage own jurisprudence" ON saved_jurisprudence
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 7. TENTATIVAS DE PAGAMENTO
CREATE TABLE IF NOT EXISTS payment_attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  plan text NOT NULL,
  status text DEFAULT 'initiated',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'payment_attempts' LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON payment_attempts', pol.policyname); 
    END LOOP; 
END $$;

CREATE POLICY "Users insert payment attempts" ON payment_attempts
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. TRIGGER PARA INCREMENTAR USO AUTOMATICAMENTE
-- Isso garante que o limite seja contado no servidor, não no cliente
CREATE OR REPLACE FUNCTION increment_usage() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usage_limits (user_id, monthly_limit, used_this_month)
  VALUES (NEW.user_id, 5, 1)
  ON CONFLICT (user_id) DO UPDATE 
  SET used_this_month = usage_limits.used_this_month + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_petition_created ON petitions;
CREATE TRIGGER on_petition_created
AFTER INSERT ON petitions
FOR EACH ROW EXECUTE FUNCTION increment_usage();

-- Permissões Finais
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
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState((prev) => ({ ...prev, session, user: session?.user ?? null }));
      if (session?.user) {
          fetchData(session.user.id, session.user);
          // Check disclaimer only on initial load or login
          checkDisclaimer();
      } else {
          setAuthState(prev => ({ ...prev, loading: false }));
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthState((prev) => ({ ...prev, session, user: session?.user ?? null }));
      if (session?.user) {
        fetchData(session.user.id, session.user);
        if (event === 'SIGNED_IN') {
             checkDisclaimer();
        }
      } else {
        setAuthState(prev => ({ ...prev, profile: null, usage: null, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkDisclaimer = () => {
      // Use SessionStorage so it persists on reload (F5) but clears on new tab/close
      const seen = sessionStorage.getItem('disclaimer_seen');
      if (!seen) {
          setShowDisclaimer(true);
      }
  };

  const handleAcceptDisclaimer = () => {
      sessionStorage.setItem('disclaimer_seen', 'true');
      setShowDisclaimer(false);
  };

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
           <p className="text-juris-700 font-medium animate-pulse">Carregando Advogado IA...</p>
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
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Atualização de Banco de Dados Necessária</h2>
                      <p className="text-gray-600 mb-6">
                          Para garantir a segurança dos dados e corrigir permissões, execute o script abaixo no Supabase.
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
            onNavigate={setCurrentRoute} 
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
      case 'jurisprudence':
        return <JurisprudenceSearch userId={authState.user?.id} />;
      case 'deadlines':
        return <DeadlineManager userId={authState.user?.id} />;
      case 'portals':
        return <CourtPortals />;
      case 'subscription':
        return <SubscriptionPage user={authState.profile} onNavigate={setCurrentRoute} />;
      case 'payment_success':
        return <PaymentSuccess onNavigate={setCurrentRoute} />;
      case 'payment_failure':
        return <PaymentFailure onNavigate={setCurrentRoute} />;
      case 'profile':
        return <UserProfileView profile={authState.profile} />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <DashboardHome profile={authState.profile} usage={authState.usage} onNavigate={setCurrentRoute} />;
    }
  };

  return (
    <Layout 
      activeRoute={currentRoute} 
      onNavigate={setCurrentRoute}
      userEmail={authState.user?.email}
      isAdmin={authState.profile?.role === 'admin'}
    >
      {/* Global Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-gray-100 animate-in zoom-in-95">
                <div className="flex flex-col items-center text-center">
                    <div className="bg-blue-100 p-3 rounded-full mb-4">
                        <Info className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Aviso de Responsabilidade</h3>
                    <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                        O conteúdo gerado por esta Inteligência Artificial serve como <strong>minuta sugestiva</strong>. 
                        É imprescindível que todo material seja revisado, validado e assinado por um advogado antes de qualquer utilização processual.
                    </p>
                    <Button 
                        onClick={handleAcceptDisclaimer} 
                        className="w-full bg-juris-900 hover:bg-juris-800"
                    >
                        Li e concordo, prosseguir
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