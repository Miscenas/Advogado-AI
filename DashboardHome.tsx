
import React, { useState, useEffect } from 'react';
import { UserProfile, UsageLimit, Petition, Deadline } from '../types';
import { supabase } from '../services/supabaseClient';
import { 
  FileText, 
  ChevronRight,
  BookOpen,
  Calendar,
  Sparkles,
  SearchCode,
  ArrowUpRight,
  Newspaper,
  ShieldCheck,
  Files,
  Clock,
  History,
  Scale
} from 'lucide-react';

interface DashboardHomeProps {
  profile: UserProfile | null;
  usage: UsageLimit | null;
  onNavigate: (route: string) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ 
  profile, 
  usage,
  onNavigate
}) => {
  const [recentPetitions, setRecentPetitions] = useState<Petition[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Deadline[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return;
      const { data: petData } = await supabase
        .from('petitions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(4);
      
      const { data: deadData } = await supabase
        .from('deadlines')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(3);

      setRecentPetitions(petData || []);
      setUpcomingDeadlines(deadData || []);
    };
    fetchData();
  }, [profile?.id]);

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 max-w-7xl mx-auto w-full pb-20">
      {/* Header Executivo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/60 dark:border-slate-800">
        <div className="space-y-1 text-left">
          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.5em]">Ambiente Jurídico Digital v2.6</p>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">Dr(a). {profile?.full_name?.split(' ')[0] || 'Advogado'}</h1>
        </div>
        <div className="flex items-center gap-3">
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
                <ShieldCheck className="text-slate-400 dark:text-slate-500" size={16} />
                <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Acesso Criptografado</span>
            </div>
        </div>
      </div>

      {/* Grid de Ferramentas - Padronizado com escrita sênior */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Peticionamento Estratégico */}
        <button onClick={() => onNavigate('new-petition')} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-start gap-4 hover:shadow-xl hover:border-indigo-600 dark:hover:border-indigo-500 transition-all group text-left">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
              <Sparkles size={24} />
            </div>
            <div>
              <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-tight">Peticionamento Estratégico</h4>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-1">Redação técnica de alta complexidade com suporte a extração via OCR.</p>
            </div>
        </button>

        {/* Pesquisa Jurisprudencial */}
        <button onClick={() => onNavigate('jurisprudence')} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-start gap-4 hover:shadow-xl hover:border-blue-600 dark:hover:border-blue-500 transition-all group text-left">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
              <BookOpen size={24} />
            </div>
            <div>
              <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-tight">Análise Jurisprudencial</h4>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-1">Busca avançada de precedentes com sumarização analítica via Inteligência Artificial.</p>
            </div>
        </button>

        {/* Metadados CNJ */}
        <button onClick={() => onNavigate('cnj-metadata')} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-start gap-4 hover:shadow-xl hover:border-slate-900 dark:hover:border-slate-500 transition-all group text-left">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl group-hover:bg-slate-900 dark:group-hover:bg-slate-700 group-hover:text-white transition-all shadow-sm">
              <SearchCode size={24} />
            </div>
            <div>
              <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-tight">Metadados Processuais</h4>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-1">Decomposição estrutural conforme Tabelas Processuais Unificadas do CNJ.</p>
            </div>
        </button>

        {/* Monitoramento DJE */}
        <button onClick={() => onNavigate('dje-search')} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-start gap-4 hover:shadow-xl hover:border-purple-600 dark:hover:border-purple-500 transition-all group text-left">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
              <Newspaper size={24} />
            </div>
            <div>
              <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-tight">Monitoramento DJE</h4>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-1">Varredura automatizada e análise de intimações nos Diários Oficiais.</p>
            </div>
        </button>

        {/* Cálculos Laborais */}
        <button onClick={() => onNavigate('labor-calculator')} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-start gap-4 hover:shadow-xl hover:border-emerald-600 dark:hover:border-emerald-500 transition-all group text-left">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
              <Scale size={24} />
            </div>
            <div>
              <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-tight">Cálculos Laborais</h4>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-1">Memória de cálculo rescisório auditada conforme normas vigentes.</p>
            </div>
        </button>

        {/* Acervo Jurídico */}
        <button onClick={() => onNavigate('my-petitions')} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-start gap-4 hover:shadow-xl hover:border-amber-600 dark:hover:border-amber-500 transition-all group text-left">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm">
              <Files size={24} />
            </div>
            <div>
              <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-tight">Acervo de Minutas</h4>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-1">Gestão centralizada de peças processuais e documentos produzidos.</p>
            </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Seção de Petições Recentes */}
        <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                    <History size={20} className="text-indigo-600 dark:text-indigo-400" /> Atividades Recentes
                </h3>
                <button onClick={() => onNavigate('my-petitions')} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline">Ver Histórico Completo</button>
            </div>
            
            <div className="space-y-4">
                {recentPetitions.length > 0 ? recentPetitions.map(pet => (
                    <div 
                      key={pet.id} 
                      onClick={() => onNavigate('my-petitions')}
                      className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-indigo-600 transition-all cursor-pointer"
                    >
                        <div className="flex items-center gap-5">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <FileText size={20} />
                            </div>
                            <div className="text-left">
                                <h4 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-tight mb-0.5">{pet.action_type}</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold truncate max-w-[200px] md:max-w-md">{pet.plaintiff_name || 'Polo Ativo'} <span className="text-slate-300 dark:text-slate-700 mx-1">vs</span> {pet.defendant_name || 'Polo Passivo'}</p>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={12}/> {new Date(pet.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                )) : (
                    <div className="py-12 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center opacity-40">
                        <Files size={32} className="text-slate-300 dark:text-slate-700 mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest dark:text-slate-600">Nenhuma minuta registrada no sistema</p>
                    </div>
                )}
            </div>
        </div>

        {/* Agenda Ativa Lateral */}
        <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                <Calendar size={20} className="text-purple-600 dark:text-purple-400" /> Prazos Prioritários
            </h3>
            <div className="bg-[#0F172A] dark:bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex flex-col min-h-[400px]">
                <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 flex-1 space-y-4">
                    {upcomingDeadlines.length > 0 ? upcomingDeadlines.map(d => (
                        <div key={d.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all">
                            <div className="text-left">
                                <p className="text-[10px] font-black text-white uppercase tracking-tight truncate max-w-[140px]">{d.title}</p>
                                <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest mt-1">Vencimento: {new Date(d.due_date).toLocaleDateString()}</p>
                            </div>
                            <ArrowUpRight size={14} className="text-white/20 group-hover:text-purple-400 transition-colors" />
                        </div>
                    )) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-20">
                            <Calendar size={32} className="mb-4" />
                            <p className="text-[9px] font-black uppercase tracking-widest">Sem compromissos agendados na pauta</p>
                        </div>
                    )}
                </div>
                <button onClick={() => onNavigate('deadlines')} className="mt-8 w-full py-4 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] transition-all relative z-10 border border-white/10">
                    Acessar Pauta Completa
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
