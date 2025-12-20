
import { Search, Database, Info, FileSearch, ArrowRight, Loader2, Sparkles, Scale, ExternalLink, RefreshCcw, Printer, Copy, CheckCircle2, ChevronLeft } from 'lucide-react';
import React, { useState } from 'react';
import { interpretCNJMetadata, searchCNJTabelasUnificadas } from '../services/aiService';
import { Button } from './ui/Button';

export const CNJMetadataSearch: React.FC = () => {
  const [processNumber, setProcessNumber] = useState('');
  const [tpuQuery, setTpuQuery] = useState('');
  const [loadingProcess, setLoadingProcess] = useState(false);
  const [loadingTPU, setLoadingTPU] = useState(false);
  const [processResult, setProcessResult] = useState<string | null>(null);
  const [tpuResult, setTpuResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleProcessSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processNumber.trim()) return;
    setLoadingProcess(true);
    setProcessResult(null);
    setTpuResult(null); 
    try {
      const result = await interpretCNJMetadata(processNumber);
      setProcessResult(result);
    } catch (err) {
      console.error(err);
      alert("Erro ao consultar processo.");
    } finally {
      setLoadingProcess(false);
    }
  };

  const handleTPUSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tpuQuery.trim()) return;
    setLoadingTPU(true);
    setTpuResult(null);
    setProcessResult(null); 
    try {
      const result = await searchCNJTabelasUnificadas(tpuQuery);
      setTpuResult(result);
    } catch (err) {
      console.error(err);
      alert("Erro ao consultar tabelas unificadas.");
    } finally {
      setLoadingTPU(false);
    }
  };

  const handleCopy = (text: string | null) => {
    if (!text) return;
    const plainText = text.replace(/<[^>]*>/g, '');
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetAll = () => {
    setProcessResult(null);
    setTpuResult(null);
    setProcessNumber('');
    setTpuQuery('');
    setLoadingProcess(false);
    setLoadingTPU(false);
  };

  const isShowingResult = processResult || tpuResult || loadingProcess || loadingTPU;

  return (
    <div className="space-y-12 animate-in fade-in duration-700 w-full pb-20 text-left">
      {/* Header Fixo - Corrigido para Dark Mode */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-8 no-print w-full ${!isShowingResult ? 'max-w-6xl mx-auto' : ''}`}>
        <div className="text-left">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Metadados CNJ</h1>
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">Consulta Estruturada de Processos e Tabelas Unificadas</p>
        </div>
        <div className="flex items-center gap-4">
            {isShowingResult && (
                <button 
                    onClick={resetAll} 
                    className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-600 transition-all font-black uppercase text-[10px] tracking-widest shadow-sm"
                >
                    <ChevronLeft size={16} /> Voltar para Pesquisa
                </button>
            )}
            <div className="bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm shrink-0">
                <Database className="text-indigo-600 dark:text-indigo-400" size={24} />
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Base SGT/CNJ 2025</span>
            </div>
        </div>
      </div>

      {/* Grid de Busca */}
      {!isShowingResult && (
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
              {/* Consulta de Número de Processo */}
              <div className="bg-white dark:bg-slate-900 p-10 md:p-12 rounded-[3.5rem] border-2 border-slate-50 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 dark:bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-focus-within:bg-blue-100/50 transition-all"></div>
                  <div>
                      <div className="flex items-center gap-4 mb-8 relative z-10">
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                              <FileSearch size={28} />
                          </div>
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Decifrador de Processos</h3>
                      </div>
                      
                      <form onSubmit={handleProcessSearch} className="space-y-6 relative z-10">
                          <div className="relative">
                              <input 
                              type="text" 
                              value={processNumber}
                              onChange={(e) => setProcessNumber(e.target.value)}
                              placeholder="0000000-00.0000.0.00.0000"
                              className="w-full h-20 pl-6 pr-14 rounded-[1.8rem] border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500 focus:ring-8 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all font-mono font-black text-slate-900 dark:text-white text-lg tracking-tight placeholder:text-slate-200 dark:placeholder:text-slate-700 placeholder:tracking-normal outline-none"
                              required
                              />
                              <button 
                              type="submit" 
                              className="absolute right-3 top-3 h-14 w-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all active:scale-95 shadow-lg"
                              >
                              <ArrowRight size={24} />
                              </button>
                          </div>
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center px-6 leading-relaxed">Padrão Resolução 65/2008. Decomposição automática por tribunal.</p>
                      </form>
                  </div>
              </div>

              {/* Tabelas Unificadas TPU */}
              <div className="bg-white dark:bg-slate-900 p-10 md:p-12 rounded-[3.5rem] border-2 border-slate-50 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-focus-within:bg-indigo-100/50 transition-all"></div>
                  <div>
                      <div className="flex items-center gap-4 mb-8 relative z-10">
                          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                              <Database size={28} />
                          </div>
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Pesquisa TPU (Assuntos)</h3>
                      </div>
                      
                      <form onSubmit={handleTPUSearch} className="space-y-6 relative z-10">
                          <div className="relative">
                              <input 
                              type="text" 
                              value={tpuQuery}
                              onChange={(e) => setTpuQuery(e.target.value)}
                              placeholder="Ex: Danos Morais ou Código 10486"
                              className="w-full h-20 pl-6 pr-14 rounded-[1.8rem] border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:ring-8 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 transition-all font-black text-slate-900 dark:text-white text-lg placeholder:text-slate-200 dark:placeholder:text-slate-700 outline-none"
                              required
                              />
                              <button 
                              type="submit" 
                              className="absolute right-3 top-3 h-14 w-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-all active:scale-95 shadow-lg"
                              >
                              <Search size={24} />
                              </button>
                          </div>
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center px-6 leading-relaxed">Consulte a árvore oficial do CNJ para preenchimento de metadados.</p>
                      </form>
                  </div>
              </div>
          </div>
        </div>
      )}

      {/* States de Loading */}
      {(loadingProcess || loadingTPU) && (
          <div className="py-32 bg-white dark:bg-slate-900 rounded-[4rem] border-2 border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
              <Loader2 className="h-20 w-20 text-indigo-600 animate-spin mb-8" />
              <p className="font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] text-sm">
                  {loadingProcess ? 'Escaneando Hierarquia do Processo...' : 'Mapeando Árvore de Assuntos SGT/CNJ...'}
              </p>
          </div>
      )}

      {/* Relatórios de Resultado */}
      {(processResult || tpuResult) && (
        <div className="w-full animate-in slide-in-from-bottom-8 duration-500">
            <div className="bg-white dark:bg-slate-900 rounded-[4rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden w-full">
                <div className={`px-10 py-8 border-b border-white/10 flex justify-between items-center no-print ${processResult ? 'bg-blue-900' : 'bg-indigo-900'}`}>
                    <div className="flex items-center gap-4">
                        <Sparkles size={24} className={processResult ? 'text-blue-300' : 'text-indigo-300'} />
                        <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">
                            {processResult ? 'Metadados Processuais' : 'Decomposição de Assunto TPU'}
                        </h4>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => handleCopy(processResult || tpuResult)} className="p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all border border-white/10" title="Copiar Texto">
                            {copied ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Copy size={18} />}
                        </button>
                        <button onClick={() => window.print()} className="p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all border border-white/10" title="Imprimir">
                            <Printer size={18} />
                        </button>
                        <button onClick={resetAll} className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 rounded-xl hover:bg-slate-100 transition-all font-black uppercase text-[9px] tracking-widest ml-4">
                            <RefreshCcw size={14} /> Nova Pesquisa
                        </button>
                    </div>
                </div>
                
                <div className="p-10 md:p-20 w-full text-left bg-white dark:bg-slate-950/20">
                    <div 
                        className="prose max-w-none text-slate-800 dark:text-slate-200 cnj-dynamic-render w-full text-left" 
                        dangerouslySetInnerHTML={{ __html: (processResult || tpuResult) || "" }} 
                    />
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 px-10 md:px-20 py-10 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center no-print">
                    <div className="flex items-center gap-3">
                        <Info size={18} className="text-slate-400 dark:text-slate-500" />
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Relatório gerado em tempo real com base no SGT/CNJ</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">JurisPet AI &copy; 2025</p>
                </div>
            </div>
        </div>
      )}

      {/* Informativo de Rodapé Bento */}
      {!isShowingResult && (
        <div className="w-full max-w-6xl mx-auto">
          <div className="bg-[#0F172A] dark:bg-slate-900 p-12 rounded-[4rem] text-white flex flex-col lg:flex-row items-center gap-12 shadow-2xl relative overflow-hidden group w-full text-left">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-all duration-1000"></div>
              <div className="bg-white/10 p-6 rounded-[2.5rem] border border-white/10 relative z-10 shrink-0">
                  <Info className="h-12 w-12 text-indigo-300" />
              </div>
              <div className="flex-1 space-y-4 relative z-10 text-left">
                  <h3 className="text-2xl font-black tracking-tight uppercase">Protocolo Estratégico</h3>
                  <p className="text-indigo-100/70 dark:text-indigo-200/50 text-sm font-medium leading-relaxed max-w-4xl">
                      O CNJ utiliza as Tabelas Processuais Unificadas (TPU) para padronizar a nomenclatura em todo o Brasil. O preenchimento correto destes dados no protocolo evita atrasos e redistribuições por erro de classe/assunto.
                  </p>
              </div>
              <div className="relative z-10 shrink-0 no-print">
                  <a href="https://www.cnj.jus.br/sgt/consulta_publica.php" target="_blank" rel="noopener noreferrer" className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-400 hover:text-white transition-all shadow-xl flex items-center gap-2">
                      Portal SGT/CNJ <ExternalLink size={14}/>
                  </a>
              </div>
          </div>
        </div>
      )}

      <style>{`
          .cnj-dynamic-render {
              font-family: 'Inter', sans-serif;
              width: 100% !important;
              text-align: left;
          }

          .cnj-report-header, .tpu-result-header {
              background: #f8fafc;
              border-left: 8px solid #3b82f6;
              padding: 3rem;
              border-radius: 2.5rem;
              margin-bottom: 3.5rem;
              color: #1e293b;
              font-size: 1.35rem;
              line-height: 1.6;
              font-weight: 800;
              text-align: left;
              width: 100%;
          }

          .dark .cnj-report-header, .dark .tpu-result-header {
              background: #020617;
              border-left-color: #6366f1;
              color: #cbd5e1;
          }

          .tpu-result-header { border-left-color: #6366f1; }

          .cnj-breakdown-box {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
              gap: 1.5rem;
              margin-bottom: 4rem;
              text-align: left;
              width: 100%;
          }

          .segment-card {
              background: #fdfdfd;
              border: 1px solid #e2e8f0;
              padding: 2rem;
              border-radius: 2rem;
              text-align: center;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
              transition: all 0.3s;
              display: flex;
              flex-direction: column;
              justify-content: center;
              min-height: 140px;
          }

          .dark .segment-card {
              background: #020617;
              border-color: #1e293b;
          }

          .segment-card:hover { transform: translateY(-5px); border-color: #6366f1; box-shadow: 0 20px 40px -10px rgba(99, 102, 241, 0.1); }

          .segment-card .label {
              display: block;
              font-weight: 900;
              font-size: 0.65rem;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              margin-bottom: 0.75rem;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 0.5rem;
          }

          .dark .segment-card .label { border-color: #0f172a; }

          .segment-card .value {
              display: block;
              font-weight: 950;
              font-size: 1.5rem;
              color: #4f46e5;
              letter-spacing: -0.05em;
              line-height: 1.2;
          }

          .dark .segment-card .value { color: #818cf8; }

          .cnj-jurisdiction-card, .tpu-definition-card, .cnj-action-plan {
              background: #fff;
              border: 1px solid #e2e8f0;
              border-radius: 3rem;
              padding: 3.5rem;
              margin-bottom: 3rem;
              position: relative;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
              text-align: left;
              width: 100%;
          }

          .dark .cnj-jurisdiction-card, .dark .tpu-definition-card, .dark .cnj-action-plan {
              background: #020617;
              border-color: #1e293b;
          }

          @media print {
              .no-print { display: none !important; }
              body { background: white !important; }
              .bg-white { background: white !important; border: none !important; box-shadow: none !important; }
          }
      `}</style>
    </div>
  );
};
