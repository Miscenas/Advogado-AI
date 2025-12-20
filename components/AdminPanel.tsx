
import React, { useEffect, useState } from 'react';
import { supabase, isLive } from '../services/supabaseClient';
import { UserProfile } from '../types';
import { Button } from './ui/Button';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle, 
  Ban, 
  Clock, 
  User, 
  Database, 
  Code, 
  Copy,
  Info,
  AlertCircle
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showSql, setShowSql] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data as UserProfile[]);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: 'trial' | 'active' | 'blocked') => {
    try {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, account_status: newStatus } : u));
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: newStatus })
        .eq('id', userId);
      if (error) throw error;
    } catch (error) {
      fetchUsers();
      alert('Erro ao atualizar status.');
    }
  };

  const sqlSchema = `-- SQL PARA CONFIGURAÇÃO INICIAL DO SUPABASE

-- 1. Tabela de Perfis (Profiles)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  account_status TEXT DEFAULT 'trial',
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Petições (Petitions)
CREATE TABLE petitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  area TEXT,
  action_type TEXT,
  content TEXT,
  plaintiff_name TEXT,
  defendant_name TEXT,
  filed BOOLEAN DEFAULT false,
  competence TEXT,
  legal_class TEXT,
  subject TEXT,
  filing_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Prazos (Deadlines)
CREATE TABLE deadlines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Limites (Usage Limits)
CREATE TABLE usage_limits (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  petitions_limit INTEGER DEFAULT 5,
  petitions_this_month INTEGER DEFAULT 0,
  last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Jurisprudência Salva
CREATE TABLE saved_jurisprudence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  query TEXT,
  result TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    alert("SQL Copiado!");
  };

  const filteredUsers = users.filter(u => 
     (u.full_name?.toLowerCase().includes(filter.toLowerCase()) || 
      u.email?.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-300 max-w-6xl mx-auto w-full text-left pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-slate-100 dark:border-slate-800 pb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none flex items-center gap-4">
            <ShieldCheck className="text-indigo-600 dark:text-indigo-400" size={40} />
            Administração
          </h1>
          <div className="flex items-center gap-2 mt-3">
             <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${isLive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {isLive ? 'Conectado ao Supabase' : 'Modo Demonstração (Local)'}
             </span>
             <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-widest">Gestão de Acessos e Infraestrutura</p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
           <Button variant="outline" onClick={() => setShowSql(!showSql)} className="rounded-xl border-2 font-black uppercase text-[10px] tracking-widest">
              <Database size={16} className="mr-2" /> Esquema SQL
           </Button>
           <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Buscar usuário..." 
                className="w-full pl-12 pr-6 h-12 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 focus:border-indigo-500 outline-none text-sm font-bold transition-all"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
           </div>
        </div>
      </div>

      {showSql && (
          <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 border border-slate-800 shadow-2xl animate-in slide-in-from-top-4">
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <Code className="text-indigo-400" size={24} />
                    <h3 className="text-white font-black uppercase text-sm tracking-widest">Script de Criação de Tabelas</h3>
                </div>
                <button onClick={copySql} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border border-white/5">
                    <Copy size={14} /> Copiar SQL
                </button>
             </div>
             <div className="bg-black/40 rounded-2xl p-6 overflow-x-auto custom-scrollbar border border-white/5">
                <pre className="text-indigo-300 font-mono text-[11px] leading-relaxed">
                   {sqlSchema}
                </pre>
             </div>
             <div className="mt-6 flex items-start gap-3 p-4 bg-indigo-950/30 rounded-2xl border border-indigo-900/50">
                <Info size={18} className="text-indigo-400 shrink-0" />
                <p className="text-[10px] font-medium text-indigo-200/70 leading-relaxed">
                   Execute o código acima no **SQL Editor** do seu Dashboard do Supabase para garantir que a estrutura de dados esteja 100% compatível com o JurisPet AI. Certifique-se de habilitar as políticas de RLS ou desativar temporariamente para testes.
                </p>
             </div>
          </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
         <div className="overflow-x-auto p-4 md:p-8">
            <table className="modern-table">
               <thead>
                  <tr>
                     <th>Advogado / E-mail</th>
                     <th className="text-center">Cadastro</th>
                     <th className="text-center">Status</th>
                     <th className="text-right">Ações</th>
                  </tr>
               </thead>
               <tbody>
                  {loading ? (
                     <tr><td colSpan={4} className="text-center py-12 font-bold uppercase text-[10px] text-slate-400">Consultando Banco de Dados...</td></tr>
                  ) : filteredUsers.length === 0 ? (
                     <tr><td colSpan={4} className="text-center py-12 font-bold uppercase text-[10px] text-slate-400">Nenhum registro localizado.</td></tr>
                  ) : (
                     filteredUsers.map((user) => (
                        <tr key={user.id}>
                           <td className="font-bold">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-indigo-500 border border-slate-100 dark:border-slate-700 shadow-inner">
                                    <User size={20} />
                                 </div>
                                 <div>
                                    <p className="text-slate-900 dark:text-white uppercase text-[11px] leading-none mb-1">{user.full_name || 'Usuário Sem Nome'}</p>
                                    <p className="text-slate-400 dark:text-slate-500 text-[10px] lowercase">{user.email}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="text-center font-bold text-slate-500 text-[10px] uppercase">
                              {new Date(user.created_at).toLocaleDateString()}
                           </td>
                           <td className="text-center">
                              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                 user.account_status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20' : 
                                 user.account_status === 'blocked' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20' : 
                                 'bg-amber-50 text-amber-700 dark:bg-amber-900/20'
                              }`}>
                                 {user.account_status === 'active' ? 'Ativo' : user.account_status === 'blocked' ? 'Bloqueado' : 'Trial'}
                              </span>
                           </td>
                           <td>
                              <div className="flex justify-end gap-2">
                                 {user.account_status !== 'active' && (
                                    <button onClick={() => handleStatusChange(user.id, 'active')} className="p-3 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all border border-transparent hover:border-emerald-100" title="Ativar"><CheckCircle size={20} /></button>
                                 )}
                                 {user.account_status !== 'trial' && (
                                    <button onClick={() => handleStatusChange(user.id, 'trial')} className="p-3 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all border border-transparent hover:border-amber-100" title="Voltar para Trial"><Clock size={20} /></button>
                                 )}
                                 {user.account_status !== 'blocked' && (
                                    <button onClick={() => handleStatusChange(user.id, 'blocked')} className="p-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all border border-transparent hover:border-rose-100" title="Bloquear"><Ban size={20} /></button>
                                 )}
                              </div>
                           </td>
                        </tr>
                     ))
                  )}
               </tbody>
            </table>
         </div>
      </div>

      <div className="p-10 bg-amber-50 dark:bg-amber-950/20 rounded-[3rem] border border-amber-100 dark:border-amber-900/50 flex items-start gap-6">
          <AlertCircle size={32} className="text-amber-600 shrink-0 mt-1" />
          <div className="text-left space-y-2">
             <h4 className="font-black text-amber-900 dark:text-amber-400 uppercase text-sm tracking-tight">Importante: Gerenciamento de Identidade</h4>
             <p className="text-[11px] font-bold text-amber-800/80 dark:text-amber-500 uppercase leading-relaxed tracking-tight">
                Alterações de status nesta tela refletem instantaneamente no acesso do advogado. O JurisPet AI não exclui usuários do Auth para manter a integridade do histórico de petições. Para exclusão permanente, utilize o Dashboard do Supabase.
             </p>
          </div>
      </div>
    </div>
  );
};
