
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO FIXA ---
const FIXED_SUPABASE_URL = ""; 
const FIXED_SUPABASE_KEY = ""; 

const getEnv = (key: string) => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
};

const getStored = (key: string) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(key);
  }
  return null;
};

const envUrl = getEnv('VITE_SUPABASE_URL');
const envKey = getEnv('VITE_SUPABASE_ANON_KEY');
const storedUrl = getStored('custom_supabase_url');
const storedKey = getStored('custom_supabase_key');

const supabaseUrl = FIXED_SUPABASE_URL || envUrl || storedUrl;
const supabaseAnonKey = FIXED_SUPABASE_KEY || envKey || storedKey;

const isConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'undefined' && 
  supabaseAnonKey !== 'undefined';

let client;

if (isConfigured) {
  client = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('JurisPet AI: Backend não configurado. Usando persistência local (LocalStorage).');
  
  const MOCK_USER_ID = 'user-demo-123';
  const mockSessionKey = 'jurispet_mock_session';
  const mockPetitionsKey = 'jurispet_mock_petitions';
  const mockDeadlinesKey = 'jurispet_mock_deadlines';
  
  // Sistema de Listeners para o Mock Auth
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

  client = {
    auth: {
      getSession: async () => {
        const stored = localStorage.getItem(mockSessionKey);
        return { data: { session: stored ? JSON.parse(stored) : null }, error: null };
      },
      onAuthStateChange: (callback: any) => {
        authListeners.push(callback);
        const stored = localStorage.getItem(mockSessionKey);
        const session = stored ? JSON.parse(stored) : null;
        // Notifica o estado inicial
        setTimeout(() => callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session), 0);
        
        return { data: { subscription: { unsubscribe: () => {
          const index = authListeners.indexOf(callback);
          if (index > -1) authListeners.splice(index, 1);
        } } } };
      },
      signInWithPassword: async ({ email }: any) => {
        const session = { user: { id: MOCK_USER_ID, email }, access_token: 'mock', expires_in: 3600 };
        localStorage.setItem(mockSessionKey, JSON.stringify(session));
        
        // Notifica todos os ouvintes
        authListeners.forEach(cb => cb('SIGNED_IN', session));
        
        return { data: { session }, error: null };
      },
      signUp: async ({ email, password, options }: any) => {
        const session = { user: { id: MOCK_USER_ID, email, user_metadata: options?.data }, access_token: 'mock', expires_in: 3600 };
        localStorage.setItem(mockSessionKey, JSON.stringify(session));
        authListeners.forEach(cb => cb('SIGNED_IN', session));
        return { data: { session }, error: null };
      },
      signOut: async () => {
        localStorage.removeItem(mockSessionKey);
        authListeners.forEach(cb => cb('SIGNED_OUT', null));
        return { error: null };
      },
      updateUser: async (updates: any) => {
          return { data: { user: { id: MOCK_USER_ID } }, error: null };
      }
    },
    from: (table: string) => {
      return {
        select: (columns = '*') => {
          let data = [];
          if (table === 'petitions') data = getStoredData(mockPetitionsKey);
          else if (table === 'deadlines') data = getStoredData(mockDeadlinesKey);
          else if (table === 'profiles') data = [{ id: MOCK_USER_ID, full_name: 'Dr. Advogado (Demo)', account_status: 'trial', role: 'admin', created_at: new Date().toISOString() }];
          else if (table === 'usage_limits') data = [{ user_id: MOCK_USER_ID, petitions_limit: 5, petitions_this_month: getStoredData(mockPetitionsKey).length }];

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
            const tableKey = table === 'petitions' ? mockPetitionsKey : mockDeadlinesKey;
            const current = getStoredData(tableKey);
            const items = Array.isArray(data) ? data : [data];
            const newItems = items.map(item => ({ 
              ...item, 
              id: Math.random().toString(36).substr(2, 9), 
              created_at: item.created_at || new Date().toISOString() 
            }));
            
            const updated = [...current, ...newItems];
            saveStoredData(tableKey, updated);

            return {
              select: () => ({
                single: async () => ({ data: newItems[0], error: null }),
                then: (resolve: any) => resolve({ data: newItems, error: null })
              }),
              then: (resolve: any) => resolve({ data: newItems, error: null })
            };
        },
        update: (updates: any) => ({
            eq: (col: string, val: any) => {
              const key = table === 'petitions' ? mockPetitionsKey : table === 'deadlines' ? mockDeadlinesKey : null;
              if (key) {
                const current = getStoredData(key);
                const updated = current.map((item: any) => item[col] === val ? { ...item, ...updates } : item);
                saveStoredData(key, updated);
              }
              return {
                then: (resolve: any) => resolve({ error: null })
              };
            }
        }),
        delete: () => ({
            eq: (col: string, val: any) => {
              const key = table === 'petitions' ? mockPetitionsKey : table === 'deadlines' ? mockDeadlinesKey : null;
              if (key) {
                const current = getStoredData(key);
                const updated = current.filter((item: any) => item[col] !== val);
                saveStoredData(key, updated);
              }
              return {
                then: (resolve: any) => resolve({ error: null })
              };
            }
        })
      };
    }
  } as any;
}

export const supabase = client;
export const isLive = isConfigured;
