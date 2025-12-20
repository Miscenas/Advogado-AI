
import React, { useState } from 'react';
import { 
  Gavel, 
  Clock, 
  ShieldAlert, 
  TrendingDown, 
  Info, 
  ArrowRight,
  UserCheck,
  Scale
} from 'lucide-react';
import { Button } from './ui/Button';

export const CriminalCalculator: React.FC = () => {
  const [totalPenaAnos, setTotalPenaAnos] = useState('');
  const [percentual, setPercentual] = useState('16');
  const [progressaoResult, setProgressaoResult] = useState<string | null>(null);

  const calculateProgressao = () => {
    const anos = parseInt(totalPenaAnos);
    const perc = parseInt(percentual);
    if (isNaN(anos) || isNaN(perc)) return;

    const diasTotais = anos * 365;
    const diasParaProgressao = Math.ceil(diasTotais * (perc / 100));
    
    const anosP = Math.floor(diasParaProgressao / 365);
    const mesesP = Math.floor((diasParaProgressao % 365) / 30);
    
    setProgressaoResult(`${anosP} anos e ${mesesP} meses`);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#0F172A] tracking-tighter uppercase leading-none">Calculadora Criminal</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-3">Execução Penal, Progressão e Dosimetria</p>
        </div>
        <div className="bg-rose-50 px-5 py-2.5 rounded-2xl border border-rose-100 flex items-center gap-3">
            <Gavel className="text-rose-600" size={20} />
            <span className="text-[10px] font-black text-rose-900 uppercase tracking-widest">LEP v2025</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-50 shadow-sm hover:shadow-xl transition-all duration-500">
                <div className="space-y-8">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-rose-50 p-4 rounded-2xl text-rose-600"><Clock size={24} /></div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">Simulador de Progressão de Regime</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Baseado no Pacote Anticrime (Lei 13.964/19)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pena Total Aplicada (Anos)</label>
                            <input 
                                type="number" 
                                value={totalPenaAnos}
                                onChange={(e) => setTotalPenaAnos(e.target.value)}
                                placeholder="Ex: 12"
                                className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-50 transition-all font-black text-slate-900"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Percentual (Art. 112 LEP)</label>
                            <select 
                                value={percentual}
                                onChange={(e) => setPercentual(e.target.value)}
                                className="w-full h-14 px-4 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white transition-all font-black text-slate-900"
                            >
                                <option value="16">16% (Primário, sem violência)</option>
                                <option value="20">20% (Reincidente, sem violência)</option>
                                <option value="25">25% (Primário, com violência)</option>
                                <option value="30">30% (Reincidente, com violência)</option>
                                <option value="40">40% (Primário, crime hediondo)</option>
                                <option value="50">50% (Hedi./Priv. Liberdade/Comando)</option>
                            </select>
                        </div>
                    </div>

                    <Button 
                        onClick={calculateProgressao} 
                        className="w-full h-16 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-rose-100 transition-all active:scale-95"
                    >
                        CALCULAR TEMPO PARA PROGRESSÃO <ArrowRight size={18} className="ml-2" />
                    </Button>

                    {progressaoResult && (
                        <div className="p-8 rounded-[2rem] bg-rose-50 border-2 border-rose-100 animate-in zoom-in-95 text-center">
                            <p className="text-[10px] font-black text-rose-900 uppercase tracking-widest mb-2">Tempo de Cumprimento Necessário:</p>
                            <h4 className="text-4xl font-black text-rose-600 tracking-tighter">{progressaoResult}</h4>
                            <div className="mt-4 p-3 bg-white rounded-xl border border-rose-100 flex items-center justify-center gap-2">
                                <ShieldAlert size={14} className="text-rose-400" />
                                <span className="text-[9px] font-black text-rose-900 uppercase tracking-widest">Sujeito a remição por trabalho ou estudo.</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="space-y-6">
            <div className="bg-[#0F172A] p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 space-y-4">
                    <div className="bg-white/10 p-3 rounded-2xl w-fit"><Scale size={24} className="text-rose-400" /></div>
                    <h3 className="text-xl font-black tracking-tight uppercase">Defesa da Liberdade</h3>
                    <p className="text-slate-400 text-xs font-medium leading-relaxed">
                        O controle rigoroso dos prazos de progressão e livramento condicional é a base da advocacia criminal estratégica em fase de execução.
                    </p>
                </div>
            </div>
            
            <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col gap-6">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500"><UserCheck size={18} /></div>
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Prazos de Prescrição</h4>
                </div>
                <div className="space-y-3">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Prescrição da Pena (Art. 109 CP)</span>
                        <p className="text-[10px] font-bold text-slate-800 uppercase tracking-tight">Cálculo baseado no máximo da pena em abstrato ou concreto.</p>
                    </div>
                </div>
                <div className="flex items-start gap-2 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    <TrendingDown size={14} className="text-rose-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-bold text-rose-800 uppercase leading-relaxed tracking-tight">Atente-se às causas de interrupção do prazo prescricional (Art. 117 CP).</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
