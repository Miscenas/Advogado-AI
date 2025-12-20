
import { BookOpen, Calendar, ExternalLink, Loader2, Scale, Search, Printer, Copy, Trash2, CheckCircle2, ArrowRight, RefreshCcw, Filter, Globe } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { searchJurisprudence } from '../services/aiService';
import { SavedJurisprudence } from '../types';
import { supabase } from '../services/supabaseClient';
import { Button } from './ui/Button';

interface JurisprudenceSearchProps {
  userId: string;
}

export const JurisprudenceSearch: React.FC<JurisprudenceSearchProps> = ({ userId }) => {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'geral' | 'federal' | 'estadual'>('geral');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [savedItems, setSavedItems] = useState<SavedJurisprudence[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchSaved();
  }, [userId]);

  const fetchSaved = async () => {
    try {
      const { data } = await supabase
        .from('saved_jurisprudence')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (data) setSavedItems(data as SavedJurisprudence[]);
    } catch (e) {
      console.warn("Table saved_jurisprudence might not exist yet.");
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
       const htmlResult = await searchJurisprudence(query, scope);
       setResult(htmlResult);
    } catch (error) {
       console.error(error);
    } finally {
       setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const plainText = result.replace(/<[^>]*>/g, '');
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Deseja apagar este histórico?")) return;
      await supabase.from('saved_jurisprudence').delete().eq('id', id);
      setSavedItems(prev => prev.filter(i => i.id !== id));
  };

  const resetSearch = () => {
      setResult(null);
      setQuery('');
  };

  return (
    <div className="w-full flex flex-col items-stretch justify-start text-left space-y-10 pb-24 animate-in fade-in duration-700">
       <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 dark:border-slate-800 pb-8 w-full ${!result ? 'max-w-5xl mx-auto' : ''}`}>
        <div className="text-left">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Jurisprudência</h1>
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">Inteligência de Precedentes e Súmulas</p>
        </div>
        <div className="bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm shrink-0">
            <Scale className="text-indigo-600 dark:text-indigo-400" size={24} />
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-nowrap">Base de Julgados 2025</span>
        </div>
      </div>

      {!result && !loading && (
        <div className="w-full max-w-5xl mx-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-200 dark:border-slate-800 p-10 md:p-12 relative overflow-hidden group w-full text-left">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-all group-focus-within:bg-indigo-100/50"></div>
            
            <form onSubmit={handleSearch} className="space-y-8 relative z-10 w-full text-left">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 w-full">
                    <div className="lg:col-span-3 space-y-3 text-left">
                        <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Tema Processual / Objeto da Ação</label>
                        <div className="relative">
                            <Search className="absolute left-6 top-6 text-slate-300 dark:text-slate-600 w-6 h-6" />
                            <input 
                                type="text" 
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Ex: Responsabilidade Civil Danos Morais Voo"
                                className="w-full h-20 pl-16 pr-8 rounded-[1.8rem] border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-8 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 transition-all font-black text-slate-900 dark:text-white text-lg outline-none"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-3 text-left">
                        <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Filtro de Escopo</label>
                        <div className="relative">
                            <Globe className="absolute left-6 top-6 text-slate-300 dark:text-slate-600 w-6 h-6 z-10 pointer-events-none" />
                            <select 
                                value={scope}
                                onChange={(e) => setScope(e.target.value as any)}
                                className="w-full h-20 pl-16 pr-8 rounded-[1.8rem] border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-600 transition-all font-black text-slate-900 dark:text-white outline-none uppercase text-xs tracking-widest appearance-none"
                            >
                                <option value="geral">Todos os Tribunais</option>
                                <option value="federal">Federais (STJ/STF)</option>
                                <option value="estadual">TJs Estaduais</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end w-full pt-4">
                    <Button type="submit" isLoading={loading} className="h-20 px-16 rounded-[1.8rem] bg-[#0F172A] dark:bg-indigo-600 text-white font-black uppercase text-sm tracking-widest shadow-2xl transition-all active:scale-95 border-none">
                        PESQUISAR PRECEDENTES <ArrowRight className="ml-3" size={20} />
                    </Button>
                </div>
            </form>
          </div>
        </div>
      )}

      {result && (
          <div className="w-full animate-in slide-in-from-bottom-6 duration-500 text-left">
              <div className="bg-white dark:bg-slate-900 rounded-[4rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden w-full">
                  <div className="bg-[#0F172A] px-10 md:px-14 py-10 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 w-full">
                      <div className="flex items-center gap-4 text-left">
                        <BookOpen size={28} className="text-indigo-400" />
                        <h3 className="font-black text-white uppercase text-sm tracking-[0.25em]">Relatório Técnico de Jurisprudência</h3>
                      </div>
                      <div className="flex gap-3 no-print shrink-0">
                        <button onClick={resetSearch} className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all font-black uppercase text-[10px] tracking-widest mr-4 border border-white/10">
                            <RefreshCcw size={16} /> Nova Pesquisa
                        </button>
                        <button onClick={handleCopy} className="p-4 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all border border-white/10" title="Copiar Texto">
                            {copied ? <CheckCircle2 size={22} className="text-emerald-400" /> : <Copy size={22} />}
                        </button>
                        <button onClick={() => window.print()} className="p-4 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all border border-white/10" title="Imprimir Relatório">
                            <Printer size={22} />
                        </button>
                      </div>
                  </div>
                  <div className="p-10 md:p-20 w-full text-left bg-white dark:bg-slate-950/20">
                      <div 
                        className="prose max-w-none text-slate-800 dark:text-slate-200 juris-dynamic-render w-full text-left"
                        dangerouslySetInnerHTML={{ __html: result }}
                      />
                  </div>
              </div>
          </div>
      )}

      {loading && (
          <div className="py-32 flex flex-col items-center justify-center w-full animate-in zoom-in-95">
              <Loader2 className="h-20 w-20 text-indigo-600 animate-spin mb-8" />
              <p className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-[0.3em] text-sm">Mapeando Precedentes nos Tribunais...</p>
          </div>
      )}

      {savedItems.length > 0 && !result && !loading && (
          <div className="w-full flex flex-col items-stretch space-y-10 pt-16 text-left max-w-5xl mx-auto">
             <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Histórico de Inteligência</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                 {savedItems.map(item => (
                     <div key={item.id} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-500 hover:shadow-2xl transition-all cursor-pointer group flex flex-col justify-between h-full text-left" onClick={() => setResult(item.result)}>
                        <div className="text-left">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm">
                                    <BookOpen size={24} />
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-2 text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                            <h4 className="font-black text-slate-800 dark:text-slate-200 uppercase text-sm tracking-tight line-clamp-2 mb-4">"{item.query}"</h4>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase flex items-center gap-2"><Calendar size={14} /> {new Date(item.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="mt-8 flex items-center justify-between w-full">
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Visualizar Relatório</span>
                            <ExternalLink size={18} className="text-slate-300 dark:text-slate-700 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                        </div>
                     </div>
                 ))}
             </div>
          </div>
      )}

      <style>{`
          .juris-dynamic-render {
              font-family: 'Inter', sans-serif;
              width: 100% !important;
              text-align: left;
          }
          
          .legal-analysis-header {
              background: #f8fafc;
              border-left: 8px solid #4f46e5;
              padding: 3.5rem;
              border-radius: 2.5rem;
              margin-bottom: 4rem;
              font-style: italic;
              color: #1e293b;
              font-size: 1.25rem;
              line-height: 1.8;
              text-align: left;
              width: 100%;
          }

          .dark .legal-analysis-header {
              background: #0f172a;
              border-left-color: #6366f1;
              color: #cbd5e1;
          }

          .juris-card {
              background: white;
              border: 1px solid #e2e8f0;
              border-radius: 3rem;
              padding: 3.5rem;
              margin-bottom: 3rem;
              transition: all 0.3s;
              position: relative;
              text-align: left;
              width: 100%;
          }

          .dark .juris-card {
              background: #020617;
              border-color: #1e293b;
          }

          .court-badge {
              display: inline-block;
              background: #0f172a;
              color: white;
              padding: 0.5rem 1.5rem;
              border-radius: 1rem;
              font-size: 0.75rem;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.2em;
              margin-bottom: 2rem;
          }

          .dark .court-badge {
              background: #1e293b;
              color: #818cf8;
          }

          .ementa {
              font-family: 'Times New Roman', serif;
              font-size: 1.15rem;
              line-height: 1.8;
              color: #475569;
              background: #fdfdfd;
              padding: 2.5rem;
              border-radius: 1.5rem;
              border: 1px dashed #cbd5e1;
              margin-bottom: 2.5rem;
              text-align: justify;
          }

          .dark .ementa {
              background: #0f172a;
              color: #94a3b8;
              border-color: #1e293b;
          }

          .sumulas-box {
              background: #0f172a;
              color: white;
              padding: 5rem;
              border-radius: 4rem;
              margin-top: 6rem;
              text-align: left;
              width: 100%;
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
