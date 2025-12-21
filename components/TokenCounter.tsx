
import React, { useState, useEffect } from 'react';
import { 
  Hash, 
  Cpu, 
  Info, 
  Trash2, 
  Zap, 
  Brain,
  Copy,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Button } from './ui/Button';

export const TokenCounter: React.FC = () => {
  const [text, setText] = useState('');
  const [tokens, setTokens] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const countTokens = async () => {
    if (!text.trim()) {
      setTokens(0);
      return;
    }
    
    setLoading(true);
    try {
      const apiKey = process.env.API_KEY;
      const cleanKey = (apiKey === 'undefined' || !apiKey) ? '' : apiKey;
      const ai = new GoogleGenAI({ apiKey: cleanKey });
      const model = 'gemini-3-flash-preview'; 
      
      const result = await ai.models.countTokens({
        model: model,
        contents: [{ role: 'user', parts: [{ text }] }],
      });
      
      setTokens(result.totalTokens);
    } catch (error) {
      console.error("Erro ao contar tokens:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (text) countTokens();
      else setTokens(0);
    }, 1000);
    return () => clearTimeout(timer);
  }, [text]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getIntensity = () => {
    if (!tokens) return 'bg-slate-200 dark:bg-slate-800';
    if (tokens < 5000) return 'bg-emerald-500';
    if (tokens < 15000) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 text-left pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div className="text-left">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Contador de Tokens</h1>
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">Métrica de Processamento Gemini AI</p>
        </div>
        <div className="bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm shrink-0">
            <Cpu className="text-indigo-600 dark:text-indigo-400" size={24} />
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-nowrap">Tokenizador Nativo Google</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-slate-50 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30">
                    <div className="flex items-center gap-2">
                        <FileText size={18} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Documento ou Instrução</span>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleCopy}
                            className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-all bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm"
                            title="Copiar Texto"
                        >
                            {copied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                        </button>
                        <button 
                            onClick={() => setText('')}
                            className="p-2.5 text-slate-400 hover:text-rose-500 transition-all bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm"
                            title="Limpar"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
                <textarea 
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Cole aqui o texto da petição, jurisprudência ou prompt para medir o tamanho do processamento..."
                    className="flex-1 w-full p-8 md:p-10 bg-transparent text-slate-700 dark:text-slate-200 font-medium text-sm md:text-base leading-relaxed focus:ring-0 outline-none resize-none placeholder:text-slate-300 dark:placeholder:text-slate-700 custom-scrollbar"
                />
            </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0F172A] dark:bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col gap-8 group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-all duration-1000"></div>
                
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-indigo-400 mb-2">
                        <Hash size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Total de Tokens</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-6xl font-black tracking-tighter tabular-nums">
                            {loading ? '...' : tokens?.toLocaleString() || '0'}
                        </h2>
                        {loading && <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></div>}
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Caracteres</span>
                        <span className="font-black tabular-nums">{text.length.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Palavras Est.</span>
                        <span className="font-black tabular-nums">{text.trim() ? text.trim().split(/\s+/).length.toLocaleString() : '0'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complexidade</span>
                        <div className={`h-2 w-20 rounded-full overflow-hidden bg-slate-800`}>
                            <div 
                                className={`h-full transition-all duration-1000 ${getIntensity()}`} 
                                style={{ width: `${Math.min(100, (tokens || 0) / 300)}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-4 p-5 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-4">
                    <Zap size={18} className="text-amber-400 shrink-0" />
                    <p className="text-[10px] font-medium text-slate-400 leading-relaxed italic">
                        No Gemini, 1 token equivale a aproximadamente 4 caracteres em português. Textos jurídicos densos tendem a gerar mais tokens por palavra.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
