
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Deadline } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
// Added missing Loader2 icon import
import { Calendar, Plus, Clock, CheckCircle2, AlertTriangle, Trash2, Flame, Loader2 } from 'lucide-react';

interface DeadlineManagerProps {
  userId: string;
}

export const DeadlineManager: React.FC<DeadlineManagerProps> = ({ userId }) => {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
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

      if (error) return;
      setDeadlines((data as Deadline[]) || []);
    } catch (error) {
      console.error(error);
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
      alert("Erro ao salvar prazo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este prazo permanentemente?')) return;
    try {
        await supabase.from('deadlines').delete().eq('id', id);
        setDeadlines(prev => prev.filter(d => d.id !== id));
    } catch (e) { alert("Erro ao excluir."); }
  };

  const toggleStatus = async (id: string, currentStatus: 'pending' | 'completed') => {
      const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
      setDeadlines(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
      const { error } = await supabase.from('deadlines').update({ status: newStatus }).eq('id', id);
      if (error) fetchDeadlines();
  };

  const getUrgencyColor = (dateString: string, status: string) => {
    if (status === 'completed') return 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-600';
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(dateString); due.setHours(0,0,0,0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'bg-red-50 dark:bg-rose-950/20 border-red-200 dark:border-rose-900/50 text-red-800 dark:text-rose-400';
    if (diffDays <= 2) return 'bg-red-50 dark:bg-rose-900/10 border-red-300 dark:border-rose-800 text-red-900 dark:text-rose-300 font-medium shadow-sm ring-1 ring-red-100 dark:ring-rose-900/30'; 
    if (diffDays <= 5) return 'bg-amber-50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-400'; 
    return 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-800 dark:text-slate-200';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="text-left">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">
            Agenda de Prazos
          </h1>
          <p className="text-gray-500 dark:text-slate-400 mt-2 font-bold uppercase text-[10px] tracking-widest">Gestão Estratégica de Vencimentos</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2 rounded-2xl bg-indigo-600 text-white border-none shadow-lg">
           {showAddForm ? 'Cancelar' : <><Plus size={18} /> Novo Prazo</>}
        </Button>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-gray-200 dark:border-slate-800 animate-in slide-in-from-top-4 text-left">
           <h3 className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-widest mb-6">Cadastrar Novo Prazo</h3>
           <form onSubmit={handleAddDeadline} className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left">
              <div className="md:col-span-2 text-left">
                 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Título / Número do Processo</label>
                 <input 
                   placeholder="Ex: Contestação - Processo 12345"
                   value={newTitle}
                   onChange={(e) => setNewTitle(e.target.value)}
                   required
                   className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all text-sm"
                 />
              </div>
              <div className="md:col-span-2 text-left">
                 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Data de Vencimento</label>
                 <input 
                   type="date"
                   value={newDate}
                   onChange={(e) => setNewDate(e.target.value)}
                   required
                   className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all text-sm"
                 />
              </div>
              <div className="md:col-span-2 flex justify-end mt-4">
                 <Button type="submit" isLoading={saving} className="bg-slate-900 dark:bg-indigo-600 rounded-xl px-10 h-12 font-black uppercase text-[10px] tracking-widest border-none">Salvar Prazo</Button>
              </div>
           </form>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
             <div className="flex justify-center py-12"><Loader2 className="animate-spin h-10 w-10 text-indigo-600" /></div>
        ) : deadlines.length === 0 ? (
             <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-slate-800">
                <Clock className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-700 mb-4" />
                <p className="text-gray-500 dark:text-slate-500 font-black uppercase text-xs tracking-widest">Nenhum prazo agendado</p>
             </div>
        ) : (
            deadlines.map((deadline) => {
                const statusStyle = getUrgencyColor(deadline.due_date, deadline.status);
                const isCompleted = deadline.status === 'completed';
                const due = new Date(deadline.due_date);
                const today = new Date(); today.setHours(0,0,0,0);
                const diffTime = due.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                return (
                    <div key={deadline.id} className={`p-6 rounded-[2rem] border-2 flex items-center justify-between transition-all group ${statusStyle}`}>
                        <div className="flex items-center gap-5">
                            <button 
                               onClick={() => toggleStatus(deadline.id, deadline.status)}
                               className={`rounded-xl p-2 transition-all ${isCompleted ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40' : 'text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                <CheckCircle2 size={24} className={isCompleted ? "fill-current" : ""} />
                            </button>
                            <div className={isCompleted ? 'opacity-40 line-through' : ''}>
                                <h4 className="font-black text-sm md:text-base tracking-tight flex items-center gap-2">
                                  {deadline.title}
                                  {!isCompleted && diffDays <= 2 && <Flame size={14} className="text-rose-600 animate-pulse" />}
                                </h4>
                                <div className="flex items-center gap-4 text-[10px] mt-1 font-black uppercase tracking-widest opacity-60">
                                   <Calendar size={12} /> {new Date(deadline.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => handleDelete(deadline.id)} className="p-3 text-slate-300 dark:text-slate-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};
