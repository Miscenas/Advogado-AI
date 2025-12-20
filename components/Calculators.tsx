
import React, { useState } from 'react';
import { 
  Calculator, 
  Calendar, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  ArrowRight,
  Info,
  DollarSign,
  Gavel
} from 'lucide-react';
import { Button } from './ui/Button';

type CalculatorTab = 'prescription' | 'labor';

export const Calculators: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CalculatorTab>('prescription');

  // Estados Prescrição
  const [eventDate, setEventDate] = useState('');
  const [duration, setDuration] = useState(5);
  const [durationUnit, setDurationUnit] = useState<'anos' | 'meses' | 'dias'>('anos');
  const [prescResult, setPrescResult] = useState<string | null>(null);

  // Estados Trabalhista
  const [salary, setSalary] = useState('');
  const [months, setMonths] = useState('');
  const [rescisaoResult, setRescisaoResult] = useState<number | null>(null);

  const calculatePrescription = () => {
    if (!eventDate) return;
    const date = new Date(eventDate);
    if (durationUnit === 'anos') date.setFullYear(date.getFullYear() + duration);
    else if (durationUnit === 'meses') date.setMonth(date.getMonth() + duration);
    else date.setDate(date.getDate() + duration);
    
    setPrescResult(date.toLocaleDateString('pt-BR'));
  };

  const calculateLaborBasic = () => {
      const s = parseFloat(salary.replace(',', '.'));
      const m = parseInt(months);
      if (isNaN(s) || isNaN(m)) return;
      // Cálculo extremamente básico de 13º proporcional
      const result = (s / 12) * m;
      setRescisaoResult(result);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#0F172A] tracking-tighter uppercase leading-none">Calculadoras</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-3">Ferramentas de Apoio à Tomada de Decisão Jurídica</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            <button 
                onClick={() => setActiveTab('prescription')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'prescription' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
            >
                Prescrição
            </button>
            <button 
                onClick={() => setActiveTab('labor')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'labor' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
            >
                Trabalhista
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Formulário de Cálculo */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-50 shadow-sm hover:shadow-xl transition-all duration-500">
                {activeTab === 'prescription' ? (
                    <div className="space-y-8">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
                                <Clock size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">Calculadora de Prescrição</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Determine o prazo final de pretensão</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data do Evento / Ciência</label>
                                <input 
                                    type="date" 
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all font-black text-slate-900"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prazo</label>
                                    <input 
                                        type="number" 
                                        value={duration}
                                        onChange={(e) => setDuration(parseInt(e.target.value))}
                                        className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-emerald-500 transition-all font-black text-slate-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade</label>
                                    <select 
                                        value={durationUnit}
                                        onChange={(e) => setDurationUnit(e.target.value as any)}
                                        className="w-full h-14 px-4 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white transition-all font-black text-slate-900"
                                    >
                                        <option value="anos">Anos</option>
                                        <option value="meses">Meses</option>
                                        <option value="dias">Dias</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <Button 
                            onClick={calculatePrescription} 
                            className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-100"
                        >
                            Calcular Prazo Fatal <ArrowRight size={18} className="ml-2" />
                        </Button>

                        {prescResult && (
                            <div className="p-8 rounded-[2rem] bg-emerald-50 border-2 border-emerald-100 animate-in zoom-in-95">
                                <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest text-center mb-2">A pretensão prescreve em:</p>
                                <h4 className="text-5xl font-black text-emerald-600 text-center tracking-tighter">{prescResult}</h4>
                                <div className="mt-6 flex items-center justify-center gap-2 text-emerald-800 opacity-60">
                                    <AlertCircle size={14} />
                                    <span className="text-[9px] font-bold uppercase tracking-tighter">Sempre confira interrupções e suspensões legais.</span>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8">
                         <div className="flex items-center gap-4 mb-2">
                            <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
                                <DollarSign size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">Estimativa de Verbas Trabalhistas</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Simulador básico de provisão de 13º e Férias</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Salário Bruto (R$)</label>
                                <input 
                                    type="text" 
                                    value={salary}
                                    onChange={(e) => setSalary(e.target.value)}
                                    placeholder="1.500,00"
                                    className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-emerald-500 transition-all font-black text-slate-900"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Meses Trabalhados no Ano</label>
                                <input 
                                    type="number" 
                                    value={months}
                                    onChange={(e) => setMonths(e.target.value)}
                                    placeholder="Ex: 8"
                                    className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-emerald-500 transition-all font-black text-slate-900"
                                />
                            </div>
                        </div>

                        <Button 
                            onClick={calculateLaborBasic} 
                            className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-100"
                        >
                            Calcular Proporcional <ArrowRight size={18} className="ml-2" />
                        </Button>

                        {rescisaoResult !== null && (
                            <div className="p-8 rounded-[2rem] bg-emerald-50 border-2 border-emerald-100 animate-in zoom-in-95">
                                <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest text-center mb-2">Provisão Estimada:</p>
                                <h4 className="text-5xl font-black text-emerald-600 text-center tracking-tighter">R$ {rescisaoResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
            <div className="bg-[#0F172A] p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 space-y-4">
                    <div className="bg-white/10 p-3 rounded-2xl w-fit">
                        <TrendingUp size={24} className="text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-black tracking-tight uppercase">Por que usar calculadoras?</h3>
                    <p className="text-slate-400 text-xs font-medium leading-relaxed">
                        A assertividade no valor da causa e a ciência exata dos prazos prescricionais evitam prejuízos processuais e aumentam a confiança do seu cliente no atendimento inicial.
                    </p>
                </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col gap-6">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                        <Gavel size={18} />
                    </div>
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Base Legal</h4>
                </div>
                <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-tighter mb-1">Cível (CC/2002)</h5>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Artigos 189 a 206</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-tighter mb-1">Trabalhista (CF/88)</h5>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Artigo 7º, inciso XXIX</p>
                    </div>
                </div>
                <div className="flex items-start gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-bold text-amber-800 uppercase leading-relaxed tracking-tight">Estes cálculos são estimativos e não substituem o parecer jurídico completo.</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
