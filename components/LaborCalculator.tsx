
import React, { useState, useRef } from 'react';
import { 
  DollarSign, 
  Printer, 
  CheckCircle2, 
  ArrowRight,
  Info,
  PiggyBank,
  TrendingUp,
  Scale,
  CalendarDays,
  Umbrella,
  FileText,
  RotateCcw,
  ArrowLeft
} from 'lucide-react';
import { Button } from './ui/Button';

interface CalculationEntry {
  evento: string;
  ref: string;
  provento: number;
  desconto: number;
}

interface RescisionResult {
  itens: CalculationEntry[];
  totalProventos: number;
  totalDescontos: number;
  totalLiquido: number;
  fgtsEstimado: number;
  multaFGTS: number;
  infoTecnica: string[];
}

export const LaborCalculator: React.FC = () => {
  const [salary, setSalary] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [dismissalDate, setDismissalDate] = useState('');
  const [lastPaymentDate, setLastPaymentDate] = useState(''); 
  const [reason, setReason] = useState('dispensa_sem_justa_causa');
  const [notice, setNotice] = useState('indenizado');
  const [dependents, setDependents] = useState('0');
  const [expiredVacationDays, setExpiredVacationDays] = useState('0'); 
  const [fgtsBalance, setFgtsBalance] = useState(''); 

  const [result, setResult] = useState<RescisionResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calculateINSS = (base: number) => {
    if (base <= 0) return 0;
    let inss = 0;
    const TETO_MAX = 908.85;
    if (base <= 1412.00) inss = base * 0.075;
    else if (base <= 2666.68) inss = (1412 * 0.075) + ((base - 1412) * 0.09);
    else if (base <= 4000.03) inss = (1412 * 0.075) + (1254.68 * 0.09) + ((base - 2666.68) * 0.12);
    else if (base <= 7786.02) inss = (1412 * 0.075) + (1254.68 * 0.09) + (1333.35 * 0.12) + ((base - 4000.03) * 0.14);
    else inss = TETO_MAX;
    return Math.min(inss, TETO_MAX);
  };

  const calculateIRRF = (baseTributavel: number, numDependentes: number) => {
    const baseComDependentes = baseTributavel - (numDependentes * 189.59);
    const baseSimplificada = baseTributavel - 564.80;
    const base = Math.min(baseComDependentes, baseSimplificada);
    if (base <= 2259.20) return { valor: 0, aliq: 'ISENTO' };
    if (base <= 2826.65) return { valor: (base * 0.075) - 169.44, aliq: '7,5%' };
    if (base <= 3751.05) return { valor: (base * 0.15) - 381.44, aliq: '15%' };
    if (base <= 4664.68) return { valor: (base * 0.225) - 662.77, aliq: '22,5%' };
    return { valor: (base * 0.275) - 896.00, aliq: '27,5%' };
  };

  const calculateRescision = () => {
    const cleanNum = (val: string) => {
        if (!val) return 0;
        let clean = val.replace(/\./g, '').replace(',', '.');
        return parseFloat(clean) || 0;
    };
    const s = cleanNum(salary);
    const fb = cleanNum(fgtsBalance);
    const expVacDays = parseInt(expiredVacationDays) || 0;
    const numDep = parseInt(dependents) || 0;
    const start = new Date(admissionDate + 'T12:00:00');
    const end = new Date(dismissalDate + 'T12:00:00');
    
    if (!s || isNaN(start.getTime()) || isNaN(end.getTime())) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    let workedDays = 0;
    if (lastPaymentDate) {
        const lastPay = new Date(lastPaymentDate + 'T12:00:00');
        const diffInMs = end.getTime() - lastPay.getTime();
        workedDays = Math.max(0, Math.floor(diffInMs / (1000 * 60 * 60 * 24)));
    } else { workedDays = end.getDate(); }

    const itens: CalculationEntry[] = [];
    const totalYears = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    const noticeDays = Math.min(90, 30 + (totalYears * 3));
    let months13 = end.getMonth(); if (end.getDate() >= 15) months13 += 1;
    let totalMonths = ((end.getFullYear() - start.getFullYear()) * 12) + (end.getMonth() - start.getMonth());
    const monthsVacationProp = (totalMonths % 12) + (end.getDate() >= 15 ? 1 : 0);

    const vSaldo = (s / 30) * workedDays;
    itens.push({ evento: 'Saldo de Salário', ref: `${workedDays} d`, provento: vSaldo, desconto: 0 });

    let vAviso = 0;
    if (notice === 'indenizado' && reason === 'dispensa_sem_justa_causa') {
      vAviso = (s / 30) * noticeDays;
      itens.push({ evento: 'Aviso Prévio Indenizado', ref: `${noticeDays} d`, provento: vAviso, desconto: 0 });
    }

    let v13 = 0;
    if (reason !== 'dispensa_com_justa_causa') {
      v13 = (s / 12) * months13;
      itens.push({ evento: '13º Salário Proporcional', ref: `${months13}/12`, provento: v13, desconto: 0 });
    }

    let vFeriasVenc = 0; if (expVacDays > 0) {
      vFeriasVenc = (s / 30) * expVacDays;
      itens.push({ evento: 'Férias Vencidas', ref: `${expVacDays} d`, provento: vFeriasVenc, desconto: 0 });
    }

    let vFeriasProp = 0; if (reason !== 'dispensa_com_justa_causa') {
      vFeriasProp = (s / 12) * monthsVacationProp;
      itens.push({ evento: 'Férias Proporcionais', ref: `${monthsVacationProp}/12`, provento: vFeriasProp, desconto: 0 });
    }

    const baseTerco = vFeriasVenc + vFeriasProp;
    if (baseTerco > 0) itens.push({ evento: '1/3 sobre Férias', ref: '33,3%', provento: baseTerco / 3, desconto: 0 });

    const inssSalario = calculateINSS(vSaldo);
    itens.push({ evento: 'INSS S/ Salário', ref: 'Tab 2025', provento: 0, desconto: inssSalario });

    const totalP = itens.reduce((a, b) => a + b.provento, 0);
    const totalD = itens.reduce((a, b) => a + b.desconto, 0);

    setResult({
      itens,
      totalProventos: totalP,
      totalDescontos: totalD,
      totalLiquido: totalP - totalD,
      fgtsEstimado: (vSaldo + v13 + vAviso) * 0.08,
      multaFGTS: reason === 'dispensa_sem_justa_causa' ? (fb + (vSaldo + v13 + vAviso) * 0.08) * 0.40 : 0,
      infoTecnica: [`Tempo de serviço: ${totalYears} anos.`, `Multa de 40% FGTS: R$ ${formatCurrency(reason === 'dispensa_sem_justa_causa' ? (fb + (vSaldo + v13 + vAviso) * 0.08) * 0.40 : 0)}.`]
    });
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handlePrint = () => {
    if (!result) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = result.itens.map(item => `<tr><td>${item.evento}</td><td style="text-align:center">${item.ref}</td><td style="text-align:right">${item.provento > 0 ? 'R$ ' + formatCurrency(item.provento) : '-'}</td><td style="text-align:right;color:red">${item.desconto > 0 ? 'R$ ' + formatCurrency(item.desconto) : '-'}</td></tr>`).join('');
    printWindow.document.write(`<html><head><style>body{font-family:sans-serif;padding:30px;}table{width:100%;border-collapse:collapse;margin:20px 0;}th,td{padding:10px;border:1px solid #eee;text-align:left;}th{background:#f8f8f8;}</style></head><body><h2>Demonstrativo de Rescisão</h2><table><thead><tr><th>Descrição</th><th>Ref</th><th>Proventos</th><th>Descontos</th></tr></thead><tbody>${rows}</tbody></table><h3>Líquido: R$ ${formatCurrency(result.totalLiquido)}</h3></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500 w-full pb-20 text-left max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        <div className="text-left">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Calculadora Trabalhista</h1>
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-3">Simulação Rescisória CLT 2025</p>
        </div>
        {result && (
            <button onClick={() => setResult(null)} className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-600 font-black uppercase text-[10px] tracking-widest shadow-sm">
                <RotateCcw size={16} /> Novo Cálculo
            </button>
        )}
      </div>

      {!result ? (
        <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3.5rem] border border-slate-200 dark:border-slate-800 shadow-sm w-full text-left">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salário Bruto (R$)</label>
                    <input type="text" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="0,00" className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-black text-slate-900 dark:text-white text-lg outline-none focus:border-indigo-500 transition-all" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo do FGTS (R$)</label>
                    <input type="text" value={fgtsBalance} onChange={(e) => setFgtsBalance(e.target.value)} placeholder="0,00" className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-black text-slate-900 dark:text-white text-lg outline-none focus:border-indigo-500 transition-all" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo da Saída</label>
                    <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full h-14 px-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white outline-none">
                        <option value="dispensa_sem_justa_causa">Dispensa sem Justa Causa</option>
                        <option value="pedido_de_demissao">Pedido de Demissão</option>
                        <option value="dispensa_com_justa_causa">Dispensa por Justa Causa</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Admissão</label>
                    <input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Demissão</label>
                    <input type="date" value={dismissalDate} onChange={(e) => setDismissalDate(e.target.value)} className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white outline-none" />
                </div>
                <div className="space-y-2 flex items-end">
                    <Button onClick={calculateRescision} className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest border-none shadow-xl">Calcular Rescisão</Button>
                </div>
             </div>
        </div>
      ) : (
        <div ref={resultRef} className="animate-in slide-in-from-bottom-6 duration-500 w-full">
            <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-left">
                <div className="bg-[#0F172A] px-10 py-8 flex justify-between items-center text-white">
                    <h3 className="font-black uppercase text-sm tracking-widest">Demonstrativo de Simulação</h3>
                    <button onClick={handlePrint} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10"><Printer size={20}/></button>
                </div>
                <div className="p-8 md:p-12 overflow-x-auto">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Descrição do Evento</th>
                                <th className="text-center">Referência</th>
                                <th className="text-right">Créditos</th>
                                <th className="text-right">Débitos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result.itens.map((item, i) => (
                                <tr key={i}>
                                    <td className="font-bold">{item.evento}</td>
                                    <td className="text-center text-slate-400">{item.ref}</td>
                                    <td className="text-right text-emerald-600 font-bold">{item.provento > 0 ? `R$ ${formatCurrency(item.provento)}` : '-'}</td>
                                    <td className="text-right text-rose-600 font-bold">{item.desconto > 0 ? `R$ ${formatCurrency(item.desconto)}` : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-50 dark:bg-slate-950 font-black">
                                <td colSpan={2} className="uppercase text-[10px]">Total Líquido Estimado</td>
                                <td colSpan={2} className="text-right text-2xl text-indigo-600 tracking-tighter">R$ {formatCurrency(result.totalLiquido)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
