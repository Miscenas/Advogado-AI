import { supabase } from './supabaseClient';

// NOTA: Em produção, o Access Token deve ficar no Backend (Supabase Edge Function)
// Para fins de demonstração neste ambiente frontend, usaremos uma chave pública ou simularemos.
// Obtenha suas credenciais em: https://www.mercadopago.com.br/developers/panel
const getEnv = (key: string) => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[key];
  }
  return undefined;
};

const MP_PUBLIC_KEY = getEnv('VITE_MP_PUBLIC_KEY') || 'TEST-e8b6b0c6-3049-4362-9705-562363065604'; // Chave pública de teste exemplo

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export const initMercadoPago = () => {
  if (window.MercadoPago) {
    const mp = new window.MercadoPago(MP_PUBLIC_KEY, {
      locale: 'pt-BR'
    });
    return mp;
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
  
  const title = planId === 'monthly' ? 'Advogado AI - Plano Mensal' : 'Advogado AI - Plano Anual';
  const price = planId === 'monthly' ? 97.00 : 970.00;

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
     await supabase.from('payment_attempts').insert({
         user_id: userId,
         plan: plan,
         status: 'initiated',
         created_at: new Date().toISOString()
     });
  } catch (e) {
      console.error("Erro ao registrar tentativa de pagamento", e);
  }
};