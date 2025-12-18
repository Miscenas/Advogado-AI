
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

// SCRIPT SQL ATUALIZADO E SEGURO (RLS + ADMIN POLICIES)
const SQL_FIX_SCRIPT = `-- SETUP JURISPET AI - BANCO DE DADOS SEGURO
-- Execute este script no SQL Editor do seu projeto Supabase.

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE PERFIS (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  email text,
  full_name text,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  account_status text DEFAULT 'trial' CHECK (account_status IN ('trial', 'active', 'blocked')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. TABELA DE PETIÇÕES
CREATE TABLE IF NOT EXISTS public.petitions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  area text,
  action_type text,
  content text,
  plaintiff_name text,
  defendant_name text,
  filed boolean DEFAULT false,
  analyzed_documents jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.petitions ENABLE ROW LEVEL SECURITY;

-- 4. TABELA DE PRAZOS
CREATE TABLE IF NOT EXISTS public.deadlines (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

-- 5. TABELA DE JURISPRUDÊNCIA
CREATE TABLE IF NOT EXISTS public.saved_jurisprudence (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  query text NOT NULL,
  result text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.saved_jurisprudence ENABLE ROW LEVEL SECURITY;

-- 6. TABELA DE LIMITES DE USO
CREATE TABLE IF NOT EXISTS public.usage_limits (
  user_id uuid REFERENCES auth.users(id) PRIMARY KEY,
  petitions_limit int DEFAULT 5,
  petitions_this_month int DEFAULT 0,
  storage_limit_bytes bigint DEFAULT 52428800, -- 50 MB
  used_storage_bytes bigint DEFAULT 0,
  last_reset timestamp with time zone DEFAULT timezone('utc'::text, now()),
  last_update timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

-- 7. TABELA DE PAGAMENTOS
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  plan text,
  status text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

-- 8. POLÍTICAS DE SEGURANÇA (RLS) - REINICIAR
DROP POLICY IF EXISTS "Public profiles are viewable by admins" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage own petitions" ON petitions;
DROP POLICY IF EXISTS "Admins can manage all petitions" ON petitions;
DROP POLICY IF EXISTS "Users can manage own deadlines" ON deadlines;
DROP POLICY IF EXISTS "Users can manage own jurisprudence" ON saved_jurisprudence;
DROP POLICY IF EXISTS "Users can view own usage" ON usage_limits;
DROP POLICY IF EXISTS "Admins can view all usage" ON usage_limits;

-- POLÍTICAS: PROFILES
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- POLÍTICAS: PETITIONS (OWNER + ADMIN)
CREATE POLICY "Users can manage own petitions" ON petitions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all petitions" ON petitions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- POLÍTICAS: DEADLINES (OWNER)
CREATE POLICY "Users can manage own deadlines" ON deadlines FOR ALL USING (auth.uid() = user_id);

-- POLÍTICAS: JURISPRUDENCE (OWNER)
CREATE POLICY "Users can manage own jurisprudence" ON saved_jurisprudence FOR ALL USING (auth.uid() = user_id);

-- POLÍTICAS: USAGE LIMITS
CREATE POLICY "Users can view own usage" ON usage_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all usage" ON usage_limits FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- POLÍTICAS: PAYMENTS
CREATE POLICY "Users can view own payments" ON payment_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON payment_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. TRIGGERS DE AUTOMAÇÃO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, account_status)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'user', 'trial');
  
  INSERT INTO public.usage_limits (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. TRIGGER DE CONTAGEM DE USO
CREATE OR REPLACE FUNCTION update_usage_on_petition() 
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.usage_limits 
    SET petitions_this_month = petitions_this_month + 1,
        used_storage_bytes = used_storage_bytes + pg_column_size(NEW),
        last_update = now()
    WHERE user_id = NEW.user_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.usage_limits 
    SET used_storage_bytes = GREATEST(0, used_storage_bytes - pg_column_size(OLD)),
        last_update = now()
    WHERE user_id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_petition_usage_change ON petitions;
CREATE TRIGGER on_petition_usage_change
AFTER INSERT OR DELETE ON petitions
FOR EACH ROW EXECUTE FUNCTION update_usage_on_petition();
`;

