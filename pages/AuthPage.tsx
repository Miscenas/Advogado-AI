import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Scale, AlertTriangle } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-juris-900 p-3 rounded-lg mb-4">
              <Scale className="h-8 w-8 text-sky-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Advogado AI</h2>
            <p className="text-gray-500 text-sm mt-1">
              {isLogin ? 'Acesse sua conta' : 'Crie sua conta para começar'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-md flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <Input
                id="name"
                label="Nome Completo"
                placeholder="Dr. João Silva"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}
            
            <Input
              id="email"
              type="email"
              label="E-mail Profissional"
              placeholder="seu@escritorio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <Input
              id="password"
              type="password"
              label="Senha"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" className="w-full h-11 text-base" isLoading={loading}>
              {isLogin ? 'Entrar no Sistema' : 'Criar Conta Gratuita'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {isLogin ? 'Ainda não tem conta?' : 'Já possui uma conta?'}
              <button
                type="button"
                onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                }}
                className="ml-1 font-semibold text-juris-800 hover:text-juris-600 focus:outline-none focus:underline"
              >
                {isLogin ? 'Cadastre-se' : 'Faça Login'}
              </button>
            </p>
          </div>
        </div>
        
        <div className="bg-juris-50 px-8 py-4 border-t border-juris-100">
          <p className="text-xs text-center text-juris-700">
            Ambiente seguro e criptografado.
            <br />
            Ao entrar, você concorda com nossos termos de uso.
          </p>
        </div>
      </div>
    </div>
  );
};