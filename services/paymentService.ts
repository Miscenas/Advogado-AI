import { supabase } from './supabaseClient';

// Helper para obter variáveis de ambiente de forma segura
const getEnv = (key: string) => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

// Chave pública de teste do Mercado Pago
const MP_PUBLIC_KEY = getEnv('VITE_MP_PUBLIC_KEY') || 'TEST-e8b6b0c6-3049-4362-9705-562363065604';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export const initMercadoPago = () => {
  if (window.MercadoPago) {
    try {
        const mp = new window.MercadoPago(MP_PUBLIC_KEY, {
          locale: 'pt-BR'
        });
        return mp;
    } catch (e) {
        console.warn("Falha ao inicializar Mercado Pago:", e);
        return null;
    }
  }
  console.error("SDK do Mercado Pago não carregado");
  return null;
};

export const createCheckoutPreference = async (planId: 'monthly' | 'yearly', userId: string, email: string) => {
  // Simulação de criação de preferência (em produção, chame seu backend)
  
  // URLs de Checkout Pro (Exemplo - substitua pelos IDs reais gerados no painel do MP)
  const paymentLink = planId === 'monthly' 
    ? 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=MOCK_PREF_MONTHLY' 
    : 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=MOCK_PREF_YEARLY';

  return {
    preferenceId: `pref-${planId}-${Date.now()}`,
    initPoint: paymentLink
  };
};

export const recordPaymentAttempt = async (userId: string, plan: string) => {
  try {
     // Verifica se a tabela existe antes de tentar inserir para evitar erros no console
     // (Isso é uma verificação otimista, o erro real será pego no catch)
     await supabase.from('payment_attempts').insert({
         user_id: userId,
         plan: plan,
         status: 'initiated',
         created_at: new Date().toISOString()
     });
  } catch (e) {
      console.warn("Não foi possível registrar a tentativa de pagamento (Tabela pode não existir).", e);
  }
};