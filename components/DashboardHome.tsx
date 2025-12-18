import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UsageLimit, Petition, Deadline } from '../types';
import { supabase } from '../services/supabaseClient';
import { 
  FileText, 
  Zap, 
  CheckCircle2,
  Crown,
  Clock,
  AlertTriangle,
  Flame,
  ShieldAlert,
  ChevronRight,
  BookOpen,
  Globe,
  HardDrive,
  ShieldCheck,
  Calendar,
  Infinity,
  Sparkles
} from 'lucide-react';
import { Button } from './ui/Button';

interface DashboardHomeProps {
  profile: UserProfile | null;
  usage: UsageLimit | null;
  onNavigate: (route: string) => void;
}

type WidgetType = 'actions' | 'subscription' | 'deadlines' | 'recents' | 'jurisprudence' | 'portals';

export const DashboardHome: React.FC<DashboardHomeProps> = ({ 
  profile, 
  usage,
  onNavigate
}) => {
  const [recentPetitions, setRecentPetitions] = useState<Petition[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isTrial = profile?.account_status === 'trial';
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profile?.id) return;
      try {
        const { data: petData } = await supabase
          .from('petitions')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(5);

        const { data: deadlineData } = await supabase
          .from('deadlines')
          .select('*')
          .eq('user_id', profile.id)
          .eq('status', 'pending')
          .order('due_date', { ascending: true })
          .limit(5);

        setRecentPetitions((petData as Petition[]) || []);
        setUpcomingDeadlines((deadlineData as Deadline[]) || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [profile?.id]);

  const getDeadlineStyle = (dateStr: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dateStr);
    due.setHours(0,0,0,0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { style: 'bg-rose-50 text-rose-600', label: 'Atrasado' };
    if (diffDays <= 2) return { style: 'bg-rose-50 text-rose-600 font-bold', label: diffDays === 0 ? 'Hoje' : 'Amanhã' };
    if (diffDays <= 5) return { style: 'bg-amber-50 text-amber-600', label: `${diffDays}d` };
    return { style: 'bg-slate-50 text-slate-500', label: due.toLocaleDateString('pt-BR').slice(0, 5) };
  };

  const renderWidget = (type: WidgetType) => {
    switch (type) {
      case 'actions':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
             <button 
                onClick={() => onNavigate('new-petition')}
                className="group relative bg-white rounded-[2.5rem] p-8 text-left transition-all hover:shadow-2xl hover:shadow-indigo-200/50 border border-slate-100 flex flex-col justify-between h-full overflow-hidden"
             >
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-indigo-50 rounded-full opacity-50 blur-3xl transition-all group-hover:scale-150" />
                <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-400 p-4 rounded-2xl w-fit shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform relative z-10">
                    <Sparkles size={28} className="text-white" />
                </div>
                <div className="mt-12 relative z-10">
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Nova Petição</h3>
                    <p className="text-slate-500 mt-2 text-sm font-medium">Criação assistida com IA (Fatos/Resumo)</p>
                </div>
             </button>

             <button 
                onClick={() => onNavigate('new-defense')}
                className="group relative bg-white rounded-[2.5rem] p-8 text-left transition-all hover:shadow-2xl hover:shadow-rose-200/50 border border-slate-100 flex flex-col justify-between h-full overflow-hidden"
             >
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-rose-50 rounded-full opacity-50 blur-3xl transition-all group-hover:scale-150" />
                <div className="bg-slate-900 p-4 rounded-2xl w-fit shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform relative z-10">
                    <ShieldAlert size={28} className="text-white" />
                </div>
                <div className="mt-12 relative z-10">
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Contestação</h3>
                    <p className="text-slate-500 mt-2 text-sm font-medium">Defesa técnica a partir do Resumo da Inicial</p>
                </div>
             </button>
          </div>
        );

      case 'subscription':
        const count = usage?.petitions_this_month || 0;
        const countLimit = isTrial ? (usage?.petitions_limit || 5) : 999;
        const countPercent = (count / countLimit) * 100;

        return (
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 h-full flex flex-col">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Status da Conta</h3>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${isTrial ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                        {isTrial ? 'Trial' : 'Pro'}
                    </span>
                </div>
                
                <div className="space-y-6 flex-1">
                    <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-tighter mb-2">
                            <span>Uso Mensal</span>
                            <span>{count}/{countLimit}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5">
                            <div className="h-2 rounded-full bg-slate-900 transition-all duration-1000" style={{ width: `${countPercent}%` }} />
                        </div>
                    </div>
                </div>

                <div className="mt-auto pt-6">
                    {isTrial ? (
                        <Button className="w-full h-12 rounded-2xl bg-indigo-600 text-white font-bold" onClick={() => onNavigate('subscription')}>
                            <Crown size={16} className="mr-2" /> Upgrade para Pro
                        </Button>
                    ) : (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                            <ShieldCheck className="text-green-500" size={20} />
                            <span className="text-sm font-bold text-slate-700">Plano Ativo</span>
                        </div>
                    )}
                </div>
            </div>
        );

      case 'deadlines':
        return (
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Próximos Prazos</h3>
                    <Calendar size={18} className="text-slate-400" />
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px]">
                    {upcomingDeadlines.length > 0 ? (
                        upcomingDeadlines.map(d => {
                            const info = getDeadlineStyle(d.due_date);
                            return (
                                <div key={d.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                                    <span className="text-sm font-bold text-slate-900 truncate mr-2">{d.title}</span>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${info.style}`}>{info.label}</span>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-10">
                            <CheckCircle2 size={32} className="mx-auto text-slate-200 mb-2" />
                            <p className="text-xs text-slate-400 font-medium">Nenhum prazo</p>
                        </div>
                    )}
                </div>
            </div>
        );

      case 'recents':
        return (
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 h-full flex flex-col mt-6">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Últimos Documentos</h3>
                    <button onClick={() => onNavigate('my-petitions')} className="text-indigo-600 text-xs font-bold hover:underline uppercase tracking-widest">Ver Todos</button>
                </div>
                <div className="divide-y divide-slate-100">
                    {recentPetitions.length > 0 ? (
                        recentPetitions.map((pet) => (
                            <div 
                                key={pet.id} 
                                className="py-5 flex items-center justify-between group cursor-pointer hover:px-2 transition-all"
                                onClick={() => onNavigate('my-petitions')}
                            >
                                <div className="flex items-center gap-5">
                                    <div className="p-3 rounded-2xl bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        <FileText size={22} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{pet.action_type || 'Petição Inicial'}</p>
                                        <p className="text-xs text-slate-400 font-medium mt-0.5">{pet.plaintiff_name} vs {pet.defendant_name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-bold text-slate-300">{new Date(pet.created_at).toLocaleDateString()}</span>
                                    <ChevronRight size={16} className="text-slate-200 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="py-10 text-center text-slate-400 text-sm">Nenhum documento gerado ainda.</p>
                    )}
                </div>
            </div>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/50 backdrop-blur-md p-8 rounded-[3rem] border border-white">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Olá, Dr(a). {profile?.full_name?.split(' ')[0]}</h1>
          <p className="text-slate-500 font-medium mt-1">Sua advocacia inteligente está pronta para hoje.</p>
        </div>
        <div className="flex gap-4">
            <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                <Clock size={16} className="text-indigo-500" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">{renderWidget('actions')}</div>
        <div className="lg:col-span-1">{renderWidget('subscription')}</div>
        <div className="lg:col-span-1">{renderWidget('deadlines')}</div>
        <div className="lg:col-span-1">
            <div className="bg-indigo-600 rounded-[2.5rem] p-8 h-full text-white relative overflow-hidden group cursor-pointer" onClick={() => onNavigate('jurisprudence')}>
                <div className="absolute right-0 top-0 p-4 opacity-20 transform group-hover:scale-125 transition-transform"><BookOpen size={120} /></div>
                <h3 className="text-xl font-bold mb-2 relative z-10">Pesquisa Jurídica</h3>
                <p className="text-indigo-100 text-sm font-medium relative z-10">Busque julgados com auxílio da IA em todos os tribunais.</p>
                <div className="mt-8 relative z-10 flex items-center gap-2 font-bold text-sm">Acessar agora <ChevronRight size={16} /></div>
            </div>
        </div>
        <div className="lg:col-span-1">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 h-full flex flex-col group cursor-pointer" onClick={() => onNavigate('portals')}>
                <div className="flex items-center gap-4 mb-4">
                    <div className="bg-slate-100 p-3 rounded-2xl text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-colors"><Globe size={24} /></div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Sistemas Judiciais</h3>
                </div>
                <p className="text-sm text-slate-500 font-medium">Links diretos para PJe, e-SAJ, E-proc e instaladores de token.</p>
                <div className="mt-auto pt-6 text-xs font-bold text-slate-300 group-hover:text-slate-900 transition-colors uppercase tracking-widest flex items-center gap-1">Ver tribunais <ChevronRight size={14}/></div>
            </div>
        </div>
        <div className="lg:col-span-3">{renderWidget('recents')}</div>
      </div>
    </div>
  );
};