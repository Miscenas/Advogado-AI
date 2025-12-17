import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UsageLimit, Petition, Deadline } from '../types';
import { supabase } from '../services/supabaseClient';
import { 
  FileText, 
  AlertCircle, 
  Zap, 
  CheckCircle2,
  X,
  Crown,
  Clock,
  AlertTriangle,
  Flame,
  ShieldAlert,
  GripHorizontal,
  Plus,
  Settings2,
  Layout,
  Undo2,
  ChevronRight,
  BookOpen,
  Globe,
  HardDrive,
  ShieldCheck
} from 'lucide-react';
import { Button } from './ui/Button';

interface DashboardHomeProps {
  profile: UserProfile | null;
  usage: UsageLimit | null;
  onNavigate: (route: string) => void;
}

type WidgetType = 'actions' | 'subscription' | 'deadlines' | 'recents' | 'jurisprudence' | 'portals';

interface DashboardWidget {
  id: WidgetType;
  title: string;
  defaultColSpan: number; // 1, 2 or 3
}

const ALL_WIDGETS: DashboardWidget[] = [
  { id: 'actions', title: 'Ações Rápidas', defaultColSpan: 1 },
  { id: 'portals', title: 'Portais da Justiça', defaultColSpan: 1 },
  { id: 'jurisprudence', title: 'Jurisprudência Rápida', defaultColSpan: 1 },
  { id: 'subscription', title: 'Uso e Plano', defaultColSpan: 1 },
  { id: 'deadlines', title: 'Próximos Prazos', defaultColSpan: 1 },
  { id: 'recents', title: 'Últimas Petições', defaultColSpan: 3 }, // Full width usually
];

