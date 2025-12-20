
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { Petition } from '../types';
import saveAs from 'file-saver';
import { 
  FileText, 
  Calendar, 
  Search, 
  Printer, 
  Download, 
  Trash2, 
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  X,
  Loader2,
  Save,
  CheckCircle2,
  CheckSquare,
  Square,
  MapPin,
  Tag,
  Briefcase,
  ExternalLink,
  ArrowUpRight,
  ArrowLeft
} from 'lucide-react';
import { Button } from './ui/Button';

interface PetitionListProps {
  userId: string;
}

export const PetitionList: React.FC<PetitionListProps> = ({ userId }) => {
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPetition, setSelectedPetition] = useState<Petition | null>(null);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

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
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleToggleFiled = async (e: React.MouseEvent, petitionId: string, currentStatus: boolean | undefined) => {
    e.stopPropagation(); 
    const newStatus = !currentStatus;
    setPetitions(prev => prev.map(p => p.id === petitionId ? { ...p, filed: newStatus } : p));
    try {
        await supabase.from('petitions').update({ filed: newStatus }).eq('id', petitionId);
    } catch (err) {
        fetchPetitions();
        alert("Erro ao atualizar status.");
    }
  };

  const handleSaveManual = async () => {
    if (!selectedPetition || !editorRef.current) return;
    setIsSavingManual(true);
    try {
        const newContent = editorRef.current.innerHTML;
        await supabase.from('petitions').update({ content: newContent }).eq('id', selectedPetition.id);
        setPetitions(prev => prev.map(p => p.id === selectedPetition.id ? { ...p, content: newContent } : p));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
        alert("Falha ao salvar.");
    } finally {
        setIsSavingManual(false);
    }
  };

  const handleDownloadDoc = (e: React.MouseEvent | null, petition: Petition) => {
    if (e) e.stopPropagation();
    const contentToSave = (selectedPetition?.id === petition.id && editorRef.current) ? editorRef.current.innerHTML : petition.content;
    const blobContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><style>
          @page { size: 21cm 29.7cm; margin: 3cm 2cm 2cm 3cm; }
          body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; text-align: justify; }
          p { margin-bottom: 12pt; text-indent: 1.25cm; }
          h2 { text-align: center; text-transform: uppercase; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
          table td, table th { border: 1px solid #000; padding: 5px; }
      </style></head>
      <body><div>${contentToSave}</div></body></html>
    `;
    const blob = new Blob(['\ufeff', blobContent], { type: 'application/msword' });
    saveAs(blob, `${petition.plaintiff_name || 'Peticao'}_JurisPet.doc`);
  };

  const isValidUrl = (url: string | undefined): boolean => {
    if (!url || url.length < 5) return false;
    // Permite qualquer URL que contenha jus.br ou gov.br, sendo menos restritivo no parsing
    return url.toLowerCase().includes('.jus.br') || url.toLowerCase().includes('.gov.br');
  };

  const handleOpenPortal = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    const formatted = url.startsWith('http') ? url : `https://${url}`;
    window.open(formatted, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Deseja excluir esta petição?")) return;
    await supabase.from('petitions').delete().eq('id', id);
    setPetitions(prev => prev.filter(p => p.id !== id));
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin h-10 w-10 text-indigo-600" /></div>;

  if (selectedPetition) {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-300 dark:bg-slate-950 flex flex-col h-screen overflow-hidden">
        <div className="bg-white dark:bg-slate-900 border-b-2 border-slate-300 dark:border-slate-800 px-8 py-5 flex justify-between items-center shadow-lg shrink-0 z-10 no-print transition-colors">
          <div className="flex items-center gap-5">
             <button onClick={() => setSelectedPetition(null)} className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-2xl transition-all shadow-sm"><ArrowLeft size={20}/></button>
             <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white leading-none uppercase tracking-tighter">{selectedPetition.action_type}</h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Editor de Petição</p>
             </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-xl px-4 h-11 border-2 dark:border-slate-700 font-black text-[9px] uppercase tracking-widest dark:text-slate-300" onClick={() => window.print()}><Printer size={16} className="mr-2" /> Imprimir</Button>
            <Button variant="outline" className="rounded-xl px-4 h-11 border-2 dark:border-slate-700 font-black text-[9px] uppercase tracking-widest dark:text-slate-300" onClick={(e) => handleDownloadDoc(e, selectedPetition)}><Download size={16} className="mr-2" /> Word</Button>
            <Button size="md" className={`rounded-xl px-6 h-11 font-black text-[9px] uppercase tracking-widest shadow-xl transition-all ${saveSuccess ? 'bg-emerald-600' : 'bg-indigo-600'} text-white border-none`} onClick={handleSaveManual} isLoading={isSavingManual}>
              {saveSuccess ? <CheckCircle2 size={16} className="mr-2" /> : <Save size={16} className="mr-2" />}
              {saveSuccess ? 'SUCESSO' : 'SALVAR'}
            </Button>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-300 dark:border-slate-800 px-8 py-2.5 flex items-center gap-2 shrink-0 shadow-sm no-print">
            <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 p-1 mr-4">
                <button onClick={() => document.execCommand('bold')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300"><Bold size={16}/></button>
                <button onClick={() => document.execCommand('italic')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300"><Italic size={16}/></button>
                <button onClick={() => document.execCommand('underline')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300"><Underline size={16}/></button>
            </div>
            <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 p-1">
                <button onClick={() => document.execCommand('justifyLeft')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300"><AlignLeft size={16}/></button>
                <button onClick={() => document.execCommand('justifyCenter')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300"><AlignCenter size={16}/></button>
                <button onClick={() => document.execCommand('justifyRight')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300"><AlignRight size={16}/></button>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-slate-300 dark:bg-slate-900 p-12 flex flex-col items-center custom-scrollbar">
            <div className="w-full max-w-[21.2cm] bg-white shadow-2xl rounded-sm border border-slate-400">
              <div 
                ref={editorRef}
                className="w-full h-auto min-h-[29.7cm] p-[3cm_2cm_3cm_3cm] box-border outline-none text-left"
                contentEditable={true}
                suppressContentEditableWarning={true}
                style={{ fontFamily: '"Times New Roman", serif', fontSize: '12pt', lineHeight: '1.5', color: '#000', textAlign: 'justify', backgroundColor: '#ffffff' }}
                dangerouslySetInnerHTML={{ __html: selectedPetition.content }}
              />
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto w-full pb-20">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Minhas Petições</h1>
        <div className="relative w-72 md:w-80">
          <input type="text" placeholder="Buscar petição..." className="w-full pl-12 pr-6 h-12 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-sm focus:border-indigo-500 outline-none transition-all dark:text-white shadow-inner" />
          <Search className="absolute left-4 top-3.5 text-slate-300 dark:text-slate-600 w-5 h-5" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {petitions.map((petition) => {
          const validUrl = isValidUrl(petition.filing_url);
          return (
            <div key={petition.id} className={`p-6 md:p-8 rounded-[3rem] border-2 transition-all flex flex-col gap-6 shadow-sm cursor-pointer ${petition.filed ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/20' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-600 dark:hover:border-indigo-500'}`} onClick={() => setSelectedPetition(petition)}>
              <div className="flex items-start justify-between w-full">
                  <div className="flex items-start gap-6 text-left">
                      <div className={`p-4 rounded-2xl shadow-sm border ${petition.filed ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                          <FileText size={32} />
                      </div>
                      <div>
                          <h3 className="font-black text-slate-900 dark:text-white uppercase text-xs md:text-sm mb-1 tracking-tight">{petition.action_type}</h3>
                          <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 font-bold leading-tight">
                          {petition.plaintiff_name || 'Autor'} <span className="text-slate-300 dark:text-slate-700 mx-1">VS</span> {petition.defendant_name || 'Réu'}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 mt-3">
                              <span className={`${petition.filed ? 'bg-emerald-200 text-emerald-900' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'} px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest`}>{petition.area}</span>
                              <span className="flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest"><Calendar size={12} /> {new Date(petition.created_at).toLocaleDateString()}</span>
                          </div>
                      </div>
                  </div>
                  <div className="flex items-center gap-2 no-print shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); window.print(); }} className="p-3 text-slate-400 hover:text-indigo-600 rounded-xl transition-all" title="Imprimir"><Printer size={20} /></button>
                      <button onClick={(e) => handleDownloadDoc(e, petition)} className="p-3 text-slate-400 hover:text-emerald-600 rounded-xl transition-all" title="Download Word"><Download size={20} /></button>
                      <div className="w-px h-8 bg-slate-100 dark:bg-slate-800 mx-1" />
                      <button className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-sm border-2 ${petition.filed ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800'}`} onClick={(e) => handleToggleFiled(e, petition.id, petition.filed)}>
                          {petition.filed ? <CheckSquare size={16} /> : <Square size={16} />} {petition.filed ? 'PROTOCOLADO' : 'PROTOCOLAR'}
                      </button>
                      <button onClick={(e) => handleDelete(e, petition.id)} className="p-3 text-slate-200 dark:text-slate-700 hover:text-rose-600 transition-all"><Trash2 size={24}/></button>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                  {[
                    { label: 'Competência', value: petition.competence, icon: MapPin },
                    { label: 'Classe', value: petition.legal_class, icon: Tag },
                    { label: 'Assunto', value: petition.subject, icon: Briefcase }
                  ].map((meta, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left">
                        <div className="flex items-center gap-2 mb-2 text-slate-400">
                            <meta.icon size={12} />
                            <span className="text-[8px] font-black uppercase tracking-widest">{meta.label}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase leading-tight line-clamp-2">{meta.value || 'Pendente'}</p>
                    </div>
                  ))}
              </div>

              {validUrl && (
                  <button 
                    onClick={(e) => handleOpenPortal(e, petition.filing_url!)}
                    className="flex items-center justify-between w-full p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all group shadow-lg"
                  >
                      <div className="flex items-center gap-3">
                          <ExternalLink size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Acessar Portal de Peticionamento Oficial</span>
                      </div>
                      <ArrowUpRight size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </button>
              )}
            </div>
          );
        })}
        {petitions.length === 0 && (
            <div className="py-24 text-center border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem]">
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhuma petição registrada no acervo.</p>
            </div>
        )}
      </div>
    </div>
  );
};
