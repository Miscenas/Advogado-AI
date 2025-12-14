import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { UserProfile } from '../types';
import { Button } from './ui/Button';
import { ShieldCheck, Search, CheckCircle, Ban, Clock, User } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // In mock implementation, this returns all stored profiles
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data as UserProfile[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: 'trial' | 'active' | 'blocked') => {
    try {
      // Optimistic update
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, account_status: newStatus } : u));

      const { error } = await supabase
        .from('profiles')
        .update({ account_status: newStatus })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating user status:', error);
      fetchUsers(); // Revert on error
      alert('Erro ao atualizar status.');
    }
  };

  const filteredUsers = users.filter(u => 
     (u.full_name?.toLowerCase().includes(filter.toLowerCase()) || 
      u.email?.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="text-juris-800" />
            Administração de Usuários
          </h1>
          <p className="text-gray-500">Gerencie o acesso e pagamentos dos advogados cadastrados.</p>
        </div>
        <div className="relative w-full md:w-64">
           <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
           <input 
             type="text" 
             placeholder="Buscar nome ou email..." 
             className="w-full pl-9 pr-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-juris-500 focus:outline-none text-sm"
             value={filter}
             onChange={(e) => setFilter(e.target.value)}
           />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
         <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-gray-50">
                  <tr>
                     <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                     <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cadastro</th>
                     <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                     <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                     <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                           Carregando usuários...
                        </td>
                     </tr>
                  ) : filteredUsers.length === 0 ? (
                     <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                           Nenhum usuário encontrado.
                        </td>
                     </tr>
                  ) : (
                     filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                           <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                 <div className="flex-shrink-0 h-10 w-10 bg-juris-100 rounded-full flex items-center justify-center text-juris-800">
                                    <User size={20} />
                                 </div>
                                 <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                    {user.role === 'admin' && <span className="text-xs text-sky-600 font-bold">Admin</span>}
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.created_at).toLocaleDateString()}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                 user.account_status === 'active' ? 'bg-green-100 text-green-800' : 
                                 user.account_status === 'blocked' ? 'bg-red-100 text-red-800' : 
                                 'bg-amber-100 text-amber-800'
                              }`}>
                                 {user.account_status === 'active' ? 'Ativo' : user.account_status === 'blocked' ? 'Bloqueado' : 'Trial'}
                              </span>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex gap-2">
                                 {user.account_status !== 'active' && (
                                    <button 
                                       onClick={() => handleStatusChange(user.id, 'active')}
                                       className="text-green-600 hover:text-green-900 bg-green-50 p-1.5 rounded"
                                       title="Ativar Acesso (Pagamento Confirmado)"
                                    >
                                       <CheckCircle size={18} />
                                    </button>
                                 )}
                                 {user.account_status !== 'trial' && (
                                    <button 
                                       onClick={() => handleStatusChange(user.id, 'trial')}
                                       className="text-amber-600 hover:text-amber-900 bg-amber-50 p-1.5 rounded"
                                       title="Definir como Trial"
                                    >
                                       <Clock size={18} />
                                    </button>
                                 )}
                                 {user.account_status !== 'blocked' && (
                                    <button 
                                       onClick={() => handleStatusChange(user.id, 'blocked')}
                                       className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded"
                                       title="Bloquear Acesso"
                                    >
                                       <Ban size={18} />
                                    </button>
                                 )}
                              </div>
                           </td>
                        </tr>
                     ))
                  )}
               </tbody>
            </table>
         </div>
         <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-xs text-gray-500">
            Total de usuários: {filteredUsers.length}
         </div>
      </div>
    </div>
  );
};