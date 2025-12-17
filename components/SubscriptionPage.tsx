import React, { useState } from 'react';
import { CheckCircle2, Crown, ShieldCheck, Zap, HelpCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { createCheckoutPreference, recordPaymentAttempt } from '../services/paymentService';
import { UserProfile } from '../types';

interface SubscriptionPageProps {
  user: UserProfile | null;
  onNavigate: (route: string) => void;
}

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ user, onNavigate }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);

  const features = [
    "Geração ilimitada de Petições",
    "Geração ilimitada de Contestações",
    "Pesquisa de Jurisprudência com IA",
    "Análise de Documentos (PDF/Imagem)",
    "Transcrição de Áudio para Texto",
    "Suporte Prioritário",
    "Acesso a novas funcionalidades Beta"
  ];

  const handleSubscribe = async () => {
    if (!user) return;
    setLoading(true);

    try {
        await recordPaymentAttempt(user.id, billingCycle);
        const { initPoint } = await createCheckoutPreference(billingCycle, user.id, user.email || '');
        
        // Como estamos simulando, vamos alertar.
        // Em produção: window.location.href = initPoint;
        alert(`INTEGRAÇÃO MERCADO PAGO:\n\nEm um ambiente de produção, você seria redirecionado agora para o Checkout do Mercado Pago.\n\nPlano: ${billingCycle === 'monthly' ? 'Mensal' : 'Anual'}\nValor: R$ ${billingCycle === 'monthly' ? '97,00' : '970,00'}`);
        
        // Simular sucesso para UX
        onNavigate('payment_success');

    } catch (error) {
        console.error(error);
        alert("Erro ao iniciar pagamento.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Escolha o plano ideal para seu escritório</h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Automatize sua rotina jurídica, economize horas de trabalho e entregue peças processuais de alta qualidade com IA.
        </p>
      </div>

      {/* Toggle Mensal/Anual */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-1 rounded-lg flex items-center relative">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              billingCycle === 'monthly' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              billingCycle === 'yearly' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Anual <span className="text-xs text-green-600 font-bold ml-1">-15%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
         {/* Free Tier Info */}
         <div className="bg-white rounded-2xl p-8 border border-gray-200 opacity-80 hover:opacity-100 transition-opacity">
            <h3 className="text-lg font-semibold text-gray-900">Gratuito (Trial)</h3>
            <div className="mt-4 flex items-baseline text-gray-900">
               <span className="text-4xl font-bold tracking-tight">R$ 0</span>
               <span className="ml-1 text-xl font-semibold text-gray-500">/mês</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">Para testar a plataforma.</p>
            
            <ul className="mt-6 space-y-4">
               <li className="flex items-start"><CheckCircle2 className="h-5 w-5 text-gray-400 shrink-0 mr-2"/> <span className="text-sm text-gray-600">5 Petições/mês</span></li>
               <li className="flex items-start"><CheckCircle2 className="h-5 w-5 text-gray-400 shrink-0 mr-2"/> <span className="text-sm text-gray-600">Pesquisa Básica</span></li>
               <li className="flex items-start"><CheckCircle2 className="h-5 w-5 text-gray-400 shrink-0 mr-2"/> <span className="text-sm text-gray-600">Sem suporte prioritário</span></li>
            </ul>
         </div>

         {/* PRO Tier */}
         <div className="bg-juris-900 rounded-2xl p-8 border-2 border-sky-500 shadow-2xl relative transform scale-105 z-10">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4">
               <span className="inline-flex items-center gap-1 rounded-full bg-sky-500 px-3 py-1 text-xs font-bold text-white shadow-md">
                 <Crown size={12} /> MAIS POPULAR
               </span>
            </div>
            <h3 className="text-lg font-semibold text-white">Advogado PRO</h3>
            <div className="mt-4 flex items-baseline text-white">
               <span className="text-5xl font-bold tracking-tight">
                 {billingCycle === 'monthly' ? 'R$ 97' : 'R$ 970'}
               </span>
               <span className="ml-1 text-xl font-semibold text-juris-200">
                 /{billingCycle === 'monthly' ? 'mês' : 'ano'}
               </span>
            </div>
            <p className="mt-2 text-sm text-juris-200">
              {billingCycle === 'monthly' ? 'Cobrado mensalmente.' : 'Cobrado anualmente (equivale a R$ 80,83/mês).'}
            </p>

            <div className="mt-8">
               <Button 
                 onClick={handleSubscribe} 
                 isLoading={loading}
                 className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold h-12 text-lg shadow-lg"
               >
                 Assinar Agora
               </Button>
               <p className="mt-3 text-xs text-center text-juris-300 flex items-center justify-center gap-1">
                 <ShieldCheck size={12} /> Pagamento seguro via Mercado Pago
               </p>
            </div>

            <ul className="mt-8 space-y-4">
               {features.map((feature, idx) => (
                 <li key={idx} className="flex items-start">
                   <div className="rounded-full bg-sky-500/20 p-1 mr-3">
                     <CheckCircle2 className="h-4 w-4 text-sky-400" />
                   </div>
                   <span className="text-sm text-white font-medium">{feature}</span>
                 </li>
               ))}
            </ul>
         </div>

         {/* Enterprise Info */}
         <div className="bg-white rounded-2xl p-8 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Escritórios</h3>
            <div className="mt-4 flex items-baseline text-gray-900">
               <span className="text-3xl font-bold tracking-tight">Sob Consulta</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">Para equipes grandes.</p>
            
            <ul className="mt-6 space-y-4">
               <li className="flex items-start"><CheckCircle2 className="h-5 w-5 text-juris-600 shrink-0 mr-2"/> <span className="text-sm text-gray-600">Múltiplos Usuários</span></li>
               <li className="flex items-start"><CheckCircle2 className="h-5 w-5 text-juris-600 shrink-0 mr-2"/> <span className="text-sm text-gray-600">Gestão de Equipe</span></li>
               <li className="flex items-start"><CheckCircle2 className="h-5 w-5 text-juris-600 shrink-0 mr-2"/> <span className="text-sm text-gray-600">API Personalizada</span></li>
            </ul>
            <div className="mt-8">
               <Button variant="outline" className="w-full">Falar com Vendas</Button>
            </div>
         </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-6 mt-12 flex flex-col md:flex-row items-center gap-6">
          <div className="bg-white p-4 rounded-full shadow-sm">
             <Zap className="h-8 w-8 text-yellow-500" />
          </div>
          <div className="flex-1">
             <h4 className="font-bold text-gray-900 text-lg">Garantia de Satisfação</h4>
             <p className="text-gray-600 text-sm mt-1">
               Teste o Advogado AI PRO sem riscos. Se não aumentar sua produtividade nos primeiros 7 dias, devolvemos seu dinheiro.
             </p>
          </div>
      </div>
    </div>
  );
};

export const PaymentSuccess: React.FC<{ onNavigate: (r: string) => void }> = ({ onNavigate }) => (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 animate-in zoom-in-95">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={48} className="text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Pagamento Recebido!</h2>
        <p className="text-gray-500 max-w-md mb-8">
            Sua assinatura do Advogado AI PRO foi confirmada. Seu acesso ilimitado já está liberado.
        </p>
        <Button size="lg" onClick={() => onNavigate('dashboard')} className="px-8">
            Voltar ao Dashboard
        </Button>
    </div>
);

export const PaymentFailure: React.FC<{ onNavigate: (r: string) => void }> = ({ onNavigate }) => (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <HelpCircle size={48} className="text-red-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Pagamento Pendente ou Cancelado</h2>
        <p className="text-gray-500 max-w-md mb-8">
            Houve um problema ao processar seu pagamento. Nenhuma cobrança foi realizada.
        </p>
        <div className="flex gap-4">
            <Button variant="outline" onClick={() => onNavigate('dashboard')}>
                Voltar
            </Button>
            <Button onClick={() => onNavigate('subscription')}>
                Tentar Novamente
            </Button>
        </div>
    </div>
);