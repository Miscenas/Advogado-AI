import React, { useState, useEffect } from 'react';
import { UserProfile, UsageLimit, Petition } from '../types';
import { supabase } from '../services/supabaseClient';
import { 
  FileText, 
  Activity, 
  AlertCircle, 
  Zap, 
  CheckCircle2,
  Info,
  X,
  Crown,
  Calendar,
  ChevronRight,
  Clock
} from 'lucide-react';
import { Button } from './ui/Button';

interface DashboardHomeProps {
  profile: UserProfile | null;
  usage: UsageLimit | null;
  onNewPetition: () => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ 
  profile, 
  onNewPetition
}) => {
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [recentPetitions, setRecentPetitions] = useState<Petition[]>([]);
  const [loadingPetitions, setLoadingPetitions] = useState(true);

  const isTrial = profile?.account_status === 'trial';

  useEffect(() => {
    const fetchRecentPetitions = async () => {
      if (!profile?.id) return;
      try {
        const { data, error } = await supabase
          .from('petitions')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setRecentPetitions((data as Petition[]) || []);
      } catch (error) {
        console.error('Error fetching recent petitions:', error);
      } finally {
        setLoadingPetitions(false);
      }
    };

    fetchRecentPetitions();
  }, [profile?.id]);

  return (
    <div className="space-y-6">
      {/* Disclaimer Banner */}
      {showDisclaimer && (
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-md shadow-sm relative animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex gap-3 pr-8">
             <div className="mt-0.5 flex-shrink-0">
               <Info className="h-5 w-5 text-blue-600" />
             </div>
             <div>
               <h3 className="text-sm font-bold text-blue-900">Aviso de Responsabilidade Profissional</h3>
               <p className="text-sm text-blue-800 mt-1 leading-relaxed">
                 O Advogado AI é uma ferramenta de assistência baseada em inteligência artificial. Todo conteúdo gerado é uma sugestão e <strong>deve ser obrigatoriamente conferido, revisado e validado por um advogado habilitado</strong> antes de qualquer utilização processual. A responsabilidade técnica e legal pelas peças é exclusivamente do profissional.
               </p>
               <div className="mt-3">
                  <Button 
                    size="sm" 
                    onClick={() => setShowDisclaimer(false)}
                    className="bg-blue-700 hover:bg-blue-800 text-white border-transparent"
                  >
                    Ok, estou ciente
                  </Button>
               </div>
             </div>
          </div>
          <button 
            onClick={() => setShowDisclaimer(false)}
            className="absolute top-2 right-2 text-blue-400 hover:text-blue-700 hover:bg-blue-100 p-1 rounded transition-colors"
            title="Fechar aviso"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel do Advogado</h1>
          <p className="text-gray-500">Bem-vindo de volta, Dr(a). {profile?.full_name?.split(' ')[0] || 'Advogado(a)'}.</p>
        </div>
        <Button onClick={onNewPetition} className="gap-2 shadow-lg shadow-sky-900/20">
          <Zap size={18} />
          Nova Petição Inteligente
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Status / Plan Card */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Crown size={100} className="text-juris-900" />
          </div>
          
          <div className="relative z-10">
            <p className="text-sm font-medium text-gray-500 mb-1">Status da Assinatura</p>
            <div className="flex items-center gap-2 mb-4">
                <h3 className={`text-2xl font-bold capitalize ${isTrial ? 'text-gray-900' : 'text-green-600'}`}>
                    {isTrial ? 'Plano Gratuito' : 'Plano Pro Ativo'}
                </h3>
                {isTrial && <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">Trial</span>}
            </div>

            {isTrial ? (
                <div className="space-y-4">
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
                        <div className="flex gap-3">
                            <Crown className="text-amber-600 h-6 w-6 flex-shrink-0" />
                            <div>
                                <p className="font-bold text-amber-900">Seja Premium</p>
                                <p className="text-sm text-amber-800 mt-1">Geração ilimitada de petições cíveis e trabalhistas.</p>
                                <p className="text-lg font-bold text-amber-900 mt-2">R$ 40,00 <span className="text-sm font-normal">/mês</span></p>
                            </div>
                        </div>
                    </div>
                    <Button className="w-full bg-juris-900 hover:bg-juris-800">
                        Assinar Agora
                    </Button>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-100">
                    <CheckCircle2 size={20} />
                    <span className="font-medium">Você possui acesso ilimitado.</span>
                </div>
            )}
            
            <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Petições geradas este mês:</span>
                    <span className="font-bold text-gray-900">{recentPetitions.length}</span>
                </div>
            </div>
          </div>
        </div>

        {/* Recent Petitions Card */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
             <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock size={18} className="text-gray-400" />
                Últimas Petições Geradas
             </h3>
          </div>
          
          <div className="flex-1 p-0 overflow-hidden">
             {loadingPetitions ? (
                 <div className="flex justify-center items-center h-48">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-juris-900"></div>
                 </div>
             ) : recentPetitions.length > 0 ? (
                 <div className="divide-y divide-gray-100">
                    {recentPetitions.map((petition) => (
                        <div key={petition.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${petition.filed ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 text-sm">{petition.action_type || 'Petição Sem Título'}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                        <span className="capitalize">{petition.area}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Calendar size={10} />
                                            {new Date(petition.created_at).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {petition.filed ? (
                                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                                        Peticionado
                                    </span>
                                ) : (
                                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                                        Rascunho
                                    </span>
                                )}
                                <ChevronRight size={16} className="text-gray-300 group-hover:text-juris-500" />
                            </div>
                        </div>
                    ))}
                 </div>
             ) : (
                 <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                    <div className="bg-gray-100 p-3 rounded-full mb-3">
                        <FileText className="text-gray-400" size={24} />
                    </div>
                    <p className="text-gray-900 font-medium">Nenhuma petição recente</p>
                    <p className="text-gray-500 text-sm mt-1 mb-4">Suas petições geradas aparecerão aqui.</p>
                    <Button size="sm" variant="outline" onClick={onNewPetition}>
                        Criar Primeira Petição
                    </Button>
                 </div>
             )}
          </div>
          
          {recentPetitions.length > 0 && (
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl text-center">
                <button className="text-sm font-medium text-juris-700 hover:text-juris-900 hover:underline">
                    Ver todas as petições
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};