
import React, { useState, useEffect } from 'react';
import { UserProfile, UsageLimit, Petition, Deadline } from '../types';
import { supabase } from '../services/supabaseClient';
import { 
  FileText, 
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
  Scale,
  CheckCircle2,
  GripHorizontal
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
        .limit(10);

      setRecentPetitions(petData || []);
      setUpcomingDeadlines(deadData || []);
    };
    fetchData();
  }, [profile?.id]);

  const formatName = (name: string | null | undefined) => {
    if (!name) return 'Advogado';
    const first = name.split(' ')[0];
    if (first.toLowerCase().startsWith('dr')) {
      return name;
    }
    return `Dr(a). ${first}`;
  };

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in duration-1000 max-w-[1600px] mx-auto w-full pb-20 text-left px-2">
      {/* Header Original */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/60 dark:border-slate-800 transition-colors">
        <div className="space-y-1 text-left">
          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.5em]">Sistema JurisPet v2.6</p>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">
            {formatName(profile?.full_name)}
          </h1>
        </div>
        <div className="flex items-center gap-3">
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm transition-colors shrink-0">
                <ShieldCheck className="text-slate-400 dark:text-slate-500 w-4 h-4 md:w-5 md:h-5" />
                <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Acesso Seguro</span>
            </div>
        </div>
      </div>

      {/* Grid Principal do Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10 items-start">
        
        {/* COLUNA ESQUERDA: Prazos */}
        <div className="lg:col-span-4 xl:col-span-3">
            <div className="bg-white dark:bg-slate-900 p-6 md:p-7 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col h-[380px] min-h-[320px] max-h-[700px] transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                <div className="flex items-center gap-2 mb-4 shrink-0 px-1">
                    <Calendar className="text-purple-600 dark:text-purple-400 w-4 h-4" />
                    <h3 className="text-xs font-black text-slate-900 dark:text-white tracking-widest uppercase">Próximos Prazos</h3>
                </div>

                <div className="relative z-10 flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar text-left">
                    {upcomingDeadlines.length > 0 ? upcomingDeadlines.map(d => (
                        <div key={d.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-purple-500 transition-all shadow-sm min-h-[50px]">
                            <div className="text-left min-w-0 flex-1 mr-2">
                                <p className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-tight truncate">{d.title}</p>
                                <p className="text-[8px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mt-0.5">Vence em {new Date(d.due_date).toLocaleDateString()}</p>
                            </div>
                            <ArrowUpRight className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors shrink-0" />
                        </div>
                    )) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-10">
                            <Calendar size={24} className="mb-3 text-slate-300 dark:text-slate-600" />
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Nenhum prazo para hoje</p>
                        </div>
                    )}
                </div>

                <div className="relative z-10 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 no-print">
                    <button onClick={() => onNavigate('deadlines')} className="w-full py-3 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-600 dark:hover:bg-indigo-500 text-slate-600 dark:text-slate-300 hover:text-white dark:hover:text-white rounded-2xl font-black uppercase text-[8px] tracking-[0.2em] transition-all border border-slate-200 dark:border-slate-700 shadow-sm">
                        Ver Agenda de Prazos
                    </button>
                    <div className="flex justify-center mt-2 opacity-20 pointer-events-none shrink-0 text-slate-400">
                        <GripHorizontal size={14} />
                    </div>
                </div>
            </div>
        </div>

        {/* COLUNA DIREITA: Ferramentas */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-10">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                <button onClick={() => onNavigate('new-petition')} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-start gap-4 hover:shadow-xl hover:border-indigo-600 dark:hover:border-indigo-500 transition-all group text-left min-h-[160px] h-full">
                    <div className="p-3 md:p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm shrink-0">
                    <FileText className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                    <div className="flex-1">
                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-tight">Nova Petição</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-1 break-words">Crie petições do zero ou a partir de um PDF.</p>
                    </div>
                </button>

                <button onClick={() => onNavigate('jurisprudence')} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-start gap-4 hover:shadow-xl hover:border-blue-600 dark:hover:border-blue-500 transition-all group text-left min-h-[160px] h-full">
                    <div className="p-3 md:p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm shrink-0">
                    <BookOpen className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                    <div className="flex-1">
                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-tight">Jurisprudência</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-1 break-words">Pesquisa avançada com análise de IA.</p>
                    </div>
                </button>

                <button onClick={() => onNavigate('cnj-metadata')} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-start gap-4 hover:shadow-xl hover:border-slate-900 dark:hover:border-slate-500 transition-all group text-left min-h-[160px] h-full">
                    <div className="p-3 md:p-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl group-hover:bg-slate-900 dark:group-hover:bg-slate-700 group-hover:text-white transition-all shadow-sm shrink-0">
                    <SearchCode className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                    <div className="flex-1">
                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-tight">Metadados CNJ</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-1 break-words">Decomposição e árvore TPU oficial.</p>
                    </div>
                </button>

                <button onClick={() => onNavigate('dje-search')} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-start gap-4 hover:shadow-xl hover:border-purple-600 dark:hover:border-purple-500 transition-all group text-left min-h-[160px] h-full">
                    <div className="p-3 md:p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm shrink-0">
                    <Newspaper className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                    <div className="flex-1">
                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-tight">Consulta DJE</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-1 break-words">Monitoramento de intimações diárias.</p>
                    </div>
                </button>

                <button onClick={() => onNavigate('labor-calculator')} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-start gap-4 hover:shadow-xl hover:border-emerald-600 dark:hover:border-emerald-500 transition-all group text-left min-h-[160px] h-full">
                    <div className="p-3 md:p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm shrink-0">
                    <Scale className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                    <div className="flex-1">
                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-tight">Calculadora Trabalhista</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-1 break-words">Demonstrativo de rescisão auditado.</p>
                    </div>
                </button>

                <button onClick={() => onNavigate('my-petitions')} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-start gap-4 hover:shadow-xl hover:border-amber-600 dark:hover:border-amber-500 transition-all group text-left min-h-[160px] h-full">
                    <div className="p-3 md:p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm shrink-0">
                    <Files className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                    <div className="flex-1">
                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-tight">Minhas Petições</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-1 break-words">Gerencie seu histórico de peças.</p>
                    </div>
                </button>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                        <History className="text-indigo-600 dark:text-indigo-400 w-5 h-5 md:w-6 md:h-6" /> Histórico Recente
                    </h3>
                    <button onClick={() => onNavigate('my-petitions')} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline shrink-0">Ver Tudo</button>
                </div>
                
                <div className="space-y-4">
                    {recentPetitions.length > 0 ? recentPetitions.map(pet => (
                        <div 
                        key={pet.id} 
                        onClick={() => onNavigate('my-petitions')}
                        className={`p-5 md:p-6 rounded-[2rem] border transition-all flex items-center justify-between group cursor-pointer shadow-sm min-h-[90px] ${pet.filed ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-900/10' : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-500'}`}
                        >
                            <div className="flex items-center gap-4 md:gap-5 min-w-0 flex-1">
                                <div className={`p-2.5 md:p-3 rounded-xl transition-all shrink-0 ${pet.filed ? 'bg-emerald-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white'}`}>
                                    <FileText className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                                <div className="text-left min-w-0 flex-1">
                                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-tight mb-0.5 truncate">{pet.action_type}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold truncate">
                                        {pet.plaintiff_name || 'Autor'} <span className="text-slate-300 dark:text-slate-700 mx-1">vs</span> {pet.defendant_name || 'Réu'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right shrink-0 flex flex-col items-end gap-1 ml-4">
                                {pet.filed && (
                                    <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full mb-1">
                                        <CheckCircle2 size={10} /> Protocolado
                                    </span>
                                )}
                                <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={12}/> {new Date(pet.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    )) : (
                        <div className="py-12 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-50 dark:border-slate-800 flex flex-col items-center justify-center opacity-40 transition-colors w-full">
                            <Files size={32} className="text-slate-300 dark:text-slate-700 mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-widest dark:text-slate-600 text-center">Nenhuma petição encontrada</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
