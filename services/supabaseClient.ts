
/**
 * JurisPet AI - Mock Database Engine (LocalStorage)
 * Este arquivo substitui o cliente Supabase real para evitar erros de deploy.
 * O sistema agora funciona de forma independente, salvando tudo no seu navegador.
 */

const MOCK_USER_ID = 'dev-user-001';
const STORAGE_KEYS = {
  session: 'jurispet_local_session',
  profiles: 'jurispet_local_profiles',
  petitions: 'jurispet_local_petitions',
  deadlines: 'jurispet_local_deadlines',
  usage: 'jurispet_local_usage',
  jurisprudence: 'jurispet_local_jurisprudence'
};

// Funções Auxiliares de Persistência Local
const getLocal = (key: string) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveLocal = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Inicialização de Perfil Default caso não exista
if (!localStorage.getItem(STORAGE_KEYS.profiles)) {
  saveLocal(STORAGE_KEYS.profiles, [{
    id: MOCK_USER_ID,
    full_name: 'Dr. Advogado Iniciante',
    email: 'contato@jurispet.local',
    account_status: 'trial',
    role: 'admin',
    created_at: new Date().toISOString()
  }]);
}

export const supabase = {
  auth: {
    getSession: async () => {
      const session = localStorage.getItem(STORAGE_KEYS.session);
      return { data: { session: session ? JSON.parse(session) : { user: { id: MOCK_USER_ID, email: 'user@local.com' } } }, error: null };
    },
    onAuthStateChange: (callback: any) => {
      // Simula uma sessão sempre ativa para desenvolvimento
      const session = { user: { id: MOCK_USER_ID, email: 'user@local.com' } };
      setTimeout(() => callback('SIGNED_IN', session), 0);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signInWithPassword: async () => ({ data: { user: { id: MOCK_USER_ID } }, error: null }),
    signOut: async () => {
      localStorage.removeItem(STORAGE_KEYS.session);
      window.location.reload();
      return { error: null };
    }
  },
  from: (table: string) => {
    return {
      select: (columns?: string) => {
        let data = getLocal(STORAGE_KEYS[table as keyof typeof STORAGE_KEYS] || '');
        
        const chain = (currentData: any[]) => ({
          eq: (col: string, val: any) => chain(currentData.filter(item => item[col] === val)),
          order: (col: string, { ascending = true } = {}) => chain([...currentData].sort((a,b) => ascending ? (a[col] > b[col] ? 1 : -1) : (a[col] < b[col] ? 1 : -1))),
          limit: (n: number) => chain(currentData.slice(0, n)),
          single: async () => ({ data: currentData[0] || null, error: currentData.length ? null : { code: 'PGRST116', message: 'Not found' } }),
          then: (resolve: any) => resolve({ data: currentData, error: null })
        });
        
        return chain(data);
      },
      insert: (data: any) => {
        const key = STORAGE_KEYS[table as keyof typeof STORAGE_KEYS];
        const current = getLocal(key);
        const items = Array.isArray(data) ? data : [data];
        const newItems = items.map(item => ({
          ...item,
          id: item.id || Math.random().toString(36).substr(2, 9),
          created_at: item.created_at || new Date().toISOString()
        }));
        saveLocal(key, [...current, ...newItems]);
        return { 
          select: () => ({ single: async () => ({ data: newItems[0], error: null }) }),
          then: (r: any) => r({ data: newItems, error: null }) 
        };
      },
      update: (updates: any) => ({
        eq: (col: string, val: any) => {
          const key = STORAGE_KEYS[table as keyof typeof STORAGE_KEYS];
          const current = getLocal(key);
          const updated = current.map((item: any) => item[col] === val ? { ...item, ...updates } : item);
          saveLocal(key, updated);
          return { then: (r: any) => r({ error: null }) };
        }
      }),
      delete: () => ({
        eq: (col: string, val: any) => {
          const key = STORAGE_KEYS[table as keyof typeof STORAGE_KEYS];
          const current = getLocal(key);
          saveLocal(key, current.filter((item: any) => item[col] !== val));
          return { then: (r: any) => r({ error: null }) };
        }
      })
    };
  }
} as any;

export const isLive = false;