export const DashboardHome: React.FC<DashboardHomeProps> = ({ 
  profile, 
  usage,
  onNavigate
}) => {
  const [recentPetitions, setRecentPetitions] = useState<Petition[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Customization State
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>(['actions', 'portals', 'jurisprudence', 'subscription', 'deadlines', 'recents']);
  const [hiddenWidgets, setHiddenWidgets] = useState<WidgetType[]>([]);

  // Drag & Drop Refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const isTrial = profile?.account_status === 'trial';
  const isAdmin = profile?.role === 'admin';

  // Load Layout Preference
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboard_layout_v3');
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout);
        setActiveWidgets(parsed.active);
        setHiddenWidgets(parsed.hidden);
      } catch (e) {
        console.error("Erro ao carregar layout", e);
      }
    }
  }, []);

  // Fetch Data
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

        const today = new Date().toISOString().split('T')[0];
        const { data: deadlineData } = await supabase
          .from('deadlines')
          .select('*')
          .eq('user_id', profile.id)
          .eq('status', 'pending')
          .gte('due_date', today)
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

  const saveLayout = (active: WidgetType[], hidden: WidgetType[]) => {
    localStorage.setItem('dashboard_layout_v3', JSON.stringify({ active, hidden }));
    setActiveWidgets(active);
    setHiddenWidgets(hidden);
  };

  // Helpers
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(2) + ' MB';
  };

  // --- Renderers for Each Widget Type ---

  const renderWidgetContent = (type: WidgetType) => {
    switch (type) {
      case 'actions':
        return (
          <div className="h-full flex flex-col gap-3">
             <button 
                onClick={() => onNavigate('new-petition')}
                className="flex-1 bg-gradient-to-br from-juris-800 to-juris-900 hover:from-juris-700 hover:to-juris-800 text-white rounded-lg p-4 text-left transition-all shadow-md group relative overflow-hidden"
             >
                <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
                    <Zap size={80} />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="bg-white/20 w-fit p-2 rounded-lg mb-2 group-hover:scale-110 transition-transform">
                        <Zap size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Nova Petição</h3>
                        <p className="text-juris-200 text-xs">Iniciar do zero ou upload</p>
                    </div>
                </div>
             </button>

             <button 
                onClick={() => onNavigate('new-defense')}
                className="flex-1 bg-white border border-red-200 hover:border-red-400 hover:bg-red-50 text-red-900 rounded-lg p-4 text-left transition-all shadow-sm group relative overflow-hidden"
             >
                <div className="absolute right-0 top-0 opacity-5 transform translate-x-2 -translate-y-2">
                    <ShieldAlert size={80} className="text-red-600" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="bg-red-100 w-fit p-2 rounded-lg mb-2 text-red-600 group-hover:scale-110 transition-transform">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Nova Contestação</h3>
                        <p className="text-red-700/70 text-xs">Defesa e contra-argumentação</p>
                    </div>
                </div>
             </button>
          </div>
        );

      case 'subscription':
        if (isAdmin) {
            return (
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-sm border border-gray-700 p-6 flex flex-col relative overflow-hidden h-full text-white">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ShieldCheck size={100} className="text-white" />
                    </div>
                    <div className="relative z-10 flex-1 flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="text-2xl font-bold">Acesso Total</h3>
                        </div>
                        <div className="mb-4 text-sm text-gray-300">
                            <p>Você é um <strong>Administrador</strong>.</p>
                            <p className="mt-2">Limites de petições e armazenamento estão desativados para sua conta.</p>
                        </div>
                        <div className="mt-auto flex items-center gap-2 text-green-400 bg-white/10 p-3 rounded-lg border border-white/20">
                            <CheckCircle2 size={20} />
                            <span className="font-medium text-sm">Uso Ilimitado Ativo.</span>
                        </div>
                    </div>
                </div>
            );
        }

        // Lógica Híbrida de Exibição
        const count = usage?.petitions_this_month || 0;
        const countLimit = isTrial ? (usage?.petitions_limit || 5) : 100;
        const countPercent = Math.min(100, (count / countLimit) * 100);

        const storage = usage?.used_storage_bytes || 0;
        const storageLimit = usage?.storage_limit_bytes || 52428800;
        const storagePercent = Math.min(100, (storage / storageLimit) * 100);

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <HardDrive size={100} className="text-juris-900" />
                </div>
                <div className="relative z-10 flex-1 flex flex-col">
                    <p className="text-sm font-medium text-gray-500 mb-1">Seu Plano</p>
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className={`text-2xl font-bold capitalize ${isTrial ? 'text-gray-900' : 'text-green-600'}`}>
                            {isTrial ? 'Gratuito' : 'Plano Pro'}
                        </h3>
                    </div>
                    
                    {/* Barra de Quantidade (Sempre visível para todos os tipos não-admin) */}
                    <div className="mb-3">
                        <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                            <span>Petições: {count} / {countLimit}</span>
                            <span>Mensal</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div 
                                className={`h-2.5 rounded-full ${countPercent > 80 ? 'bg-amber-500' : 'bg-juris-600'}`} 
                                style={{ width: `${countPercent}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Barra de Armazenamento (Visível para PRO ou se > 0 no trial) */}
                    <div className="mb-4">
                        <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                            <span>Armazenamento: {formatBytes(storage)}</span>
                            <span>{formatBytes(storageLimit)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div 
                                className={`h-2.5 rounded-full ${storagePercent > 90 ? 'bg-red-500' : 'bg-green-600'}`} 
                                style={{ width: `${storagePercent}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Avisos */}
                    {(countPercent >= 100 || storagePercent >= 100) && (
                        <p className="text-xs text-red-500 font-semibold mb-2 flex items-center gap-1">
                            <AlertTriangle size={12} /> Limite operacional atingido!
                        </p>
                    )}

                    {isTrial ? (
                        <div className="mt-auto space-y-3">
                            <Button className="w-full bg-juris-900 hover:bg-juris-800 h-9 text-sm" onClick={() => onNavigate('subscription')}>
                                <Crown size={14} className="mr-2" /> Fazer Upgrade (R$ 60,00)
                            </Button>
                        </div>
                    ) : (
                        <div className="mt-auto flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-100">
                            <CheckCircle2 size={20} />
                            <span className="font-medium text-sm">Assinatura Ativa.</span>
                        </div>
                    )}
                </div>
            </div>
        );

        case 'portals': return (
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col relative overflow-hidden h-full group">
                <div className="relative z-10 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="bg-gray-100 p-2 rounded-lg text-gray-700"><Globe size={24} /></div>
                        <h3 className="text-lg font-bold text-gray-900">Portais da Justiça</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Acesso rápido aos sistemas e downloads.</p>
                    <div className="mt-auto"><Button onClick={() => onNavigate('portals')} variant="outline" className="w-full justify-between">Acessar Lista <ChevronRight size={16} /></Button></div>
                </div>
            </div>
        );
        case 'jurisprudence': return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col relative overflow-hidden h-full group">
                <div className="relative z-10 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-700"><BookOpen size={24} /></div>
                        <h3 className="text-lg font-bold text-gray-900">Pesquisa Jurídica</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Busque julgados com auxílio da IA.</p>
                    <div className="mt-auto"><Button onClick={() => onNavigate('jurisprudence')} variant="outline" className="w-full justify-between">Pesquisar <ChevronRight size={16} /></Button></div>
                </div>
            </div>
        );
        case 'deadlines': return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm"><AlertCircle size={16} className="text-gray-500" /> Próximos Prazos</h3>
                    <Button variant="ghost" size="sm" onClick={() => onNavigate('deadlines')} className="h-6 text-xs px-2">Ver todos</Button>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[300px] p-4">
                    {upcomingDeadlines.length > 0 ? (
                        <div className="space-y-2">
                            {upcomingDeadlines.map(d => (
                                <div key={d.id} className="p-2 bg-gray-50 rounded border flex justify-between">
                                    <span className="text-sm truncate w-24">{d.title}</span>
                                    <span className="text-xs text-gray-500">{new Date(d.due_date).toLocaleDateString()}</span>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-xs text-center text-gray-400">Sem prazos urgentes.</p>}
                </div>
            </div>
        );
        case 'recents': return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                   <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Clock size={18} className="text-gray-400" /> Últimas Petições</h3>
                </div>
                <div className="flex-1 p-0 overflow-hidden min-h-[200px]">
                   {loading ? (
                       <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-juris-900"></div></div>
                   ) : recentPetitions.length > 0 ? (
                       <div className="divide-y divide-gray-100">
                          {recentPetitions.map((petition) => (
                              <div key={petition.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer" onClick={() => onNavigate('my-petitions')}>
                                  <div className="flex items-center gap-4">
                                      <div className={`p-2 rounded-lg ${petition.filed ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}><FileText size={20} /></div>
                                      <div>
                                          <p className="font-medium text-gray-900 text-sm">{petition.action_type || 'Petição'}</p>
                                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1"><span>{new Date(petition.created_at).toLocaleDateString('pt-BR')}</span></div>
                                      </div>
                                  </div>
                                  <ChevronRight size={16} className="text-gray-300 group-hover:text-juris-500" />
                              </div>
                          ))}
                       </div>
                   ) : <div className="p-8 text-center text-gray-400 text-sm">Sem petições recentes.</div>}
                </div>
            </div>
        );
      default: return null;
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
  };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
    e.preventDefault();
  };
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const copyListItems = [...activeWidgets];
    const dragItemContent = copyListItems[dragItem.current];
    copyListItems.splice(dragItem.current, 1);
    copyListItems.splice(dragOverItem.current, 0, dragItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    saveLayout(copyListItems, hiddenWidgets);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel do Advogado</h1>
          <p className="text-gray-500">Bem-vindo de volta, Dr(a). {profile?.full_name?.split(' ')[0] || 'Advogado(a)'}.</p>
        </div>
        <Button variant="ghost" onClick={() => setIsCustomizing(!isCustomizing)} className="text-gray-500 hover:text-juris-700">
            <Settings2 size={18} className="mr-2" /> {isCustomizing ? 'Salvar' : 'Personalizar'}
        </Button>
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6`}>
        {activeWidgets.map((widgetId, index) => {
             const meta = ALL_WIDGETS.find(w => w.id === widgetId);
             if (!meta) return null;
             const isFullWidth = meta.defaultColSpan === 3;
             return (
                 <div
                    key={widgetId}
                    draggable={isCustomizing}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className={`${isFullWidth ? 'lg:col-span-3' : 'lg:col-span-1'} ${isCustomizing ? 'cursor-move opacity-90' : ''}`}
                 >
                    {renderWidgetContent(widgetId)}
                 </div>
             );
        })}
      </div>
    </div>
  );
};