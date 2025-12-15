import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Petition } from '../types';
import { FileText, Calendar, ChevronRight, Copy, Search, Eye, CheckSquare, Square, Printer, FileBadge } from 'lucide-react';
import { Button } from './ui/Button';

interface PetitionListProps {
  userId: string;
}

export const PetitionList: React.FC<PetitionListProps> = ({ userId }) => {
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPetition, setSelectedPetition] = useState<Petition | null>(null);

  useEffect(() => {
    fetchPetitions();
  }, [userId]);

  const fetchPetitions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('petitions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPetitions((data as Petition[]) || []);
    } catch (error) {
      console.error('Error fetching petitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFiled = async (e: React.MouseEvent, petitionId: string, currentStatus: boolean | undefined) => {
    e.stopPropagation(); // Prevent opening the detail view when clicking the checkbox
    const newStatus = !currentStatus;

    // Optimistic Update
    setPetitions(prev => prev.map(p => 
      p.id === petitionId ? { ...p, filed: newStatus } : p
    ));

    try {
      const { error } = await supabase
        .from('petitions')
        .update({ filed: newStatus })
        .eq('id', petitionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating status:', error);
      // Revert optimistic update on error
      setPetitions(prev => prev.map(p => 
        p.id === petitionId ? { ...p, filed: currentStatus } : p
      ));
      alert('Não foi possível atualizar o status da petição.');
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    alert('Conteúdo copiado!');
  };

  const handlePrint = (content: string) => {
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Por favor, permita popups para imprimir.");
        return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Impressão - Advogado AI</title>
          <style>
            body { 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 12pt;
              line-height: 1.5;
              padding: 40px;
              color: #000;
            }
            .content {
              white-space: pre-wrap;
            }
            @media print {
              body { padding: 0; margin: 2cm; }
            }
          </style>
        </head>
        <body>
          <div class="content">${content}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        // Alguns navegadores/usuários preferem que a janela não feche automaticamente
        // printWindow.close();
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-juris-900"></div>
      </div>
    );
  }

  if (selectedPetition) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in slide-in-from-right-4">
        <div className="border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center bg-gray-50 gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{selectedPetition.action_type || 'Petição Sem Título'}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {(selectedPetition.plaintiff_name || selectedPetition.defendant_name) && (
                <span className="font-medium">
                  {selectedPetition.plaintiff_name || 'Autor'} <span className="text-gray-400 px-1">vs</span> {selectedPetition.defendant_name || 'Réu'}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setSelectedPetition(null)} className="flex-1 sm:flex-none">
              Voltar
            </Button>
            <Button variant="outline" onClick={() => handlePrint(selectedPetition.content)} className="flex-1 sm:flex-none">
              <Printer size={16} className="mr-2" /> Imprimir
            </Button>
            <Button onClick={() => handleCopy(selectedPetition.content)} className="flex-1 sm:flex-none">
              <Copy size={16} className="mr-2" /> Copiar
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 h-[70vh]">
            {/* Sidebar with metadata (if available) */}
            {selectedPetition.analyzed_documents && selectedPetition.analyzed_documents.length > 0 && (
                <div className="lg:col-span-1 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
                    <div className="mb-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                           <FileBadge size={14} /> Documentos Base
                        </h3>
                        <div className="space-y-3">
                            {selectedPetition.analyzed_documents.map((doc, idx) => (
                                <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="bg-blue-100 text-blue-600 p-1 rounded">
                                            <FileText size={12} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-700 truncate block w-full">{doc.docType}</span>
                                    </div>
                                    <p className="text-xs text-gray-900 font-medium truncate mb-1" title={doc.fileName}>{doc.fileName}</p>
                                    {doc.summary && (
                                        <p className="text-[10px] text-gray-500 leading-tight italic bg-gray-50 p-1 rounded border border-gray-100">
                                            "{doc.summary.length > 80 ? doc.summary.substring(0, 80) + '...' : doc.summary}"
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div 
              id="petition-detail-content"
              className={`${selectedPetition.analyzed_documents && selectedPetition.analyzed_documents.length > 0 ? 'lg:col-span-3' : 'lg:col-span-4'} p-8 overflow-y-auto bg-white font-serif whitespace-pre-wrap text-gray-800 leading-relaxed`}
            >
              {selectedPetition.content}
            </div>
        </div>
      </div>
    );
  }

  if (petitions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="bg-gray-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <FileText className="text-gray-400 w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma petição encontrada</h2>
        <p className="text-gray-500 max-w-sm mx-auto mb-6">
          Você ainda não gerou nenhuma petição. Vá para "Nova Petição" para criar seu primeiro documento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Minhas Petições</h1>
        <div className="relative w-64">
          <input 
            type="text" 
            placeholder="Buscar petições..." 
            className="w-full pl-9 pr-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-juris-500 focus:outline-none text-sm"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
        </div>
      </div>

      <div className="grid gap-4">
        {petitions.map((petition) => {
          const isFiled = petition.filed === true;
          const hasDocs = petition.analyzed_documents && petition.analyzed_documents.length > 0;
          
          return (
            <div 
              key={petition.id}
              className={`p-4 rounded-lg border hover:shadow-md transition-all flex items-center justify-between group cursor-pointer ${
                isFiled 
                  ? 'bg-green-50 border-green-200 shadow-sm' 
                  : 'bg-white border-gray-200'
              }`}
              onClick={() => setSelectedPetition(petition)}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg flex-shrink-0 transition-colors ${
                  isFiled ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-juris-700'
                }`}>
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className={`font-semibold transition-colors flex items-center gap-2 ${
                    isFiled ? 'text-green-900' : 'text-gray-900 group-hover:text-juris-800'
                  }`}>
                    {petition.action_type || 'Ação Judicial'}
                    {hasDocs && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-800 border border-indigo-200" title="Gerado com análise de documento">
                            <FileBadge size={10} className="mr-1" /> IA Doc
                        </span>
                    )}
                  </h3>
                  
                  {(petition.plaintiff_name || petition.defendant_name) && (
                     <p className={`text-sm font-medium mt-1 truncate max-w-md ${
                       isFiled ? 'text-green-800' : 'text-gray-700'
                     }`}>
                        {petition.plaintiff_name || 'Autor'} <span className={`${isFiled ? 'text-green-600' : 'text-gray-400'} font-normal px-1`}>vs</span> {petition.defendant_name || 'Réu'}
                     </p>
                  )}

                  <div className={`flex items-center gap-4 mt-2 text-sm ${
                    isFiled ? 'text-green-700' : 'text-gray-500'
                  }`}>
                    <span className={`capitalize px-2 py-0.5 rounded text-xs border ${
                      isFiled 
                        ? 'bg-green-100 border-green-200 text-green-800' 
                        : 'bg-gray-100 border-gray-200 text-gray-600'
                    }`}>
                      {petition.area}
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <Calendar size={12} />
                      {new Date(petition.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                 {/* Peticionado Checkbox */}
                <div 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                    isFiled ? 'bg-green-100 text-green-800' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                  onClick={(e) => handleToggleFiled(e, petition.id, petition.filed)}
                >
                  {isFiled ? (
                    <CheckSquare size={18} className="text-green-600" />
                  ) : (
                    <Square size={18} className="text-gray-400" />
                  )}
                  <span className="text-xs font-medium select-none">
                    {isFiled ? 'Peticionado' : 'Peticionar'}
                  </span>
                </div>

                <Button 
                  variant="ghost" 
                  className={`${isFiled ? 'text-green-700 hover:text-green-900 hover:bg-green-100' : 'text-gray-400 hover:text-juris-600'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrint(petition.content);
                  }}
                  title="Imprimir"
                >
                  <Printer size={20} />
                </Button>

                <Button 
                  variant="ghost" 
                  className={`${isFiled ? 'text-green-700 hover:text-green-900 hover:bg-green-100' : 'text-gray-400 hover:text-juris-600'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPetition(petition);
                  }}
                >
                  <Eye size={20} className="mr-2" /> Visualizar
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};