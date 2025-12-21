
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  // Padrão universal para acessar variáveis em produção (Vite/Browser)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

const isConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'undefined' && 
  supabaseAnonKey !== 'undefined';

let client;

if (isConfigured) {
  client = createClient(supabaseUrl!, supabaseAnonKey!);
} else {
  console.warn('JurisPet AI: Backend real não detectado no ambiente de produção. Iniciando em MODO DEMO.');
  
  const MOCK_USER_ID = 'user-demo-123';
  const mockKeys = {
    session: 'jurispet_mock_session',
    petitions: 'jurispet_mock_petitions',
    deadlines: 'jurispet_mock_deadlines',
    jurisprudence: 'jurispet_mock_jurisprudence',
    profiles: 'jurispet_mock_profiles',
    usage: 'jurispet_mock_usage'
  };
  
  const authListeners: any[] = [];

  const getStoredData = (key: string) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  };

  const saveStoredData = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  if (!localStorage.getItem(mockKeys.profiles)) {
    saveStoredData(mockKeys.profiles, [{ 
      id: MOCK_USER_ID, 
      full_name: 'Dr. Advogado (Demo)', 
      email: 'demo@jurispet.com',
      account_status: 'trial', 
      role: 'admin', 
      created_at: new Date().toISOString() 
    }]);
  }

  client = {
    auth: {
      getSession: async () => {
        const stored = localStorage.getItem(mockKeys.session);
        return { data: { session: stored ? JSON.parse(stored) : null }, error: null };
      },
      onAuthStateChange: (callback: any) => {
        authListeners.push(callback);
        const stored = localStorage.getItem(mockKeys.session);
        const session = stored ? JSON.parse(stored) : null;
        setTimeout(() => callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session), 0);
        return { data: { subscription: { unsubscribe: () => {
          const index = authListeners.indexOf(callback);
          if (index > -1) authListeners.splice(index, 1);
        } } } };
      },
      signInWithPassword: async ({ email }: any) => {
        const session = { user: { id: MOCK_USER_ID, email }, access_token: 'mock', expires_in: 3600 };
        localStorage.setItem(mockKeys.session, JSON.stringify(session));
        authListeners.forEach(cb => cb('SIGNED_IN', session));
        return { data: { session }, error: null };
      },
      signUp: async ({ email, options }: any) => {
        const session = { user: { id: MOCK_USER_ID, email, user_metadata: options?.data }, access_token: 'mock', expires_in: 3600 };
        localStorage.setItem(mockKeys.session, JSON.stringify(session));
        authListeners.forEach(cb => cb('SIGNED_IN', session));
        return { data: { session }, error: null };
      },
      signOut: async () => {
        localStorage.removeItem(mockKeys.session);
        authListeners.forEach(cb => cb('SIGNED_OUT', null));
        return { error: null };
      },
      updateUser: async () => ({ data: { user: { id: MOCK_USER_ID } }, error: null })
    },
    from: (table: string) => {
      return {
        select: () => {
          let data = [];
          if (table === 'petitions') data = getStoredData(mockKeys.petitions);
          else if (table === 'deadlines') data = getStoredData(mockKeys.deadlines);
          else if (table === 'profiles') data = getStoredData(mockKeys.profiles);
          else if (table === 'usage_limits') data = getStoredData(mockKeys.usage).length ? getStoredData(mockKeys.usage) : [{ user_id: MOCK_USER_ID, petitions_limit: 5, petitions_this_month: getStoredData(mockKeys.petitions).length }];
          else if (table === 'saved_jurisprudence') data = getStoredData(mockKeys.jurisprudence);

          const chain = (currentData: any[]) => ({
             eq: (col: string, val: any) => chain(currentData.filter(x => x[col] === val)),
             order: (col: string, { ascending = true }: any = {}) => chain([...currentData].sort((a,b) => ascending ? (a[col] > b[col] ? 1 : -1) : (a[col] < b[col] ? 1 : -1))),
             limit: (n: number) => chain(currentData.slice(0, n)),
             single: async () => ({ data: currentData[0] || null, error: currentData.length ? null : { code: 'PGRST116' } }),
             then: (resolve: any) => resolve({ data: currentData, error: null })
          });
          return chain(data);
        },
        insert: (data: any) => {
            const map: Record<string, string> = { 'petitions': mockKeys.petitions, 'deadlines': mockKeys.deadlines, 'saved_jurisprudence': mockKeys.jurisprudence };
            const key = map[table];
            if (key) {
              const current = getStoredData(key);
              const items = Array.isArray(data) ? data : [data];
              const newItems = items.map(item => ({ ...item, id: Math.random().toString(36).substr(2, 9), created_at: item.created_at || new Date().toISOString() }));
              saveStoredData(key, [...current, ...newItems]);
              return { select: () => ({ single: async () => ({ data: newItems[0], error: null }), then: (r: any) => r({ data: newItems, error: null }) }), then: (r: any) => r({ data: newItems, error: null }) };
            }
            return { then: (r: any) => r({ data: [], error: null }) };
        },
        update: (updates: any) => ({
            eq: (col: string, val: any) => {
              const map: Record<string, string> = { 'petitions': mockKeys.petitions, 'deadlines': mockKeys.deadlines, 'profiles': mockKeys.profiles };
              const key = map[table];
              if (key) {
                const current = getStoredData(key);
                const updated = current.map((item: any) => item[col] === val ? { ...item, ...updates } : item);
                saveStoredData(key, updated);
              }
              return { then: (r: any) => r({ error: null }) };
            }
        }),
        delete: () => ({
            eq: (col: string, val: any) => {
              const map: Record<string, string> = { 'petitions': mockKeys.petitions, 'deadlines': mockKeys.deadlines, 'saved_jurisprudence': mockKeys.jurisprudence };
              const key = map[table];
              if (key) {
                const current = getStoredData(key);
                saveStoredData(key, current.filter((item: any) => item[col] !== val));
              }
              return { then: (r: any) => r({ error: null }) };
            }
        })
      };
    }
  } as any;
}

export const supabase = client;
export const isLive = isConfigured;
