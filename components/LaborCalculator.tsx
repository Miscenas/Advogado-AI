
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
      alert("Por favor, preencha o salário e as datas de admissão/demissão corretamente.");
      return;
    }

    let workedDays = 0;
    if (lastPaymentDate) {
        const lastPay = new Date(lastPaymentDate + 'T12:00:00');
        const diffInMs = end.getTime() - lastPay.getTime();
        workedDays = Math.max(0, Math.floor(diffInMs / (1000 * 60 * 60 * 24)));
    } else {
        workedDays = end.getDate();
    }

    const itens: CalculationEntry[] = [];
    const totalYears = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    const noticeDays = Math.min(90, 30 + (totalYears * 3));
    
    let months13 = end.getMonth(); 
    if (end.getDate() >= 15) months13 += 1;

    let totalMonths = ((end.getFullYear() - start.getFullYear()) * 12) + (end.getMonth() - start.getMonth());
    const monthsVacationProp = (totalMonths % 12) + (end.getDate() >= 15 ? 1 : 0);

    const vSaldo = (s / 30) * workedDays;
    itens.push({ evento: 'Saldo de Salário', ref: `${workedDays} dias`, provento: vSaldo, desconto: 0 });

    let vAviso = 0;
    if (notice === 'indenizado' && reason === 'dispensa_sem_justa_causa') {
      vAviso = (s / 30) * noticeDays;
      itens.push({ evento: 'Aviso Prévio Indenizado', ref: `${noticeDays} dias`, provento: vAviso, desconto: 0 });
    }

    let v13 = 0;
    if (reason !== 'dispensa_com_justa_causa') {
      v13 = (s / 12) * months13;
      itens.push({ evento: '13º Salário Proporcional', ref: `${months13}/12`, provento: v13, desconto: 0 });
    }

    let v13Aviso = 0;
    if (notice === 'indenizado' && reason !== 'dispensa_com_justa_causa') {
      v13Aviso = s / 12;
      itens.push({ evento: '13º sobre Aviso Prévio', ref: '1/12', provento: v13Aviso, desconto: 0 });
    }

    let vFeriasVenc = 0;
    if (expVacDays > 0) {
      vFeriasVenc = (s / 30) * expVacDays;
      itens.push({ evento: 'Férias Vencidas', ref: `${expVacDays} dias`, provento: vFeriasVenc, desconto: 0 });
    }

    let vFeriasProp = 0;
    if (reason !== 'dispensa_com_justa_causa') {
      vFeriasProp = (s / 12) * monthsVacationProp;
      itens.push({ evento: 'Férias Proporcionais', ref: `${monthsVacationProp}/12`, provento: vFeriasProp, desconto: 0 });
    }

    let vFeriasAviso = 0;
    if (notice === 'indenizado' && reason !== 'dispensa_com_justa_causa') {
      vFeriasAviso = s / 12;
      itens.push({ evento: 'Férias sobre Aviso Prévio', ref: '1/12', provento: vFeriasAviso, desconto: 0 });
    }

    const baseTerco = vFeriasVenc + vFeriasProp + vFeriasAviso;
    if (baseTerco > 0) {
      itens.push({ evento: '1/3 Constitucional sobre Férias', ref: '33,33%', provento: baseTerco / 3, desconto: 0 });
    }

    const inssSalario = calculateINSS(vSaldo);
    itens.push({ evento: 'Desconto INSS', ref: `Tabela 2025`, provento: 0, desconto: inssSalario });

    const baseIrrfSalario = (vSaldo - inssSalario);
    const { valor: irrfSalario, aliq: aliqIrrfSal } = calculateIRRF(baseIrrfSalario, numDep);
    if (irrfSalario > 0) {
      itens.push({ evento: 'Desconto IRRF', ref: aliqIrrfSal, provento: 0, desconto: irrfSalario });
    }

    const baseInss13 = v13;
    const inss13 = calculateINSS(baseInss13);
    itens.push({ evento: 'Desconto INSS sobre 13º', ref: `Tabela 2025`, provento: 0, desconto: inss13 });

    const totalP = itens.reduce((a, b) => a + b.provento, 0);
    const totalD = itens.reduce((a, b) => a + b.desconto, 0);

    const baseFGTS = vSaldo + v13 + v13Aviso + vAviso;
    const depositoFGTS = baseFGTS * 0.08;
    let multa = 0;
    if (reason === 'dispensa_sem_justa_causa') {
      multa = (fb + depositoFGTS) * 0.40;
    }

    setResult({
      itens,
      totalProventos: totalP,
      totalDescontos: totalD,
      totalLiquido: totalP - totalD,
      fgtsEstimado: depositoFGTS,
      multaFGTS: multa,
      infoTecnica: [
        `Tempo de serviço: ${totalYears} anos.`,
        `Aviso Prévio: ${noticeDays} dias.`,
        `Multa de 40% FGTS: R$ ${formatCurrency(multa)}.`,
        `Cálculo simulado conforme tabelas de 2025.`
      ]
    });

    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleReset = () => {
    setResult(null);
  };

  const handlePrint = () => {
    if (!result) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Habilite pop-ups para imprimir o demonstrativo.");

    const rows = result.itens.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left;">${item.evento}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.ref}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: green;">${item.provento > 0 ? 'R$ ' + formatCurrency(item.provento) : '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: red;">${item.desconto > 0 ? 'R$ ' + formatCurrency(item.desconto) : '-'}</td>
      </tr>
    `).join('');

    const technicalInfo = result.infoTecnica.map(info => `<li style="margin-bottom: 5px;">${info}</li>`).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Demonstrativo de Rescisão - JurisPet AI</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
            .header p { margin: 5px 0 0; font-weight: bold; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f4f4f4; padding: 12px; border-bottom: 2px solid #ddd; text-transform: uppercase; font-size: 12px; }
            .totals { background: #fafafa; padding: 20px; border-radius: 10px; border: 1px solid #ddd; margin-bottom: 30px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: bold; }
            .grand-total { font-size: 20px; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
            .footer { margin-top: 50px; font-size: 10px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            .fgts-box { border: 2px dashed #22c55e; padding: 15px; border-radius: 8px; background: #f0fdf4; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Demonstrativo de Simulação Rescisória</h1>
            <p>JurisPet AI - Sistema de Cálculos Trabalhistas</p>
            <div style="font-size: 10px; margin-top: 10px;">Data da Emissão: ${new Date().toLocaleDateString()}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Descrição do Evento</th>
                <th style="text-align: center;">Referência</th>
                <th style="text-align: right;">Créditos</th>
                <th style="text-align: right;">Débitos</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Total de Créditos:</span>
              <span style="color: green;">R$ ${formatCurrency(result.totalProventos)}</span>
            </div>
            <div class="total-row">
              <span>Total de Débitos:</span>
              <span style="color: red;">R$ ${formatCurrency(result.totalDescontos)}</span>
            </div>
            <div class="total-row grand-total">
              <span>VALOR LÍQUIDO ESTIMADO:</span>
              <span>R$ ${formatCurrency(result.totalLiquido)}</span>
            </div>
          </div>

          <div class="fgts-box">
            <strong>Indenização de 40% do FGTS (Estimada):</strong> R$ ${formatCurrency(result.multaFGTS)}
          </div>

          <div style="margin-top: 30px;">
            <h3 style="font-size: 14px; text-transform: uppercase;">Notas Técnicas:</h3>
            <ul style="font-size: 12px; color: #555;">
              ${technicalInfo}
            </ul>
          </div>

          <div class="footer">
            JurisPet AI &copy; 2025 - Simulação Informativa (CLT)
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500 w-full pb-20 text-left">
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 no-print w-full ${!result ? 'max-w-6xl mx-auto' : ''}`}>
        <div className="space-y-1 text-left">
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Calculadora Trabalhista</h1>
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px] md:text-[10px] tracking-[0.3em] mt-2">Simulação de Rescisão CLT</p>
        </div>
        <div className="flex items-center gap-3">
            {result && (
                <button onClick={handleReset} className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-600 transition-all font-black uppercase text-[10px] tracking-widest shadow-sm mr-2 no-print">
                    <ArrowLeft size={16} /> Novo Cálculo
                </button>
            )}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-3 w-fit shadow-sm">
                <Scale className="text-emerald-600 dark:text-emerald-400 w-5 h-5 md:w-6 md:h-6" />
                <span className="text-[9px] md:text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest text-nowrap">Cálculo Auditado</span>
            </div>
        </div>
      </div>

      {!result && (
        <div className="w-full max-w-6xl mx-auto no-print">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] border-2 border-slate-50 dark:border-slate-800 shadow-sm space-y-8 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-2 text-left">
                        <label className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Salário Bruto (R$)</label>
                        <div className="relative group">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 group-focus-within:text-emerald-500 transition-colors" size={18} />
                            <input type="text" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="0,00" className="w-full h-12 md:h-14 pl-12 pr-6 rounded-xl md:rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 font-black text-slate-900 dark:text-white text-base md:text-lg outline-none transition-all" />
                        </div>
                    </div>
                    <div className="space-y-2 text-left">
                        <label className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Saldo FGTS (para multa)</label>
                        <div className="relative group">
                            <PiggyBank className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 group-focus-within:text-emerald-500 transition-colors" size={18} />
                            <input type="text" value={fgtsBalance} onChange={(e) => setFgtsBalance(e.target.value)} placeholder="0,00" className="w-full h-12 md:h-14 pl-12 pr-6 rounded-xl md:rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 font-black text-slate-900 dark:text-white text-base md:text-lg outline-none transition-all" />
                        </div>
                    </div>
                    <div className="space-y-2 text-left">
                        <label className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Data de Admissão</label>
                        <input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} className="w-full h-12 md:h-14 px-4 rounded-xl md:rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white outline-none text-sm" />
                    </div>
                    <div className="space-y-2 text-left">
                        <label className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Data de Demissão</label>
                        <input type="date" value={dismissalDate} onChange={(e) => setDismissalDate(e.target.value)} className="w-full h-12 md:h-14 px-4 rounded-xl md:rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white outline-none text-sm" />
                    </div>
                    <div className="space-y-2 text-left">
                        <label className="text-[9px] md:text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest ml-1 flex items-center gap-1">Data do Último Salário</label>
                        <input type="date" value={lastPaymentDate} onChange={(e) => setLastPaymentDate(e.target.value)} className="w-full h-12 md:h-14 px-4 rounded-xl md:rounded-2xl border-2 border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/20 focus:bg-white dark:focus:bg-slate-900 font-bold text-slate-900 dark:text-white outline-none text-sm" />
                    </div>
                    <div className="space-y-2 text-left">
                        <label className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Número de Dependentes</label>
                        <input type="number" value={dependents} onChange={(e) => setDependents(e.target.value)} className="w-full h-12 md:h-14 px-4 rounded-xl md:rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white outline-none text-sm" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 items-center border-t border-slate-100 dark:border-slate-800 pt-8">
                    <div className="space-y-2 text-left">
                        <label className="text-[9px] md:text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest ml-1">Dias de Férias Vencidas</label>
                        <input type="number" max="60" value={expiredVacationDays} onChange={(e) => setExpiredVacationDays(e.target.value)} placeholder="0" className="w-full h-12 md:h-14 px-4 rounded-xl md:rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/20 focus:bg-white dark:focus:bg-slate-900 font-bold text-slate-900 dark:text-white outline-none text-sm" />
                    </div>
                    <div className="space-y-2 text-left">
                        <label className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Motivo da Saída</label>
                        <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full h-12 md:h-14 px-4 rounded-xl md:rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white outline-none text-xs md:text-sm appearance-none">
                            <option value="dispensa_sem_justa_causa">Sem Justa Causa (Patrão colocou pra fora)</option>
                            <option value="pedido_de_demissao">Pedido de Demissão (Eu quis sair)</option>
                            <option value="dispensa_com_justa_causa">Com Justa Causa (Fiz algo errado)</option>
                        </select>
                    </div>
                </div>

                <Button onClick={calculateRescision} className="w-full h-14 md:h-16 rounded-xl md:rounded-2xl bg-[#0F172A] dark:bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl transition-all active:scale-95 border-none">
                    CALCULAR RESCISÃO <ArrowRight size={16} className="ml-2" />
                </Button>
            </div>

            <div className="space-y-6">
                <div className="bg-[#0F172A] dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border border-transparent dark:border-slate-800">
                    <div className="absolute top-0 right-0 w-32 h-32 md:w-48 md:h-48 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-all duration-1000"></div>
                    <div className="relative z-10 space-y-3 md:space-y-4 text-left">
                        <TrendingUp className="text-emerald-400" size={24} />
                        <h3 className="text-lg md:text-xl font-black uppercase tracking-tight">Cálculo Atualizado</h3>
                        <p className="text-slate-400 dark:text-slate-500 text-[9px] leading-relaxed font-bold uppercase tracking-widest">
                            O cálculo usa as regras da CLT e as tabelas de INSS/IRRF de 2025.
                        </p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div ref={resultRef} className="w-full animate-in slide-in-from-bottom-10 duration-700">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] md:rounded-[4rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="bg-[#0F172A] px-8 md:px-12 py-8 md:py-10 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 no-print">
                    <div className="flex items-center gap-4 text-left">
                        <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-lg"><FileText size={24}/></div>
                        <div>
                           <h3 className="font-black text-white uppercase text-sm tracking-widest">Resumo do Cálculo Trabalhista</h3>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">JurisPet AI</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handlePrint} className="p-4 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all border border-white/10" title="Imprimir">
                            <Printer size={22} />
                        </button>
                    </div>
                </div>

                <div className="p-8 md:p-14 text-left">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
                        <div className="lg:col-span-3 overflow-x-auto no-scrollbar">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b-2 border-slate-100 dark:border-slate-800">
                                        <th className="pb-4 font-black text-slate-400 dark:text-slate-500 uppercase text-[9px] md:text-[10px] tracking-widest">Descrição</th>
                                        <th className="pb-4 font-black text-slate-400 dark:text-slate-500 uppercase text-[9px] md:text-[10px] tracking-widest text-center">Referência</th>
                                        <th className="pb-4 font-black text-slate-400 dark:text-slate-500 uppercase text-[9px] md:text-[10px] tracking-widest text-right">Crédito</th>
                                        <th className="pb-4 font-black text-slate-400 dark:text-slate-500 uppercase text-[9px] md:text-[10px] tracking-widest text-right">Débito</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {result.itens.map((item, i) => (
                                        <tr key={i} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="py-4 md:py-5 font-black text-slate-700 dark:text-slate-200 text-xs md:text-sm uppercase tracking-tight">{item.evento}</td>
                                            <td className="py-4 md:py-5 text-center font-bold text-slate-400 dark:text-slate-500 text-[10px] md:text-xs">{item.ref}</td>
                                            <td className="py-4 md:py-5 text-right font-black text-emerald-600 dark:text-emerald-400 text-xs md:text-sm">{item.provento > 0 ? `R$ ${formatCurrency(item.provento)}` : '-'}</td>
                                            <td className="py-4 md:py-5 text-right font-black text-rose-600 dark:text-rose-400 text-xs md:text-sm">{item.desconto > 0 ? `R$ ${formatCurrency(item.desconto)}` : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-4 border-slate-900 dark:border-indigo-600">
                                        <td colSpan={2} className="py-6 font-black text-slate-900 dark:text-white uppercase text-xs md:text-sm tracking-widest">Totais Brutos</td>
                                        <td className="py-6 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm md:text-base">R$ {formatCurrency(result.totalProventos)}</td>
                                        <td className="py-6 text-right font-black text-rose-600 dark:text-rose-400 text-sm md:text-base">R$ {formatCurrency(result.totalDescontos)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-900 dark:bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl text-center flex flex-col justify-center min-h-[220px]">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-3">Valor Líquido a Receber</p>
                                <h4 className="text-3xl md:text-4xl font-black tracking-tighter mb-2">R$ {formatCurrency(result.totalLiquido)}</h4>
                                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-400"/>
                                    <span className="text-[8px] font-black uppercase tracking-widest">Cálculo Finalizado</span>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4 no-print text-left">
                                <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2"><Info size={14}/> Detalhes do Cálculo</h5>
                                <ul className="space-y-2">
                                    {result.infoTecnica.map((info, i) => (
                                        <li key={i} className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase leading-relaxed tracking-tight">• {info}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-950/20 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-800/50 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-5 text-left">
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-50 dark:border-slate-800"><PiggyBank size={28}/></div>
                            <div>
                                <h4 className="text-lg font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-tight leading-none">Multa de 40% do FGTS</h4>
                                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-widest mt-1">Valor estimado da multa rescisória</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <h5 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">R$ {formatCurrency(result.multaFGTS)}</h5>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-[#0F172A] px-8 md:px-12 py-8 flex justify-between items-center no-print">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <Scale size={16}/>
                        <span className="text-[9px] font-black uppercase tracking-widest">Base de dados JurisPet v2.6</span>
                    </div>
                    <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">JurisPet AI &copy; 2025</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
