import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Petition } from '../types';
import saveAs from 'file-saver';
import { FileText, Calendar, ChevronRight, Search, Eye, CheckSquare, Square, Printer, FileBadge, Download, Trash2, Edit3, Info } from 'lucide-react';
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
    e.stopPropagation(); 
    const newStatus = !currentStatus;

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
      setPetitions(prev => prev.map(p => 
        p.id === petitionId ? { ...p, filed: currentStatus } : p
      ));
    }
  };

  const handleDownloadDoc = (content: string, title?: string) => {
    if (!content) return;

    const cleanContent = content
        .replace(/<style([\s\S]*?)<\/style>/gi, '')
        .replace(/<html([\s\S]*?)>/gi, '')
        .replace(/<\/html>/gi, '')
        .replace(/<body([\s\S]*?)>/gi, '')
        .replace(/<\/body>/gi, '')
        .replace(/<!DOCTYPE([\s\S]*?)>/gi, '')
        .trim();

    const blobContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <style>
          @page Section1 { 
            size: 21cm 29.7cm; 
            margin: 2cm 2cm 2cm 3cm; 
            mso-header-margin: 35.4pt; 
            mso-footer-margin: 35.4pt; 
            mso-paper-source: 0; 
          }
          div.Section1 { page: Section1; }
          body { 
            font-family: "Times New Roman", serif; 
            font-size: 12pt; 
            line-height: 1.5; 
            text-align: justify; 
            color: #000;
          }
          p { 
            margin: 0; 
            margin-bottom: 12pt; 
            text-indent: 1.25cm; 
            text-align: justify; 
          }
          h1, h2, h3 { 
            text-align: center; 
            font-weight: bold; 
            text-transform: uppercase; 
            margin: 18pt 0 12pt 0; 
            text-indent: 0; 
            font-size: 12pt;
          }
        </style>
      </head>
      <body>
        <div class="Section1">
          ${cleanContent}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', blobContent], { type: 'application/msword' });
    const safeTitle = title ? title.replace(/[\\/:*?"<>|]/g, '_') : 'Peticao';
    saveAs(blob, `${safeTitle}.doc`);
  };

  const handlePrint = (content: string) => {
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const clean = content.replace(/<style([\s\S]*?)<\/style>/gi, '');
    printWindow.document.write(`
      <html>
        <head>
          <style>
            @page { margin: 2.5cm 2cm 2.5cm 3cm; }
            body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; color: #000; padding: 0; margin: 0; }
            p { text-align: justify; text-indent: 1.25cm; margin-bottom: 12pt; margin-top: 0; }
            h1, h2, h3 { text-align: center; text-transform: uppercase; font-weight: bold; margin: 18pt 0 12pt 0; text-indent: 0; }
            .print-container { padding: 2.5cm 2cm 2.5cm 3cm; }
          </style>
        </head>
        <body><div class="print-container">${clean}</div></body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Excluir esta petição permanentemente?")) return;
    try {
      await supabase.from('petitions').delete().eq('id', id);
      setPetitions(prev => prev.filter(p => p.id !== id));
    } catch (error) { alert("Erro ao excluir."); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-juris-900"></div></div>;

  if (selectedPetition) {
    return (
      <div className="bg-gray-100 rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[90vh] flex flex-col">
        <div className="border-b bg-white px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-juris-50 text-juris-900 rounded-lg">
                <FileText size={20} />
             </div>
             <div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">{selectedPetition.action_type}</h2>
                <p className="text-xs text-gray-500 uppercase font-semibold">{selectedPetition.plaintiff_name} vs {selectedPetition.defendant_name}</p>
             </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedPetition(null)}>Voltar</Button>
            <Button variant="outline" onClick={() => handleDownloadDoc(selectedPetition.content, selectedPetition.action_type)}><Download size={16} className="mr-2" /> Word</Button>
            <Button variant="outline" onClick={() => handlePrint(selectedPetition.content)}><Printer size={16} className="mr-2" /> Imprimir</Button>
            <Button className="bg-juris-700 pointer-events-none"><Edit3 size={16} className="mr-2" /> Modo Edição Ativo</Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-slate-200 p-4 md:p-10 flex flex-col items-center">
            <div className="w-full max-w-[21cm] mb-6 flex items-center gap-2 text-juris-800 bg-juris-50 px-4 py-3 rounded-lg border border-juris-100 shadow-sm">
                <Info size={18} className="text-juris-600 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">Documento Editável: O texto abaixo será salvo automaticamente ao ser alterado.</span>
            </div>
            
            <div className="relative w-full max-w-[21cm]">
              <div 
                className="bg-white shadow-2xl p-[3cm_2cm_3cm_3cm] h-auto min-h-[29.7cm] border border-gray-200 mb-20 focus:ring-0 outline-none"
                contentEditable={true}
                suppressContentEditableWarning={true}
                onBlur={e => {
                    const newContent = e.currentTarget.innerHTML;
                    supabase.from('petitions').update({ content: newContent }).eq('id', selectedPetition.id);
                }}
                style={{ width: '100%', fontFamily: '"Times New Roman", serif', fontSize: '12pt', lineHeight: '1.5', color: 'black', boxSizing: 'border-box' }}
              >
                <style>{`
                  p { text-align: justify; text-indent: 1.25cm; margin-bottom: 12pt; margin-top: 0; outline: none; }
                  h1, h2, h3 { text-align: center; text-transform: uppercase; font-weight: bold; margin: 18pt 0 12pt 0; text-indent: 0; outline: none; }
                `}</style>
                <div dangerouslySetInnerHTML={{ __html: selectedPetition.content.replace(/<style([\s\S]*?)<\/style>/gi, '') }} />
              </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Minhas Petições</h1>
        <div className="relative w-64">
          <input type="text" placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-juris-500 text-sm" />
          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
        </div>
      </div>

      <div className="grid gap-4">
        {petitions.map((petition) => {
          const isFiled = petition.filed === true;
          return (
            <div 
              key={petition.id}
              className={`p-4 rounded-xl border hover:shadow-md transition-all flex items-center justify-between group cursor-pointer ${isFiled ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-gray-200'}`}
              onClick={() => setSelectedPetition(petition)}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${isFiled ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-juris-700'}`}>
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{petition.action_type}</h3>
                  <p className="text-sm text-gray-600 truncate max-w-md">{petition.plaintiff_name} vs {petition.defendant_name}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="capitalize bg-gray-100 px-2 py-0.5 rounded font-medium">{petition.area}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} />{new Date(petition.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${isFiled ? 'bg-green-100 text-green-800' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`} 
                  onClick={(e) => handleToggleFiled(e, petition.id, petition.filed)}
                >
                  {isFiled ? <CheckSquare size={18} className="text-green-600" /> : <Square size={18} />}
                  <span className="text-xs font-bold uppercase tracking-wider">{isFiled ? 'Peticionado' : 'Peticionar'}</span>
                </div>
                <button 
                  onClick={(e) => handleDelete(e, petition.id)} 
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Excluir petição"
                >
                  <Trash2 size={20}/>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};