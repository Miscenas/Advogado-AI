import { createClient } from '@supabase/supabase-js';

// 1. Attempt to load keys from Vite environment variables (Standard for Vercel + Vite)
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Check if variables are valid
const isConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'undefined' && 
  supabaseAnonKey !== 'undefined';

let client;

if (isConfigured) {
  console.log('Advogado AI: Connecting to Live Supabase Database...');
  client = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('Advogado AI: Backend keys not found. Using Mock Client for demonstration.');
  
  // --- MOCK IMPLEMENTATION START ---
  // This block runs ONLY if you haven't set up your Vercel/Supabase Environment Variables yet.
  
  const MOCK_USER_ID = 'user-demo-123';
  const mockSessionKey = 'jurispet_mock_session';
  const mockPetitionsKey = 'jurispet_mock_petitions';
  const mockProfilesKey = 'jurispet_mock_profiles';
  const mockDeadlinesKey = 'jurispet_mock_deadlines';
  
  // Try to restore session
  let currentSession: any = null;
  try {
    const stored = localStorage.getItem(mockSessionKey);
    if (stored) currentSession = JSON.parse(stored);
  } catch (e) {
    console.error('Error restoring mock session', e);
  }

  // Restore petitions
  let mockPetitions: any[] = [];
  try {
    const storedPetitions = localStorage.getItem(mockPetitionsKey);
    if (storedPetitions) mockPetitions = JSON.parse(storedPetitions);
  } catch (e) { console.error(e); }

  // Restore Deadlines
  let mockDeadlines: any[] = [];
  try {
    const storedDeadlines = localStorage.getItem(mockDeadlinesKey);
    if (storedDeadlines) mockDeadlines = JSON.parse(storedDeadlines);
  } catch (e) { console.error(e); }

  // Restore or Init Profiles (For Admin View)
  let mockProfiles: any[] = [];
  try {
    const storedProfiles = localStorage.getItem(mockProfilesKey);
    if (storedProfiles) {
      mockProfiles = JSON.parse(storedProfiles);
    } else {
      // Seed with some dummy data if empty
      mockProfiles = [
        {
          id: MOCK_USER_ID,
          full_name: 'Advogado Demo (Admin)',
          email: 'admin@jurispet.com',
          account_status: 'trial',
          role: 'admin',
          created_at: new Date().toISOString(),
        },
        {
          id: 'user-2',
          full_name: 'Dr. Roberto Campos',
          email: 'roberto@email.com',
          account_status: 'active',
          role: 'user',
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
        {
          id: 'user-3',
          full_name: 'Dra. Ana Souza',
          email: 'ana@advocacia.com',
          account_status: 'blocked',
          role: 'user',
          created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
        }
      ];
      localStorage.setItem(mockProfilesKey, JSON.stringify(mockProfiles));
    }
  } catch (e) { console.error(e); }

  const listeners = new Set<(event: string, session: any) => void>();

  const notify = (event: string, session: any) => {
    listeners.forEach(cb => cb(event, session));
  };

  const updateSession = (session: any) => {
    currentSession = session;
    if (session) {
      localStorage.setItem(mockSessionKey, JSON.stringify(session));
    } else {
      localStorage.removeItem(mockSessionKey);
    }
  };

  const getProfile = (id: string) => mockProfiles.find(p => p.id === id);

  const updateProfile = (id: string, updates: any) => {
    mockProfiles = mockProfiles.map(p => p.id === id ? { ...p, ...updates } : p);
    localStorage.setItem(mockProfilesKey, JSON.stringify(mockProfiles));
    return mockProfiles.find(p => p.id === id);
  };

  // Mock Usage Data
  const mockUsage = {
    user_id: MOCK_USER_ID,
    monthly_limit: 5,
    used_this_month: mockPetitions.length,
    last_reset: new Date().toISOString(),
  };

  client = {
    auth: {
      getSession: async () => ({ data: { session: currentSession }, error: null }),
      onAuthStateChange: (callback: any) => {
        listeners.add(callback);
        callback(currentSession ? 'SIGNED_IN' : 'SIGNED_OUT', currentSession);
        return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
      },
      signInWithPassword: async ({ email }: any) => {
        // Simple logic: if email contains 'admin', treat as admin user
        const isDemoUser = email.includes('admin') || email === 'demo@jurispet.com';
        const userId = isDemoUser ? MOCK_USER_ID : 'new-user-' + Math.random();
        
        // Ensure profile exists for login
        let profile = getProfile(userId);
        if (!profile && isDemoUser) {
             profile = mockProfiles[0]; // fallback to demo admin
        } else if (!profile) {
             // Create on fly for demo login
             profile = {
                 id: userId,
                 full_name: 'Novo Usuário',
                 email: email,
                 account_status: 'trial',
                 role: 'user',
                 created_at: new Date().toISOString()
             };
             mockProfiles.push(profile);
             localStorage.setItem(mockProfilesKey, JSON.stringify(mockProfiles));
        }

        const session = { 
          user: { id: userId, email }, 
          access_token: 'mock-jwt-token',
          expires_in: 3600 
        };
        updateSession(session);
        notify('SIGNED_IN', session);
        return { data: { session }, error: null };
      },
      signUp: async ({ email, options }: any) => {
        const userId = 'user-' + Math.random().toString(36).substr(2, 9);
        const session = { 
          user: { id: userId, email },
          access_token: 'mock-jwt-token',
          expires_in: 3600
        };
        
        // Create Profile
        const newProfile = {
            id: userId,
            full_name: options?.data?.full_name || 'Usuário',
            email: email,
            account_status: 'trial', // Default to trial
            role: 'user',
            created_at: new Date().toISOString()
        };
        mockProfiles.push(newProfile);
        localStorage.setItem(mockProfilesKey, JSON.stringify(mockProfiles));

        updateSession(session);
        notify('SIGNED_IN', session);
        return { data: { session }, error: null };
      },
      signOut: async () => {
        updateSession(null);
        notify('SIGNED_OUT', null);
        return { error: null };
      },
      updateUser: async (attributes: any) => {
          // Simulate password update
          await new Promise(resolve => setTimeout(resolve, 500));
          if (attributes.password) {
              return { data: { user: currentSession?.user }, error: null };
          }
          return { data: { user: null }, error: { message: "Mock error" } };
      }
    },
    from: (table: string) => {
      return {
        select: (columns = '*') => {
          return {
            eq: (column: string, value: any) => {
              const chain = {
                single: async () => {
                   await new Promise(resolve => setTimeout(resolve, 300));
                   if (table === 'profiles') {
                       const p = getProfile(value);
                       return { data: p, error: p ? null : { message: 'Not found', code: 'PGRST116' } };
                   }
                   if (table === 'usage_limits') return { data: { ...mockUsage, used_this_month: mockPetitions.length }, error: null };
                   return { data: null, error: { message: 'Not found', code: 'PGRST116' } };
                },
                order: (col: string, { ascending }: any) => {
                   let dataResult = [];
                   if (table === 'petitions') dataResult = [...mockPetitions].sort((a,b) => b.created_at.localeCompare(a.created_at));
                   if (table === 'deadlines') dataResult = [...mockDeadlines].sort((a,b) => a.due_date.localeCompare(b.due_date));
                   
                   return {
                     data: dataResult,
                     error: null
                   }
                },
                then: (resolve: any) => {
                   if (table === 'petitions') resolve({ data: mockPetitions.filter(p => p[column] === value), error: null });
                   else if (table === 'deadlines') resolve({ data: mockDeadlines.filter(p => p[column] === value), error: null });
                   else resolve({ data: [], error: null });
                }
              };
              return chain;
            },
            // Logic for "Select All" (e.g. Admin listing profiles)
            order: (col: string, { ascending }: any) => {
                 return {
                     then: (resolve: any) => {
                         if (table === 'profiles') {
                             resolve({ data: mockProfiles, error: null });
                         } else if (table === 'deadlines') {
                             const sorted = [...mockDeadlines].sort((a, b) => {
                                 const valA = new Date(a[col]).getTime();
                                 const valB = new Date(b[col]).getTime();
                                 return ascending ? valA - valB : valB - valA;
                             });
                             resolve({ data: sorted, error: null });
                         } else {
                             resolve({ data: [], error: null });
                         }
                     }
                 }
            }
          };
        },
        update: (updates: any) => {
          return {
            eq: async (column: string, value: any) => {
              await new Promise(resolve => setTimeout(resolve, 300));
              
              if (table === 'petitions') {
                mockPetitions = mockPetitions.map(p => p[column] === value ? { ...p, ...updates } : p);
                localStorage.setItem(mockPetitionsKey, JSON.stringify(mockPetitions));
                return { data: mockPetitions, error: null };
              }

              if (table === 'deadlines') {
                mockDeadlines = mockDeadlines.map(p => p[column] === value ? { ...p, ...updates } : p);
                localStorage.setItem(mockDeadlinesKey, JSON.stringify(mockDeadlines));
                return { data: mockDeadlines, error: null };
              }

              if (table === 'profiles') {
                  // Only update if targeting ID
                  if (column === 'id') {
                      const updated = updateProfile(value, updates);
                      return { data: updated, error: null };
                  }
              }

              return { data: null, error: null };
            }
          }
        },
        insert: (data: any) => {
          return {
            select: () => {
              return {
                 single: async () => {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    if (table === 'petitions') {
                       const items = Array.isArray(data) ? data : [data];
                       const newItems = items.map((item: any) => ({
                         ...item,
                         id: Math.random().toString(36).substr(2, 9),
                         created_at: new Date().toISOString(),
                         filed: false
                       }));
                       mockPetitions = [...mockPetitions, ...newItems];
                       localStorage.setItem(mockPetitionsKey, JSON.stringify(mockPetitions));
                       return { data: newItems[0], error: null };
                    }

                    if (table === 'deadlines') {
                        const items = Array.isArray(data) ? data : [data];
                        const newItems = items.map((item: any) => ({
                          ...item,
                          id: Math.random().toString(36).substr(2, 9),
                          created_at: new Date().toISOString(),
                        }));
                        mockDeadlines = [...mockDeadlines, ...newItems];
                        localStorage.setItem(mockDeadlinesKey, JSON.stringify(mockDeadlines));
                        return { data: newItems[0], error: null };
                     }

                    return { data: null, error: { message: 'Insert failed' } };
                 }
              }
            }
          }
        },
        delete: () => {
            return {
                eq: async (column: string, value: any) => {
                    await new Promise(resolve => setTimeout(resolve, 300));
                    if (table === 'deadlines') {
                        mockDeadlines = mockDeadlines.filter(d => d[column] !== value);
                        localStorage.setItem(mockDeadlinesKey, JSON.stringify(mockDeadlines));
                        return { error: null };
                    }
                    return { error: null };
                }
            }
        }
      };
    }
  } as any;
  // --- MOCK IMPLEMENTATION END ---
}

export const supabase = client;