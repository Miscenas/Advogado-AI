
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Scale, AlertTriangle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6 font-sans">
      <div className="max-w-xl w-full flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-[#0F172A] p-4 rounded-[2rem] shadow-2xl shadow-slate-200 rotate-3">
            <Scale className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-[#0F172A] tracking-tighter uppercase">Advocacia IA</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Inteligência Jurídica Sênior</p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-[3.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] border-2 border-slate-50 overflow-hidden">
          <div className="p-10 md:p-14">
            <div className="mb-10">
              <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">
                {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta profissional'}
              </h2>
              <p className="text-sm font-medium text-slate-400 mt-2">
                {isLogin 
                  ? 'Acesse seu painel e continue suas petições.' 
                  : 'Junte-se a centenas de advogados que usam IA.'}
              </p>
            </div>

            {error && (
              <div className="mb-8 p-5 bg-rose-50 border border-rose-100 rounded-[1.5rem] flex items-start gap-4 animate-in slide-in-from-top-2">
                <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-rose-600 leading-relaxed uppercase tracking-tight">{error}</p>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-6">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <Input
                    id="name"
                    placeholder="Dr. João Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="h-14 rounded-2xl border-2 px-6 font-bold bg-slate-50 focus:bg-white transition-all"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Profissional</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@escritorio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-14 rounded-2xl border-2 px-6 font-bold bg-slate-50 focus:bg-white transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sua Senha</label>
                  {isLogin && <button type="button" className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 transition-colors">Esqueci a senha</button>}
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-14 rounded-2xl border-2 px-6 font-bold bg-slate-50 focus:bg-white transition-all"
                />
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full h-16 rounded-2xl bg-[#0F172A] text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all" 
                  isLoading={loading}
                >
                  {isLogin ? 'Entrar no Sistema' : 'Ativar Acesso'}
                  <ArrowRight size={18} className="ml-3" />
                </Button>
              </div>
            </form>

            <div className="mt-10 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {isLogin ? 'Ainda não é membro?' : 'Já possui cadastro?'}
                <button
                  type="button"
                  onClick={() => {
                      setIsLogin(!isLogin);
                      setError(null);
                  }}
                  className="ml-2 font-black text-indigo-600 hover:text-indigo-800 focus:outline-none transition-colors underline decoration-2 underline-offset-4"
                >
                  {isLogin ? 'Cadastre-se Grátis' : 'Fazer Login'}
                </button>
              </p>
            </div>
          </div>
          
          <div className="bg-slate-50/50 px-10 py-6 border-t border-slate-100 flex items-center justify-center gap-6">
             <div className="flex items-center gap-2 opacity-50">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">SSL Seguro</span>
             </div>
             <div className="flex items-center gap-2 opacity-50">
                <Sparkles size={14} className="text-indigo-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Powered by AI</span>
             </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-12">
          Advocacia IA &copy; 2025 - Todos os Direitos Reservados
        </p>
      </div>
    </div>
  );
};
