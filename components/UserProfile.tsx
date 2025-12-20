
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { supabase } from '../services/supabaseClient';
// Added missing Info icon import
import { User, Lock, CheckCircle, AlertTriangle, ShieldCheck, Mail, Calendar, Info } from 'lucide-react';

interface UserProfileProps {
  profile: UserProfile | null;
}

export const UserProfileView: React.FC<UserProfileProps> = ({ profile }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setMessage({ type: 'error', text: 'Senhas não coincidem.' }); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Senha atualizada!' });
      setNewPassword(''); setConfirmPassword('');
    } catch (e: any) { setMessage({ type: 'error', text: e.message }); } finally { setLoading(false); }
  };

  return (
    <div className="w-full space-y-10 animate-in fade-in duration-500 text-left max-w-5xl mx-auto pb-24">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-8 text-left">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">Minha Conta</h1>
          <p className="text-gray-500 dark:text-slate-500 mt-3 font-bold uppercase text-[10px] tracking-[0.3em]">Gestão de Identidade e Segurança</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          <div className="lg:col-span-2 space-y-10">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden text-left">
                <div className="p-10 border-b border-gray-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center gap-6">
                   <div className="bg-indigo-600 p-5 rounded-3xl text-white shadow-xl">
                     <User size={32} />
                   </div>
                   <div className="text-left">
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase leading-none">{profile?.full_name || 'Advogado'}</h2>
                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2"><Mail size={12}/> {profile?.email}</p>
                   </div>
                </div>
                
                <div className="p-10 grid grid-cols-1 sm:grid-cols-2 gap-10 text-left">
                   <div className="text-left">
                      <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-2 mb-3"><ShieldCheck size={14}/> Status do Acesso</label>
                      <div className="mt-1 text-left">
                         <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                            profile?.account_status === 'active' 
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900' 
                              : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900'
                         }`}>
                            {profile?.account_status === 'active' ? 'Assinatura Ativa' : 'Período Trial'}
                         </span>
                      </div>
                   </div>
                   <div className="text-left">
                      <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-2 mb-3"><Calendar size={14}/> Membro Desde</label>
                      <p className="text-gray-900 dark:text-white font-black uppercase text-sm tracking-tight mt-1">
                         {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '-'}
                      </p>
                   </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden text-left">
                <div className="px-10 py-6 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
                   <Lock size={18} className="text-indigo-600 dark:text-indigo-400" />
                   <h3 className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-widest">Alterar Credenciais</h3>
                </div>
                <div className="p-10 text-left">
                   {message && (
                     <div className={`mb-8 p-5 rounded-2xl flex items-center gap-4 animate-in fade-in ${
                        message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
                     }`}>
                        {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                        <span className="text-xs font-black uppercase tracking-tight">{message.text}</span>
                     </div>
                   )}

                   <form onSubmit={handlePasswordChange} className="space-y-8 w-full text-left">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
                          <div className="text-left">
                             <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nova Senha</label>
                             <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all shadow-inner" required />
                          </div>
                          <div className="text-left">
                             <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Confirmar Senha</label>
                             <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all shadow-inner" required />
                          </div>
                      </div>
                      <div className="flex justify-end pt-4">
                        <Button type="submit" isLoading={loading} className="px-12 h-14 rounded-2xl bg-slate-900 dark:bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest border-none shadow-xl transition-all active:scale-95">Atualizar Senha</Button>
                      </div>
                   </form>
                </div>
              </div>
          </div>

          <aside className="bg-amber-50 dark:bg-amber-950/20 p-8 rounded-[2.5rem] border border-amber-100 dark:border-amber-900/50 space-y-6 text-left">
              <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl w-fit text-amber-600 dark:text-amber-500 shadow-sm"><Info size={24}/></div>
              <h4 className="font-black text-amber-900 dark:text-amber-400 uppercase text-sm tracking-tight leading-none">Dados Cadastrais</h4>
              <p className="text-[11px] font-bold text-amber-800/70 dark:text-amber-600 uppercase leading-relaxed tracking-tight">O JurisPet AI utiliza autenticação segura via Supabase. Para alterações de e-mail ou exclusão de conta, entre em contato com o suporte técnico do escritório.</p>
              <div className="pt-4 text-left">
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">ID Único JurisPet</p>
                  <code className="text-[9px] font-mono text-slate-300 dark:text-slate-700 bg-slate-100/50 dark:bg-slate-950 p-2 rounded-lg block truncate">{profile?.id}</code>
              </div>
          </aside>
      </div>
    </div>
  );
};
