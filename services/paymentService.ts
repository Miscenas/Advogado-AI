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
  // ATENÇÃO:
  // O correto é chamar sua API/Edge Function aqui para não expor seu ACCESS_TOKEN no frontend.
  // Exemplo:
  // const response = await fetch('https://sua-url-supabase.com/functions/v1/create-preference', { ... })
  
  // Como estamos num ambiente sem backend configurado neste momento, 
  // vou simular o retorno de um link de pagamento ou instruir como fazer.
  
  const title = planId === 'monthly' ? 'Advogado IA - Plano Mensal' : 'Advogado IA - Plano Anual';
  const price = planId === 'monthly' ? 60.00 : 600.00;

  console.log(`Criando preferência para ${email} - ${title} (R$ ${price})`);

  // Simulação de delay de rede
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Em um cenário real, você retornaria a URL do Mercado Pago (init_point)
  // vinda do seu backend.
  // Para este MVP funcionar sem backend, retornaremos um link "dummy" ou instrução.
  
  // Se você tiver o link de pagamento pronto (criado no painel do MP), pode usar aqui:
  const paymentLink = planId === 'monthly' 
    ? 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=SEU_ID_MENSAL' 
    : 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=SEU_ID_ANUAL';

  return {
    preferenceId: 'mock-preference-id',
    initPoint: paymentLink // O Frontend deve redirecionar para este link
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