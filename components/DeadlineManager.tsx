import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Deadline } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Calendar, Plus, Clock, CheckCircle2, AlertTriangle, Trash2, Flame } from 'lucide-react';

interface DeadlineManagerProps {
  userId: string;
}

export const DeadlineManager: React.FC<DeadlineManagerProps> = ({ userId }) => {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDeadlines();
  }, [userId]);

  const fetchDeadlines = async () => {
    try {
      const { data, error } = await supabase
        .from('deadlines')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });

      if (error) {
          console.warn('Error fetching deadlines (Table might not exist):', error);
          return;
      }
      setDeadlines((data as Deadline[]) || []);
    } catch (error) {
      console.error('Error fetching deadlines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('deadlines')
        .insert([{
          user_id: userId,
          title: newTitle,
          due_date: newDate,
          status: 'pending',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setDeadlines(prev => [...prev, data as Deadline].sort((a,b) => a.due_date.localeCompare(b.due_date)));
      setShowAddForm(false);
      setNewTitle('');
      setNewDate('');
    } catch (error: any) {
      console.error('Error creating deadline:', error);
      if (error.code === '42P01') {
          alert('Erro crítico: A tabela de prazos não existe no banco de dados. Por favor, contate o administrador para rodar o script de configuração.');
      } else {
          alert(`Erro ao salvar prazo: ${error.message || 'Verifique sua conexão.'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este prazo permanentemente?')) return;
    
    try {
        const { error } = await supabase.from('deadlines').delete().eq('id', id);
        
        if (error) {
            console.error('Erro Supabase Delete:', error);
            throw error;
        }

        // Atualiza UI apenas se não houve erro
        setDeadlines(prev => prev.filter(d => d.id !== id));
    } catch (e: any) {
        console.error('Erro ao excluir:', e);
        alert(`Não foi possível excluir o prazo. Detalhe: ${e.message || e.error_description || 'Erro desconhecido'}`);
    }
  };

  const toggleStatus = async (id: string, currentStatus: 'pending' | 'completed') => {
      const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
      // Optimistic update
      setDeadlines(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
      
      const { error } = await supabase.from('deadlines').update({ status: newStatus }).eq('id', id);
      if (error) {
          console.error('Erro ao atualizar status:', error);
          // Revert on error
          setDeadlines(prev => prev.map(d => d.id === id ? { ...d, status: currentStatus } : d));
          alert('Erro ao atualizar status do prazo.');
      }
  };

  const getUrgencyColor = (dateString: string, status: string) => {
    if (status === 'completed') return 'bg-gray-50 border-gray-200 text-gray-500';
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dateString);
    due.setHours(0,0,0,0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'bg-red-50 border-red-200 text-red-800'; // Vencido
    
    // 2 dias ou menos (inclui hoje e amanhã) fica VERMELHO com destaque
    if (diffDays <= 2) return 'bg-red-50 border-red-300 text-red-900 font-medium shadow-sm ring-1 ring-red-100'; 
    
    // Entre 3 e 5 dias fica Amarelo/Laranja
    if (diffDays <= 5) return 'bg-amber-50 border-amber-200 text-amber-800'; 
    
    return 'bg-white border-gray-200 text-gray-800'; // Normal
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="text-juris-800" />
            Agenda de Prazos Processuais
          </h1>
          <p className="text-gray-500">Gerencie seus vencimentos.</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
           {showAddForm ? 'Cancelar' : <><Plus size={18} /> Novo Prazo</>}
        </Button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 animate-in slide-in-from-top-4">
           <h3 className="font-semibold text-gray-900 mb-4">Cadastrar Novo Prazo</h3>
           <form onSubmit={handleAddDeadline} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                 <Input 
                   label="Título do Prazo / Processo"
                   placeholder="Ex: Contestação - Processo 12345"
                   value={newTitle}
                   onChange={(e) => setNewTitle(e.target.value)}
                   required
                 />
              </div>
              <div className="md:col-span-2">
                 <Input 
                   type="date"
                   label="Data de Vencimento"
                   value={newDate}
                   onChange={(e) => setNewDate(e.target.value)}
                   required
                 />
              </div>
              
              <div className="md:col-span-2 flex justify-end mt-2">
                 <Button type="submit" isLoading={saving}>Salvar Prazo</Button>
              </div>
           </form>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
             <div className="text-center py-10"><div className="animate-spin inline-block w-6 h-6 border-2 border-juris-800 border-t-transparent rounded-full"></div></div>
        ) : deadlines.length === 0 ? (
             <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <Clock className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <h3 className="text-gray-500 font-medium">Nenhum prazo agendado</h3>
                <p className="text-sm text-gray-400">Clique em "Novo Prazo" para começar.</p>
             </div>
        ) : (
            deadlines.map((deadline) => {
                const statusColor = getUrgencyColor(deadline.due_date, deadline.status);
                const isCompleted = deadline.status === 'completed';
                
                const today = new Date();
                today.setHours(0,0,0,0);
                const due = new Date(deadline.due_date);
                due.setHours(0,0,0,0);
                const diffTime = due.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                return (
                    <div key={deadline.id} className={`p-4 rounded-lg border flex items-center justify-between transition-all ${statusColor}`}>
                        <div className="flex items-center gap-4">
                            <button 
                               onClick={() => toggleStatus(deadline.id, deadline.status)}
                               className={`rounded-full p-1 transition-colors ${isCompleted ? 'text-green-600 bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}
                               title={isCompleted ? "Marcar como pendente" : "Marcar como concluído"}
                            >
                                <CheckCircle2 size={24} className={isCompleted ? "fill-current" : ""} />
                            </button>
                            
                            <div className={isCompleted ? 'opacity-50 line-through' : ''}>
                                <h4 className="font-semibold text-sm md:text-base flex items-center gap-2">
                                  {deadline.title}
                                  {/* Mostrar ícone de fogo se for muito urgente (<= 2 dias) e não completado */}
                                  {!isCompleted && diffDays <= 2 && (
                                    <Flame size={14} className="text-red-600 animate-pulse" />
                                  )}
                                </h4>
                                <div className="flex items-center gap-4 text-xs mt-1 opacity-80">
                                    <span className="flex items-center gap-1 font-medium">
                                       <Calendar size={12} /> 
                                       {new Date(deadline.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                           {/* Badge Vencido */}
                           {deadline.status === 'pending' && diffDays < 0 && (
                               <span className="hidden md:flex items-center gap-1 text-red-700 text-xs font-bold bg-white/60 px-2 py-1 rounded-full border border-red-200">
                                   <AlertTriangle size={12} /> Vencido
                               </span>
                           )}
                           {/* Badge Urgente (0 a 2 dias) */}
                           {deadline.status === 'pending' && diffDays >= 0 && diffDays <= 2 && (
                               <span className="hidden md:flex items-center gap-1 text-red-700 text-xs font-bold bg-white/60 px-2 py-1 rounded-full border border-red-200">
                                   Urgente
                               </span>
                           )}
                           
                           <button 
                             type="button"
                             onClick={() => handleDelete(deadline.id)}
                             className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                             title="Excluir Prazo"
                           >
                             <Trash2 size={18} />
                           </button>
                        </div>
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};