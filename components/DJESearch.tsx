
import { Search, Newspaper, ArrowRight, Loader2, Sparkles, Filter, Calendar, MapPin, UserCheck, Printer, RefreshCcw } from 'lucide-react';
import React, { useState } from 'react';
import { searchDJE } from '../services/aiService';
import { Button } from './ui/Button';

const TRIBUNAIS_LIST = [
  "STF", "STJ", "TST", "TSE", "STM",
  "TRF1", "TRF2", "TRF3", "TRF4", "TRF5", "TRF6",
  "TJSP", "TJRJ", "TJMG", "TJRS", "TJPR", "TJBA", "TJSC", "TJGO", "TJCE", "TJPE", "TJDFT", "TJES", "TJMT", "TJMS", "TJMA", "TJPA", "TJPB", "TJPI", "TJRN", "TJRO", "TJRR", "TJSE", "TJTO", "TJAC", "TJAL", "TJAM", "TJAP"
];

export const DJESearch: React.FC = () => {
  const [name, setName] = useState('');
  const [oab, setOab] = useState('');
  const [tribunal, setTribunal] = useState('TJSP');
  const [period, setPeriod] = useState('Ultimos 30 dias');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() && !oab.trim()) {
      alert("Por favor, preencha o nome ou a OAB.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const response = await searchDJE(name, oab, tribunal, period);
      setResult(response);
    } catch (err) {
      console.error(err);
      alert("Erro ao consultar o DJE.");
    } finally {
      setLoading(false);
    }
  };

  const resetSearch = () => {
    setResult(null);
    setName('');
    setOab('');
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 w-full pb-20 text-left">
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-8 w-full ${!result ? 'max-w-5xl mx-auto' : ''}`}>
        <div className="text-left">
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter uppercase leading-none">CONSULTA DJE</h1>
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">Monitoramento Inteligente de Diários Oficiais</p>
        </div>
        <div className="bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
            <Newspaper className="text-indigo-600 dark:text-indigo-400" size={24} />
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Base de Intimações 2025</span>
        </div>
      </div>

      {!result && !loading && (
        <div className="w-full max-w-5xl mx-auto">
          <div className="bg-white dark:bg-slate-900 p-10 md:p-12 rounded-[3.5rem] border-2 border-slate-50 dark:border-slate-800 shadow-sm relative overflow-hidden group w-full text-left">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-focus-within:bg-indigo-100/50 transition-all"></div>
              
              <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 w-full text-left">
              <div className="space-y-3 text-left">
                  <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                      <UserCheck size={14} className="text-indigo-400" /> Nome Completo
                  </label>
                  <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Dr. Antonio Spinelli"
                  className="w-full h-16 px-6 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:ring-8 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 transition-all font-black text-slate-900 dark:text-white text-lg outline-none"
                  />
              </div>

              <div className="space-y-3 text-left">
                  <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                      <Sparkles size={14} className="text-indigo-400" /> Inscrição OAB
                  </label>
                  <input 
                  type="text" 
                  value={oab}
                  onChange={(e) => setOab(e.target.value)}
                  placeholder="Ex: 175223/SP"
                  className="w-full h-16 px-6 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:ring-8 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 transition-all font-black text-slate-900 dark:text-white text-lg outline-none"
                  />
              </div>

              <div className="space-y-3 text-left">
                  <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                      <MapPin size={14} className="text-indigo-400" /> Tribunal / Seccional
                  </label>
                  <select 
                  value={tribunal}
                  onChange={(e) => setTribunal(e.target.value)}
                  className="w-full h-16 px-6 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest outline-none appearance-none"
                  >
                  {TRIBUNAIS_LIST.map(t => <option key={t} value={t} className="bg-white dark:bg-slate-900">{t}</option>)}
                  </select>
              </div>

              <div className="space-y-3 text-left">
                  <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                      <Calendar size={14} className="text-indigo-400" /> Janela Temporal
                  </label>
                  <select 
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full h-16 px-6 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest outline-none appearance-none"
                  >
                  <option className="bg-white dark:bg-slate-900">Ultimas 24 horas</option>
                  <option className="bg-white dark:bg-slate-900">Ultimos 7 dias</option>
                  <option className="bg-white dark:bg-slate-900">Ultimos 30 dias</option>
                  <option className="bg-white dark:bg-slate-900">Ano de 2025</option>
                  <option className="bg-white dark:bg-slate-900">Histórico Completo</option>
                  </select>
              </div>

              <div className="md:col-span-2 pt-6 flex justify-end">
                  <Button 
                      type="submit" 
                      disabled={loading}
                      className="h-16 px-16 rounded-[1.8rem] bg-[#0F172A] dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-sm shadow-2xl transition-all active:scale-95 border-none"
                  >
                  {loading ? (
                      <> <Loader2 size={20} className="animate-spin mr-3" /> MAPEANDO DIÁRIOS...</>
                  ) : (
                      <> <Search size={20} className="mr-3" /> CONSULTAR DIÁRIOS</>
                  )}
                  </Button>
              </div>
              </form>
          </div>
        </div>
      )}

      {loading && (
          <div className="py-32 flex flex-col items-center justify-center w-full animate-in zoom-in-95">
              <Loader2 className="h-20 w-20 text-indigo-600 animate-spin mb-8" />
              <p className="font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] text-sm">Escaneando Diários Oficiais...</p>
          </div>
      )}

      {result && (
        <div className="w-full animate-in slide-in-from-bottom-8 duration-500 text-left">
            <div className="bg-white dark:bg-slate-900 rounded-[4rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden w-full">
                <div className="bg-[#0F172A] px-10 md:px-14 py-10 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 w-full no-print">
                    <div className="flex items-center gap-4 text-left">
                        <Newspaper size={28} className="text-indigo-400" />
                        <h3 className="font-black text-white uppercase text-sm tracking-[0.25em]">Relatório de Intimações Encontradas</h3>
                    </div>
                    <div className="flex gap-4 shrink-0">
                        <button onClick={resetSearch} className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all font-black uppercase text-[10px] tracking-widest mr-4 border border-white/10">
                            <RefreshCcw size={16} /> Nova Busca
                        </button>
                        <button onClick={() => window.print()} className="p-4 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all border border-white/10" title="Imprimir Relatório">
                            <Printer size={22} />
                        </button>
                    </div>
                </div>
                
                <div className="p-10 md:p-20 w-full text-left bg-white dark:bg-slate-950/20">
                    <div 
                        className="prose max-w-none text-slate-800 dark:text-slate-200 dje-dynamic-render w-full text-left"
                        dangerouslySetInnerHTML={{ __html: result }}
                    />
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 px-10 md:px-20 py-10 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 no-print">
                    <div className="flex items-center gap-3">
                        <Filter size={18} className="text-slate-400 dark:text-slate-500" />
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Busca indexada em tempo real via Google Search & DJE Oficial</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">JurisPet AI &copy; 2025</p>
                </div>
            </div>
        </div>
      )}

      <style>{`
          .dje-dynamic-render {
              font-family: 'Inter', sans-serif;
              width: 100% !important;
              text-align: left;
          }

          .dje-report-header {
              background: #f8fafc;
              border-left: 8px solid #4f46e5;
              padding: 3rem;
              border-radius: 2.5rem;
              margin-bottom: 4rem;
              color: #1e293b;
              font-size: 1.25rem;
              line-height: 1.8;
              text-align: left;
          }
          
          .dark .dje-report-header {
              background: #020617;
              color: #cbd5e1;
              border-left-color: #6366f1;
          }

          .dje-publication-card {
              background: white;
              border: 1px solid #e2e8f0;
              border-radius: 3rem;
              padding: 3.5rem;
              margin-bottom: 3.5rem;
              position: relative;
              transition: all 0.3s;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
              width: 100%;
              text-align: left;
          }
          
          .dark .dje-publication-card {
              background: #020617;
              border-color: #1e293b;
          }

          .dje-publication-card:hover {
              border-color: #4f46e5;
              box-shadow: 0 20px 40px -10px rgba(79, 70, 229, 0.08);
          }

          .pub-meta {
              display: flex;
              gap: 1.5rem;
              margin-bottom: 2rem;
              align-items: center;
          }

          .pub-date {
              background: #0f172a;
              color: white;
              padding: 0.5rem 1.25rem;
              border-radius: 0.85rem;
              font-size: 0.75rem;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.1em;
          }

          .pub-court {
              color: #64748b;
              font-size: 0.75rem;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.15em;
          }

          .pub-process {
              font-size: 1.5rem;
              font-weight: 950;
              color: #0f172a;
              letter-spacing: -0.04em;
              margin-bottom: 1.5rem;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 1rem;
              text-align: left;
          }
          
          .dark .pub-process {
              color: #f1f5f9;
              border-bottom-color: #1e293b;
          }

          .pub-content {
              font-family: 'Times New Roman', serif;
              font-size: 1.15rem;
              line-height: 1.8;
              color: #334155;
              background: #fdfdfd;
              padding: 2.5rem;
              border-radius: 1.5rem;
              border: 1px dashed #cbd5e1;
              margin-bottom: 2rem;
              text-align: justify;
          }
          
          .dark .pub-content {
              background: #020617;
              color: #94a3b8;
              border-color: #1e293b;
          }

          .pub-analysis {
              background: #f1f5f9;
              padding: 1.5rem 2rem;
              border-radius: 1.25rem;
              font-size: 0.95rem;
              font-weight: 700;
              color: #475569;
              display: flex;
              align-items: center;
              gap: 1rem;
          }
          
          .dark .pub-analysis {
              background: #1e293b;
              color: #cbd5e1;
          }

          .pub-analysis::before {
              content: '📝 Providência:';
              font-weight: 900;
              color: #4f46e5;
              text-transform: uppercase;
              font-size: 0.7rem;
              letter-spacing: 0.1em;
          }

          @media print {
              .no-print { display: none !important; }
              body { background: white !important; }
              .bg-white { background: white !important; border: none !important; box-shadow: none !important; }
              .dje-publication-card { break-inside: avoid; border: 1px solid #eee; margin-bottom: 2rem; }
          }
      `}</style>
    </div>
  );
};
