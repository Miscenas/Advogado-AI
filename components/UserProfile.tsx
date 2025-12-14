import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { supabase } from '../services/supabaseClient';
import { User, Lock, CheckCircle, AlertTriangle } from 'lucide-react';

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
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar senha.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center gap-4">
           <div className="bg-juris-100 p-3 rounded-full text-juris-800">
             <User size={32} />
           </div>
           <div>
             <h2 className="text-xl font-bold text-gray-900">{profile?.full_name || 'Usuário'}</h2>
             <p className="text-gray-500">{profile?.email}</p>
           </div>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
              <label className="text-xs uppercase text-gray-500 font-semibold">Status da Conta</label>
              <div className="mt-1">
                 <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    profile?.account_status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : profile?.account_status === 'blocked' 
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                 }`}>
                    {profile?.account_status === 'active' ? 'Ativo' : profile?.account_status === 'blocked' ? 'Bloqueado' : 'Trial (Gratuito)'}
                 </span>
              </div>
           </div>
           <div>
              <label className="text-xs uppercase text-gray-500 font-semibold">Membro Desde</label>
              <p className="text-gray-900 font-medium mt-1">
                 {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
              </p>
           </div>
           <div>
              <label className="text-xs uppercase text-gray-500 font-semibold">ID do Usuário</label>
              <p className="text-gray-400 font-mono text-xs mt-1">{profile?.id}</p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
           <Lock size={18} className="text-gray-500" />
           <h3 className="font-semibold text-gray-900">Segurança & Senha</h3>
        </div>
        <div className="p-6">
           {message && (
             <div className={`mb-4 p-3 rounded-md flex items-center gap-2 ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
             }`}>
                {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                <span className="text-sm">{message.text}</span>
             </div>
           )}

           <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
              <Input 
                type="password"
                label="Nova Senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                required
              />
              <Input 
                type="password"
                label="Confirmar Nova Senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                required
              />
              <Button type="submit" isLoading={loading}>
                 Atualizar Senha
              </Button>
           </form>
        </div>
      </div>
    </div>
  );
};