const BlockedScreen = ({ reason }: { reason: string }) => (
    <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <Lock className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-red-900 mb-2">Acesso Limitado</h3>
            <p className="text-red-700 mb-6">{reason}</p>
            <Button variant="danger" size="lg">Fazer Upgrade / Regularizar</Button>
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState((prev) => ({ ...prev, session, user: session?.user ?? null }));
      if (session?.user) {
          fetchData(session.user.id, session.user);
          checkDisclaimer();
      } else {
          setAuthState(prev => ({ ...prev, loading: false }));
      }
    });

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
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        if (profileError.code === '42P01') {
           setDbError({ isError: true, code: profileError.code, message: profileError.message });
           setAuthState(prev => ({ ...prev, loading: false }));
           return;
        }

        if (profileError.code === 'PGRST116') {
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
                await supabase.from('usage_limits').insert([{ user_id: userId }]);
             }
        }
      }

      const { data: usageData } = await supabase
        .from('usage_limits')
        .select('*')
        .eq('user_id', userId)
        .single();

      setAuthState(prev => ({
        ...prev,
        profile: profileData,
        usage: usageData,
        loading: false
      }));

    } catch (error) {
      console.error('Unexpected error', error);
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(SQL_FIX_SCRIPT);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        alert('Erro ao copiar.');
      }
  };

  const checkAccess = () => {
      if (!authState.profile || !authState.usage) return { allowed: true };
      if (authState.profile.role === 'admin') return { allowed: true };

      const status = authState.profile.account_status;
      const usage = authState.usage;

      if (status === 'blocked') return { allowed: false, reason: 'Conta bloqueada administrativamente.' };
      if (status === 'trial') {
          const limit = usage.petitions_limit || 5;
          if ((usage.petitions_this_month || 0) >= limit) {
              return { allowed: false, reason: `Limite do plano Gratuito atingido (${limit} petições).` };
          }
      }
      return { allowed: true };
  };

  if (authState.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-juris-900"></div>
           <p className="text-juris-700 font-medium">Iniciando JurisPet AI...</p>
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
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup do Banco de Dados</h2>
                      <p className="text-gray-600 mb-6">Execute o script abaixo no SQL Editor do Supabase para ativar a segurança RLS e tabelas.</p>
                      <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 text-left w-full mb-6 relative">
                          <div className="relative group">
                              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto h-48 border border-gray-700 whitespace-pre-wrap">
                                  {SQL_FIX_SCRIPT}
                              </pre>
                              <button onClick={copyToClipboard} className="absolute top-2 right-2 bg-white text-gray-900 px-3 py-1.5 rounded text-xs font-bold shadow-sm z-10">
                                  {copied ? 'Copiado!' : 'Copiar SQL'}
                              </button>
                          </div>
                      </div>
                      <Button onClick={() => window.location.reload()} className="w-full">
                          <RefreshCw size={18} className="mr-2" /> Já executei o script, Atualizar
                      </Button>
                  </div>
              </div>
          </div>
      );
  }

  if (!authState.session) return <AuthPage />;

  const renderContent = () => {
    const isAdmin = authState.profile?.role === 'admin';
    const access = checkAccess();

    if (currentRoute === 'admin' && !isAdmin) return <div>Não autorizado.</div>;

    switch (currentRoute) {
      case 'dashboard': return <DashboardHome profile={authState.profile} usage={authState.usage} onNavigate={setCurrentRoute} />;
      case 'new-petition':
        if (!access.allowed) return <BlockedScreen reason={access.reason!} />;
        return <PetitionWizard userId={authState.user?.id} onCancel={() => setCurrentRoute('dashboard')} onSuccess={() => setCurrentRoute('my-petitions')} usage={authState.usage} accountStatus={authState.profile?.account_status || 'trial'} isAdmin={isAdmin} />;
      case 'new-defense':
        if (!access.allowed) return <BlockedScreen reason={access.reason!} />;
        return <DefenseWizard userId={authState.user?.id} onCancel={() => setCurrentRoute('dashboard')} onSuccess={() => setCurrentRoute('my-petitions')} usage={authState.usage} accountStatus={authState.profile?.account_status || 'trial'} isAdmin={isAdmin} />;
      case 'my-petitions': return <PetitionList userId={authState.user?.id} />;
      case 'jurisprudence': return <JurisprudenceSearch userId={authState.user?.id} />;
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
      {showDisclaimer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-center">
                <Info className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Aviso Legal</h3>
                <p className="text-gray-600 mb-6 text-sm">O conteúdo gerado pela IA é uma minuta sugestiva e deve ser validado por um advogado.</p>
                <Button onClick={handleAcceptDisclaimer} className="w-full">Entendi e concordo</Button>
            </div>
        </div>
      )}
      {renderContent()}
    </Layout>
  );
}

export default App;
