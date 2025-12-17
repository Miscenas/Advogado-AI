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

// Script SQL COMPLETO para configuração do Supabase
const SQL_FIX_SCRIPT = `-- SETUP COMPLETO DO BANCO DE DADOS (JURISPET AI)
-- Copie e cole este script no SQL Editor do Supabase para criar todas as tabelas e políticas.

-- 1. Habilitar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Perfis (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  email text,
  full_name text,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  account_status text DEFAULT 'trial' CHECK (account_status IN ('trial', 'active', 'blocked')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Tabela de Petições (Petitions)
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

-- 4. Tabela de Prazos (Deadlines)
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

-- 5. Tabela de Jurisprudência Salva
CREATE TABLE IF NOT EXISTS public.saved_jurisprudence (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  query text NOT NULL,
  result text, -- HTML content
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.saved_jurisprudence ENABLE ROW LEVEL SECURITY;

-- 6. Tabela de Limites de Uso (Usage Limits)
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

-- 7. Tabela de Tentativas de Pagamento
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  plan text,
  status text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

-- 8. POLÍTICAS DE SEGURANÇA (RLS)
-- Remove políticas antigas para evitar duplicação
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own petitions" ON petitions;
DROP POLICY IF EXISTS "Users can insert own petitions" ON petitions;
DROP POLICY IF EXISTS "Users can update own petitions" ON petitions;
DROP POLICY IF EXISTS "Users can delete own petitions" ON petitions;
DROP POLICY IF EXISTS "Users can view own deadlines" ON deadlines;
DROP POLICY IF EXISTS "Users can insert own deadlines" ON deadlines;
DROP POLICY IF EXISTS "Users can update own deadlines" ON deadlines;
DROP POLICY IF EXISTS "Users can delete own deadlines" ON deadlines;
DROP POLICY IF EXISTS "Users can view own jurisprudence" ON saved_jurisprudence;
DROP POLICY IF EXISTS "Users can insert own jurisprudence" ON saved_jurisprudence;
DROP POLICY IF EXISTS "Users can delete own jurisprudence" ON saved_jurisprudence;
DROP POLICY IF EXISTS "Users can view own usage" ON usage_limits;

-- Cria novas políticas
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own petitions" ON petitions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own petitions" ON petitions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own petitions" ON petitions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own petitions" ON petitions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own deadlines" ON deadlines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deadlines" ON deadlines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deadlines" ON deadlines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own deadlines" ON deadlines FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own jurisprudence" ON saved_jurisprudence FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own jurisprudence" ON saved_jurisprudence FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own jurisprudence" ON saved_jurisprudence FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage" ON usage_limits FOR SELECT USING (auth.uid() = user_id);
-- Usage limits is generally updated by triggers/system, but we allow select.

-- 9. FUNÇÃO E TRIGGER PARA PERFIL AUTOMÁTICO
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

-- 10. TRIGGER DE USO HÍBRIDO (Contagem + Armazenamento)
CREATE OR REPLACE FUNCTION update_hybrid_usage() 
RETURNS TRIGGER AS $$
DECLARE
  row_size bigint;
  old_size bigint;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    row_size := pg_column_size(NEW);
    INSERT INTO public.usage_limits (user_id, petitions_this_month, used_storage_bytes, last_reset, last_update)
    VALUES (NEW.user_id, 1, row_size, now(), now())
    ON CONFLICT (user_id) DO UPDATE 
    SET 
      petitions_this_month = CASE 
         WHEN (EXTRACT(MONTH FROM usage_limits.last_reset) != EXTRACT(MONTH FROM now())) THEN 1 
         ELSE usage_limits.petitions_this_month + 1 
      END,
      last_reset = CASE 
         WHEN (EXTRACT(MONTH FROM usage_limits.last_reset) != EXTRACT(MONTH FROM now())) THEN now() 
         ELSE usage_limits.last_reset 
      END,
      used_storage_bytes = usage_limits.used_storage_bytes + row_size,
      last_update = now();
  ELSIF (TG_OP = 'DELETE') THEN
    old_size := pg_column_size(OLD);
    UPDATE public.usage_limits 
    SET used_storage_bytes = GREATEST(0, used_storage_bytes - old_size),
        last_update = now()
    WHERE user_id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_petition_hybrid_usage ON petitions;
CREATE TRIGGER on_petition_hybrid_usage
AFTER INSERT OR DELETE ON petitions
FOR EACH ROW EXECUTE FUNCTION update_hybrid_usage();
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

      // Fetch Usage
      const { data: usageData, error: usageError } = await supabase
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

  // Lógica de Bloqueio baseada no Tipo de Conta
  const checkAccess = () => {
      if (!authState.profile || !authState.usage) return { allowed: true };
      
      // ADMIN: Acesso Total
      if (authState.profile.role === 'admin') {
          return { allowed: true };
      }

      const status = authState.profile.account_status;
      const usage = authState.usage;

      if (status === 'blocked') {
          return { allowed: false, reason: 'Sua conta está bloqueada administrativamente.' };
      }

      if (status === 'trial') {
          // Free User: Limitado por Quantidade (5)
          const limit = usage.petitions_limit || 5;
          const current = usage.petitions_this_month || 0;
          if (current >= limit) {
              return { allowed: false, reason: `Limite do plano Gratuito atingido (${current}/${limit} petições este mês).` };
          }
      } else if (status === 'active') {
          // Paid User (Pro):
          // Regra 1: Quantidade (100 petições/mês)
          const quantityLimit = 100;
          const currentQuantity = usage.petitions_this_month || 0;
          
          if (currentQuantity >= quantityLimit) {
              return { allowed: false, reason: `Limite mensal de segurança atingido (${currentQuantity}/${quantityLimit} petições).` };
          }

          // Regra 2: Armazenamento (50MB)
          const storageLimit = usage.storage_limit_bytes || 52428800;
          const currentStorage = usage.used_storage_bytes || 0;
          
          if (currentStorage >= storageLimit) {
              return { allowed: false, reason: 'Limite de armazenamento de 50MB atingido. Libere espaço excluindo petições antigas.' };
          }
      }

      return { allowed: true };
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
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuração Inicial do Banco de Dados</h2>
                      <p className="text-gray-600 mb-6">
                          O banco de dados Supabase precisa ser configurado. Execute o script SQL abaixo para criar as tabelas e permissões.
                      </p>
                      
                      <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 text-left w-full mb-6 relative">
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                              <AlertTriangle size={18} className="text-amber-500" /> Script SQL de Instalação:
                          </h4>
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
    const isAdmin = authState.profile?.role === 'admin';
    if (currentRoute === 'admin' && !isAdmin) {
       return <div className="text-center p-8 text-red-600">Acesso não autorizado.</div>;
    }

    const access = checkAccess();

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
        if (!access.allowed) return <BlockedScreen reason={access.reason!} />;
        return (
          <PetitionWizard 
            userId={authState.user?.id}
            onCancel={() => setCurrentRoute('dashboard')}
            onSuccess={() => {
              if (authState.user) fetchData(authState.user.id, authState.user);
              setCurrentRoute('my-petitions');
            }}
            usage={authState.usage}
            accountStatus={authState.profile?.account_status || 'trial'}
            isAdmin={isAdmin}
          />
        );
      case 'new-defense':
        if (!access.allowed) return <BlockedScreen reason={access.reason!} />;
        return (
            <DefenseWizard 
                userId={authState.user?.id}
                onCancel={() => setCurrentRoute('dashboard')}
                onSuccess={() => {
                  if (authState.user) fetchData(authState.user.id, authState.user);
                  setCurrentRoute('my-petitions');
                }}
                usage={authState.usage}
                accountStatus={authState.profile?.account_status || 'trial'}
                isAdmin={isAdmin}
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