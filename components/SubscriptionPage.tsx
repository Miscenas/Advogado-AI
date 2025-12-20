
import React, { useState } from 'react';
import { CheckCircle2, Crown, ShieldCheck, Zap, HardDrive, AlertCircle, FileText, Infinity } from 'lucide-react';
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

  const features = ["5 Petições / Mês", "Peticionamento Básico", "Jurisprudência Simples", "Suporte Comum"];
  const proFeatures = ["Petições Ilimitadas", "Leitura de PDF ilimitada", "Pesquisa com IA", "Comandos por Voz", "Prioridade no Suporte", "Acesso Completo", "Novas funções primeiro"];

  const handleSubscribe = async () => {
    if (!user) return alert("Por favor, faça login para assinar.");
    setLoading(true);
    try {
        await recordPaymentAttempt(user.id, billingCycle);
        const { initPoint } = await createCheckoutPreference(billingCycle, user.id, user.email || '');
        const msg = `MERCADO PAGO:\n\nPlano: ${billingCycle === 'monthly' ? 'Mensal' : 'Anual'}\nRedirecionando para o pagamento...`;
        setTimeout(() => { alert(msg); onNavigate('dashboard'); }, 1000);
    } catch (e) { alert("Erro ao conectar com o pagamento."); setLoading(false); }
  };

  return (
    <div className="w-full py-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 text-left max-w-6xl mx-auto pb-24">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">Planos JurisPet</h1>
        <p className="text-lg font-medium text-gray-500 dark:text-slate-400 max-w-2xl mx-auto">
          Escolha o melhor plano para o seu escritório.
        </p>
      </div>

      <div className="flex justify-center">
        <div className="bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl flex items-center relative shadow-inner">
          <button onClick={() => setBillingCycle('monthly')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${billingCycle === 'monthly' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' : 'text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-slate-300'}`}>Mensal</button>
          <button onClick={() => setBillingCycle('yearly')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${billingCycle === 'yearly' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' : 'text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-slate-300'}`}>Anual <span className="text-[8px] text-emerald-500 font-black ml-1">-16% DESCONTO</span></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10 items-stretch">
         <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-gray-200 dark:border-slate-800 flex flex-col justify-between text-left h-full shadow-sm">
            <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">GRÁTIS</h3>
                <div className="mt-6 flex items-baseline text-gray-900 dark:text-white">
                   <span className="text-5xl font-black tracking-tighter">R$ 0</span>
                </div>
                <p className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teste Grátis</p>
                <ul className="mt-8 space-y-4">
                   {features.map((f, i) => (
                     <li key={i} className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-slate-300 dark:text-slate-700" /><span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{f}</span></li>
                   ))}
                </ul>
            </div>
            <Button variant="outline" className="mt-10 rounded-2xl w-full border-2 h-12 text-[10px] font-black uppercase tracking-widest dark:border-slate-800 dark:text-slate-400">Plano Atual</Button>
         </div>

         <div className="bg-slate-900 dark:bg-slate-950 rounded-[3.5rem] p-10 border-2 border-indigo-500 shadow-2xl relative transform scale-105 z-10 flex flex-col justify-between h-full text-left">
            <div className="absolute top-0 right-10 -translate-y-1/2">
               <span className="inline-flex items-center gap-1 rounded-xl bg-indigo-500 px-4 py-1.5 text-[9px] font-black text-white shadow-xl uppercase tracking-widest"><Crown size={12} /> MAIS POPULAR</span>
            </div>
            <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">PROFISSIONAL</h3>
                <div className="mt-6 flex items-baseline text-white">
                   <span className="text-6xl font-black tracking-tighter">{billingCycle === 'monthly' ? 'R$ 60' : 'R$ 600'}</span>
                   <span className="ml-1 text-xl font-bold text-slate-500 uppercase tracking-tighter">/{billingCycle === 'monthly' ? 'mês' : 'ano'}</span>
                </div>
                <ul className="mt-10 space-y-4">
                   {proFeatures.map((f, i) => (
                     <li key={i} className="flex items-center gap-3"><Zap className="h-4 w-4 text-indigo-400" /><span className="text-[11px] font-bold text-white uppercase tracking-tight">{f}</span></li>
                   ))}
                </ul>
            </div>
            <div className="mt-12">
               <Button onClick={handleSubscribe} isLoading={loading} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black h-16 rounded-2xl text-xs uppercase tracking-widest shadow-2xl border-none">Assinar Agora</Button>
               <div className="mt-4 flex items-center justify-center gap-2 opacity-40"><ShieldCheck size={12} className="text-white"/><span className="text-[8px] text-white font-black uppercase tracking-widest">Pagamento Seguro</span></div>
            </div>
         </div>

         <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-gray-200 dark:border-slate-800 flex flex-col justify-between text-left h-full shadow-sm">
            <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">ESCRITÓRIO</h3>
                <div className="mt-6 flex items-baseline text-gray-900 dark:text-white"><span className="text-2xl font-black tracking-tighter uppercase">Sob Consulta</span></div>
                <p className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Para Equipes</p>
                <div className="mt-10 p-6 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-gray-100 dark:border-slate-800"><p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">Para vários advogados usarem a mesma conta com histórico compartilhado.</p></div>
            </div>
            <Button variant="outline" className="mt-10 rounded-2xl w-full border-2 h-12 text-[10px] font-black uppercase tracking-widest dark:border-slate-800 dark:text-slate-400">Falar com Suporte</Button>
         </div>
      </div>
    </div>
  );
};
