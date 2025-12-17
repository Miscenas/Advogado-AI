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
  Globe
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
  { id: 'subscription', title: 'Status da Assinatura', defaultColSpan: 1 },
  { id: 'deadlines', title: 'Próximos Prazos', defaultColSpan: 1 },
  { id: 'recents', title: 'Últimas Petições', defaultColSpan: 3 }, // Full width usually
];

export const DashboardHome: React.FC<DashboardHomeProps> = ({ 
  profile, 
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

  // Load Layout Preference
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboard_layout_v3'); // bumped version again
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

  // --- Layout Management ---

  const saveLayout = (active: WidgetType[], hidden: WidgetType[]) => {
    localStorage.setItem('dashboard_layout_v3', JSON.stringify({ active, hidden }));
    setActiveWidgets(active);
    setHiddenWidgets(hidden);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    e.currentTarget.classList.add('opacity-50', 'scale-95');
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
    e.preventDefault();
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50', 'scale-95');
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    const copyListItems = [...activeWidgets];
    const dragItemContent = copyListItems[dragItem.current];
    copyListItems.splice(dragItem.current, 1);
    copyListItems.splice(dragOverItem.current, 0, dragItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;
    
    saveLayout(copyListItems, hiddenWidgets);
  };

  const removeWidget = (id: WidgetType) => {
    const newActive = activeWidgets.filter(w => w !== id);
    const newHidden = [...hiddenWidgets, id];
    saveLayout(newActive, newHidden);
  };

  const addWidget = (id: WidgetType) => {
    const newHidden = hiddenWidgets.filter(w => w !== id);
    const newActive = [...activeWidgets, id];
    saveLayout(newActive, newHidden);
  };

  const resetLayout = () => {
    saveLayout(['actions', 'portals', 'jurisprudence', 'subscription', 'deadlines', 'recents'], []);
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

      case 'portals':
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col relative overflow-hidden h-full group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Globe size={100} className="text-gray-900" />
                </div>
                <div className="relative z-10 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="bg-gray-100 p-2 rounded-lg text-gray-700">
                             <Globe size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Portais da Justiça</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                        Acesso rápido aos sistemas dos tribunais (PJe, e-SAJ, Projudi) e downloads.
                    </p>
                    <div className="mt-auto">
                        <Button 
                            onClick={() => onNavigate('portals')} 
                            variant="outline"
                            className="w-full justify-between"
                        >
                            Acessar Lista <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            </div>
        );

      case 'jurisprudence':
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col relative overflow-hidden h-full group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <BookOpen size={100} className="text-blue-900" />
                </div>
                <div className="relative z-10 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
                             <BookOpen size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Pesquisa de Jurisprudência</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                        Busque julgados em tribunais Federais (TRF, STJ) e Estaduais com auxílio da IA.
                    </p>
                    <div className="mt-auto">
                        <Button 
                            onClick={() => onNavigate('jurisprudence')} 
                            variant="outline"
                            className="w-full bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 justify-between"
                        >
                            Pesquisar Agora <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            </div>
        );

      case 'subscription':
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Crown size={100} className="text-juris-900" />
                </div>
                <div className="relative z-10 flex-1 flex flex-col">
                    <p className="text-sm font-medium text-gray-500 mb-1">Status da Assinatura</p>
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className={`text-2xl font-bold capitalize ${isTrial ? 'text-gray-900' : 'text-green-600'}`}>
                            {isTrial ? 'Plano Gratuito' : 'Plano Pro'}
                        </h3>
                        {isTrial && <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">Trial</span>}
                    </div>
                    {isTrial ? (
                        <div className="mt-auto space-y-3">
                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                <p className="font-bold text-amber-900 text-sm">Seja Premium</p>
                                <p className="text-xs text-amber-800">Geração ilimitada de peças.</p>
                            </div>
                            <Button className="w-full bg-juris-900 hover:bg-juris-800 h-9 text-sm" onClick={() => onNavigate('subscription')}>Assinar Agora</Button>
                        </div>
                    ) : (
                        <div className="mt-auto flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-100">
                            <CheckCircle2 size={20} />
                            <span className="font-medium text-sm">Acesso ilimitado.</span>
                        </div>
                    )}
                </div>
            </div>
        );

      case 'deadlines':
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                        <AlertCircle size={16} className="text-gray-500" /> Próximos Prazos
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => onNavigate('deadlines')} className="h-6 text-xs px-2">Ver todos</Button>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[300px]">
                    {upcomingDeadlines.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                            {upcomingDeadlines.map(d => {
                                const today = new Date(); today.setHours(0,0,0,0);
                                const due = new Date(d.due_date); due.setHours(0,0,0,0);
                                const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                
                                let statusClass = diffDays < 0 ? "text-red-600" : diffDays <= 2 ? "text-red-500" : "text-amber-600";
                                let Icon = diffDays < 0 ? AlertTriangle : diffDays <= 2 ? Flame : Clock;

                                return (
                                    <div key={d.id} className="p-3 hover:bg-gray-50 flex justify-between items-center text-sm">
                                        <div className="truncate pr-2">
                                            <p className="font-medium text-gray-800 truncate">{d.title}</p>
                                            <p className="text-xs text-gray-500">{new Date(d.due_date).toLocaleDateString()}</p>
                                        </div>
                                        <Icon size={16} className={statusClass} />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-6 text-center text-gray-400 text-xs">Nenhum prazo urgente.</div>
                    )}
                </div>
            </div>
        );

      case 'recents':
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                   <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Clock size={18} className="text-gray-400" />
                      Últimas Petições Geradas
                   </h3>
                </div>
                <div className="flex-1 p-0 overflow-hidden min-h-[200px]">
                   {loading ? (
                       <div className="flex justify-center items-center h-full">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-juris-900"></div>
                       </div>
                   ) : recentPetitions.length > 0 ? (
                       <div className="divide-y divide-gray-100">
                          {recentPetitions.map((petition) => (
                              <div key={petition.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer" onClick={() => onNavigate('my-petitions')}>
                                  <div className="flex items-center gap-4">
                                      <div className={`p-2 rounded-lg ${petition.filed ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                          <FileText size={20} />
                                      </div>
                                      <div>
                                          <p className="font-medium text-gray-900 text-sm">{petition.action_type || 'Petição Sem Título'}</p>
                                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                              <span className="capitalize">{petition.area}</span>
                                              <span>•</span>
                                              <span>{new Date(petition.created_at).toLocaleDateString('pt-BR')}</span>
                                          </div>
                                      </div>
                                  </div>
                                  <ChevronRight size={16} className="text-gray-300 group-hover:text-juris-500" />
                              </div>
                          ))}
                       </div>
                   ) : (
                       <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                          <p className="text-gray-500 text-sm mb-4">Suas petições geradas aparecerão aqui.</p>
                          <Button size="sm" variant="outline" onClick={() => onNavigate('new-petition')}>Criar Primeira Petição</Button>
                       </div>
                   )}
                </div>
            </div>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel do Advogado</h1>
          <p className="text-gray-500">Bem-vindo de volta, Dr(a). {profile?.full_name?.split(' ')[0] || 'Advogado(a)'}.</p>
        </div>
        <div className="flex gap-2">
            {isCustomizing ? (
                <>
                    <Button variant="outline" onClick={() => setIsCustomizing(false)} className="bg-white border-green-200 text-green-700 hover:bg-green-50">
                        <CheckCircle2 size={16} className="mr-2" /> Salvar Layout
                    </Button>
                    {hiddenWidgets.length > 0 && <span className="text-xs text-gray-400 self-center hidden sm:block">Clique no + para restaurar itens</span>}
                </>
            ) : (
                <Button variant="ghost" onClick={() => setIsCustomizing(true)} className="text-gray-500 hover:text-juris-700 hover:bg-gray-100">
                    <Settings2 size={18} className="mr-2" /> Personalizar
                </Button>
            )}
        </div>
      </div>

      {/* Restore Area (Only in Customization Mode) */}
      {isCustomizing && hiddenWidgets.length > 0 && (
          <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-4 animate-in fade-in">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Layout size={14} /> Widgets Disponíveis</h4>
              <div className="flex flex-wrap gap-3">
                  {hiddenWidgets.map(id => {
                      const meta = ALL_WIDGETS.find(w => w.id === id);
                      return (
                          <button 
                            key={id}
                            onClick={() => addWidget(id)}
                            className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200 hover:border-juris-500 hover:text-juris-600 transition-colors"
                          >
                              <Plus size={16} /> 
                              <span className="text-sm font-medium">{meta?.title}</span>
                          </button>
                      )
                  })}
              </div>
          </div>
      )}

      {/* Draggable Grid */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${isCustomizing ? 'gap-y-8' : ''}`}>
        {activeWidgets.map((widgetId, index) => {
             const meta = ALL_WIDGETS.find(w => w.id === widgetId);
             if (!meta) return null;

             const isFullWidth = meta.defaultColSpan === 3;
             const isTwoThirds = meta.defaultColSpan === 2; // Not currently used but supported logic

             return (
                 <div
                    key={widgetId}
                    draggable={isCustomizing}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className={`
                        relative transition-all duration-300
                        ${isFullWidth ? 'lg:col-span-3' : isTwoThirds ? 'lg:col-span-2' : 'lg:col-span-1'}
                        ${isCustomizing ? 'cursor-move ring-2 ring-juris-200 ring-offset-4 rounded-xl opacity-90 hover:opacity-100 hover:ring-juris-400' : ''}
                    `}
                 >
                    {isCustomizing && (
                        <div className="absolute -top-3 -right-3 z-20 flex gap-1">
                             <div className="bg-juris-600 text-white p-1 rounded-full shadow-md"><GripHorizontal size={14} /></div>
                             <button 
                                onClick={() => removeWidget(widgetId)}
                                className="bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
                                title="Ocultar Widget"
                             >
                                 <X size={14} />
                             </button>
                        </div>
                    )}
                    
                    {/* Render the actual widget content */}
                    {renderWidgetContent(widgetId)}
                 </div>
             );
        })}

        {/* Empty State / Reset */}
        {activeWidgets.length === 0 && (
            <div className="lg:col-span-3 text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-gray-500 mb-4">Você ocultou todos os widgets.</p>
                <Button onClick={resetLayout} variant="outline" className="gap-2"><Undo2 size={16}/> Restaurar Padrão</Button>
            </div>
        )}
      </div>
    </div>
  );
};