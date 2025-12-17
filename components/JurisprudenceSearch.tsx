import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { searchJurisprudence } from '../services/aiService';
import { SavedJurisprudence } from '../types';
import { Button } from './ui/Button';
import { BookOpen, Search, Save, Trash2, Calendar, Share2, Scale, ExternalLink, Loader2 } from 'lucide-react';

interface JurisprudenceSearchProps {
  userId: string;
}

export const JurisprudenceSearch: React.FC<JurisprudenceSearchProps> = ({ userId }) => {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'geral' | 'federal' | 'estadual'>('geral');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [savedItems, setSavedItems] = useState<SavedJurisprudence[]>([]);
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
       const { data, error } = await supabase.from('saved_jurisprudence').insert([{
           user_id: userId,
           query: query,
           result: result,
           created_at: new Date().toISOString()
       }]).select().single();

       if (error) throw error;
       setSavedItems(prev => [data as SavedJurisprudence, ...prev]);
       alert("Pesquisa salva com sucesso!");
    } catch (error: any) {
       if (error.code === '42P01') {
          alert("A tabela de jurisprudência ainda não foi criada. Solicite ao admin.");
       } else {
          alert("Erro ao salvar.");
       }
    } finally {
       setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Deseja apagar este histórico?")) return;
      await supabase.from('saved_jurisprudence').delete().eq('id', id);
      setSavedItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="text-juris-800" />
            Pesquisa de Jurisprudência
          </h1>
          <p className="text-gray-500">Busque julgados em tribunais Federais e Estaduais com IA.</p>
        </div>
      </div>

      {/* Search Box */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
         <form onSubmit={handleSearch} className="space-y-4">
             <div className="flex flex-col md:flex-row gap-4">
                 <div className="flex-1">
                     <label className="block text-sm font-medium text-gray-700 mb-1">Tema ou Palavras-chave</label>
                     <div className="relative">
                        <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                        <input 
                            type="text" 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ex: Dano moral extravio bagagem voo internacional"
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-juris-500 focus:outline-none"
                            required
                        />
                     </div>
                 </div>
                 <div className="w-full md:w-64">
                     <label className="block text-sm font-medium text-gray-700 mb-1">Escopo da Busca</label>
                     <select 
                        value={scope}
                        onChange={(e) => setScope(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-juris-500 focus:outline-none bg-white"
                     >
                         <option value="geral">Todos os Tribunais</option>
                         <option value="federal">Tribunais Federais (TRF/STJ/STF)</option>
                         <option value="estadual">Tribunais Estaduais (TJ)</option>
                     </select>
                 </div>
             </div>
             <div className="flex justify-end">
                 <Button type="submit" isLoading={loading} className="px-8">
                    Pesquisar Julgados
                 </Button>
             </div>
         </form>
      </div>

      {/* Results Area */}
      {result && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
                  <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                      <Scale size={20} /> Resultados da IA
                  </h3>
                  <Button onClick={handleSave} isLoading={saving} size="sm" variant="secondary" className="bg-white text-blue-700 hover:bg-blue-50 border border-blue-200">
                      <Save size={16} className="mr-2" /> Salvar Pesquisa
                  </Button>
              </div>
              <div className="p-8">
                  <div 
                    className="prose max-w-none text-gray-800"
                    dangerouslySetInnerHTML={{ __html: result }}
                  />
                  <style>{`
                      .juris-card {
                          background: #f8fafc;
                          border: 1px solid #e2e8f0;
                          border-radius: 8px;
                          padding: 20px;
                          margin-bottom: 20px;
                      }
                      .juris-card h4 {
                          color: #0f172a;
                          margin-top: 0;
                          font-weight: 700;
                      }
                      .juris-card .ementa {
                          font-style: italic;
                          color: #334155;
                          background: #fff;
                          padding: 10px;
                          border-left: 4px solid #0ea5e9;
                          margin-top: 10px;
                      }
                  `}</style>
              </div>
          </div>
      )}

      {/* Saved History */}
      {savedItems.length > 0 && (
          <div className="space-y-4">
             <h3 className="text-lg font-bold text-gray-900 mt-8">Histórico Salvo</h3>
             <div className="grid gap-4">
                 {savedItems.map(item => (
                     <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                         <div className="flex justify-between items-start mb-2">
                             <h4 className="font-semibold text-juris-900">"{item.query}"</h4>
                             <div className="flex gap-2">
                                 <span className="text-xs text-gray-400 flex items-center gap-1">
                                     <Calendar size={12} /> {new Date(item.created_at).toLocaleDateString()}
                                 </span>
                                 <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500">
                                     <Trash2 size={16} />
                                 </button>
                             </div>
                         </div>
                         <div className="max-h-32 overflow-hidden relative">
                             <div dangerouslySetInnerHTML={{ __html: item.result }} className="text-xs text-gray-600 scale-90 origin-top-left" />
                             <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
                         </div>
                         <button 
                            onClick={() => setResult(item.result)}
                            className="mt-2 text-sm font-medium text-juris-600 hover:text-juris-800 flex items-center gap-1"
                         >
                            <ExternalLink size={14} /> Ver Detalhes
                         </button>
                     </div>
                 ))}
             </div>
          </div>
      )}
    </div>
  );
};