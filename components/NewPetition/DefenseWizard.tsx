
import React, { useState, useRef, useEffect } from 'react';
import { PetitionFormData, PetitionFilingMetadata, PetitionParty, UsageLimit } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import saveAs from 'file-saver';
import { 
  ChevronRight, 
  ChevronLeft, 
  FileText, 
  User, 
  Scale, 
  Gavel, 
  CheckCircle, 
  Sparkles,
  Save,
  Printer,
  Upload,
  FileCheck,
  Loader2,
  Trash2,
  Plus,
  FileBadge,
  X,
  Mic,
  MicOff,
  Download,
  FileAudio,
  Maximize2,
  Info,
  Edit3,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Archive,
  RefreshCw,
  FileUp,
  Briefcase,
  ImageIcon
} from 'lucide-react';
// Corrected import: refineLegalPetition does not exist in aiService.ts, using chatRefinePetition instead.
import { generateLegalDefense, chatRefinePetition, suggestFilingMetadata, extractDataFromDocument, transcribeAudio } from '../../services/aiService';

interface WizardProps {
  userId: string;
  onCancel: () => void;
  onSuccess: () => void;
  usage: UsageLimit | null;
  accountStatus: string;
  isAdmin?: boolean;
}

const INITIAL_PARTY: PetitionParty = {
  id: '1',
  name: '', type: 'pf', doc: '', address: '', qualification: ''
};

const INITIAL_DATA: PetitionFormData = {
  area: 'civel',
  actionType: 'Contestação',
  jurisdiction: '',
  plaintiffs: [{...INITIAL_PARTY, id: 'p1'}],
  defendants: [{...INITIAL_PARTY, id: 'd1'}],
  facts: '',
  requests: [],
  evidence: 'Todas as provas admitidas em direito',
  value: '',
  analyzedDocuments: []
};

export const DefenseWizard: React.FC<WizardProps> = ({ userId, onCancel, onSuccess, usage, accountStatus, isAdmin = false }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PetitionFormData>(INITIAL_DATA);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [filingSuggestions, setFilingSuggestions] = useState<PetitionFilingMetadata | null>(null);
  
  const [isFullScreen, setIsFullScreen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const [refinementText, setRefinementText] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<'facts' | 'requests' | null>(null);
  const recognitionRef = useRef<any>(null);

  const STEPS = [
    { id: 1, title: 'Upload do Arquivo', icon: FileUp },
    { id: 2, title: 'Dados das Partes', icon: User }, 
    { id: 3, title: 'Tese de Defesa', icon: Shield },
    { id: 4, title: 'Pedidos', icon: Gavel },
    { id: 5, title: 'Gerar Defesa', icon: Sparkles },
  ];

  useEffect(() => {
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, []);
  
  useEffect(() => {
    if (isFullScreen && contentRef.current && generatedContent) {
        if (!contentRef.current.innerHTML || contentRef.current.innerHTML === '<br>') {
            contentRef.current.innerHTML = generatedContent;
        }
    }
  }, [isFullScreen, generatedContent]);

  const handleInputChange = (field: keyof PetitionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateParty = (type: 'plaintiffs' | 'defendants', id: string, field: keyof PetitionParty, value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsExtracting(true);
    try {
        const analysis = await extractDataFromDocument(file);
        setFormData(prev => {
          const newPlaintiffs = analysis.plaintiffs?.map((p: any) => ({...p, id: Math.random().toString()})) || [];
          const newDefendants = analysis.defendants?.map((p: any) => ({...p, id: Math.random().toString()})) || [];
          return {
            ...prev,
            area: analysis.area || prev.area,
            actionType: analysis.actionType ? `Contestação em ${analysis.actionType}` : prev.actionType,
            jurisdiction: analysis.jurisdiction || prev.jurisdiction,
            facts: `RESUMO DA INICIAL:\n${analysis.summary || ''}\n\n${analysis.facts || ''}`,
            plaintiffs: newPlaintiffs.length > 0 ? newPlaintiffs : prev.plaintiffs,
            defendants: newDefendants.length > 0 ? newDefendants : prev.defendants,
            analyzedDocuments: [{ id: Math.random().toString(), fileName: file.name, docType: analysis.docType || 'Documento Analisado' }]
          };
        });
        setIsExtracting(false);
        setUploadSuccess(true);
    } catch (error) {
        setIsExtracting(false);
        alert("Erro ao ler o arquivo.");
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'facts' | 'requests') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsTranscribing(true);
    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Data = (event.target?.result as string).split(',')[1];
            const transcription = await transcribeAudio(base64Data, files[0].type);
            if (targetField === 'facts') {
                setFormData(prev => ({ ...prev, facts: prev.facts + (prev.facts ? '\n\n' : '') + transcription }));
            } else {
                const current = formData.requests.join('\n');
                setFormData(prev => ({ ...prev, requests: (current + (current ? '\n' : '') + transcription).split('\n') }));
            }
            setIsTranscribing(false);
        };
        reader.readAsDataURL(files[0]);
    } catch (error) {
        setIsTranscribing(false);
        alert("Erro ao transcrever áudio.");
    }
  };

  const toggleRecording = (targetField: 'facts' | 'requests') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Sem suporte a voz.");
    if (isListening) { recognitionRef.current?.stop(); return; }
    
    setVoiceTarget(targetField);
    const rec = new SpeechRecognition();
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.onresult = (e: any) => {
        const text = e.results[e.results.length - 1][0].transcript;
        if (targetField === 'facts') {
            setFormData(prev => ({ ...prev, facts: prev.facts + ' ' + text }));
        } else {
            setFormData(prev => {
                const current = prev.requests.join('\n');
                return { ...prev, requests: (current + ' ' + text).split('\n') };
            });
        }
    };
    rec.onstart = () => setIsListening(true);
    rec.onend = () => { setIsListening(false); setVoiceTarget(null); };
    recognitionRef.current = rec;
    rec.start();
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const content = await generateLegalDefense(formData);
      setGeneratedContent(content);
      setIsFullScreen(true);
    } catch (error) {
      alert("Erro na geração.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    const finalContent = contentRef.current?.innerHTML || generatedContent;
    if (!finalContent || !userId) return;
    setIsSaving(true);
    try {
        const metadata = await suggestFilingMetadata(finalContent);

        const { error } = await supabase.from('petitions').insert([{
            user_id: userId,
            area: formData.area || 'civel',
            action_type: formData.actionType || 'Contestação',
            content: finalContent,
            created_at: new Date().toISOString(),
            plaintiff_name: formData.plaintiffs[0]?.name || 'Polo Ativo',
            defendant_name: formData.defendants[0]?.name || 'Polo Passivo',
            analyzed_documents: formData.analyzedDocuments || [],
            filed: false,
            competence: metadata.competence,
            legal_class: metadata.class,
            subject: metadata.subject,
            filing_url: metadata.filingUrl || ''
        }]).select().single();

        if(error) throw error;
        onSuccess();
    } catch(e: any) { alert("Erro ao salvar."); } finally { setIsSaving(false); }
  };

  const handleDownloadDoc = () => {
    const contentToSave = contentRef.current?.innerHTML || generatedContent;
    if (!contentToSave) return;
    const blobContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><style>
          @page { size: 21cm 29.7cm; margin: 3cm 2cm 2cm 3cm; }
          body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; text-align: justify; }
          .modern-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .modern-table th { background-color: #0f172a; color: white; padding: 10px; border: 1px solid #1e293b; }
          .modern-table td { padding: 10px; border: 1px solid #e2e8f0; }
          p { margin-bottom: 12pt; text-indent: 1.25cm; }
      </style></head>
      <body><div>${contentToSave}</div></body></html>
    `;
    const blob = new Blob(['\ufeff', blobContent], { type: 'application/msword' });
    saveAs(blob, `Contestacao.doc`);
  };

  const renderStepContent = () => {
    if (currentStep === 1) {
        return (
          <div className="space-y-6 text-center py-10">
             <div className={`border-4 border-dashed rounded-[3rem] p-16 transition-all ${uploadSuccess ? 'bg-emerald-50 border-emerald-200' : isExtracting ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200 hover:border-red-400'}`}>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf, .doc, .docx, .txt, image/*" />
                {isExtracting ? (
                    <div className="flex flex-col items-center gap-6">
                        <Loader2 className="h-16 w-16 text-red-600 animate-spin" />
                        <p className="font-black text-slate-900 text-xl">Analisando Peça ou Imagem...</p>
                    </div>
                ) : uploadSuccess ? (
                    <div className="flex flex-col items-center gap-4 animate-in zoom-in">
                        <CheckCircle size={64} className="text-emerald-500" />
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Documento / Foto Lida!</h3>
                        <Button variant="outline" size="md" onClick={() => fileInputRef.current?.click()} className="rounded-xl border-2 mt-4 font-black uppercase text-xs">Substituir PDF ou Imagem</Button>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-center gap-4 mb-6">
                            <ShieldAlert className="h-14 w-14 text-red-400" />
                            <ImageIcon className="h-14 w-14 text-orange-400" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-4 uppercase">PDF ou Foto da Inicial</h3>
                        <p className="text-slate-400 text-sm font-medium mb-10 max-w-sm mx-auto">Envie o PDF da Inicial ou fotos da Sentença para extrairmos a tese adversa via IA Vision.</p>
                        <Button size="lg" className="rounded-2xl bg-red-600 font-black tracking-widest px-10 h-16 shadow-xl" onClick={() => fileInputRef.current?.click()}>SELECIONAR PDF / IMAGEM</Button>
                    </>
                )}
             </div>
          </div>
        );
    }
    if (currentStep === 2) {
        return (
          <div className="space-y-8 animate-in fade-in">
             <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100 shadow-sm">
                 <h2 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest mb-4 flex items-center gap-2"><User size={14}/> Dados do seu Cliente (Réu)</h2>
                 {formData.defendants.map((party) => (
                    <div key={party.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <input className="h-11 w-full rounded-xl border-2 border-emerald-100 px-4 text-xs font-bold" value={party.name} onChange={(e) => updateParty('defendants', party.id!, 'name', e.target.value)} placeholder="Nome ou Razão Social" />
                        <input className="h-11 w-full rounded-xl border-2 border-emerald-100 px-4 text-xs font-bold" value={party.doc} onChange={(e) => updateParty('defendants', party.id!, 'doc', e.target.value)} placeholder="CPF/CNPJ" />
                    </div>
                 ))}
             </div>
             <div className="bg-rose-50/50 p-6 rounded-[2rem] border border-rose-100 shadow-sm">
                 <h2 className="text-[10px] font-black text-rose-900 uppercase tracking-widest mb-4 flex items-center gap-2"><Briefcase size={14}/> Parte Contrária (Autor)</h2>
                 {formData.plaintiffs.map((party) => (
                    <div key={party.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <input className="h-11 w-full rounded-xl border-2 border-rose-100 px-4 text-xs font-bold" value={party.name} onChange={(e) => updateParty('plaintiffs', party.id!, 'name', e.target.value)} placeholder="Nome Completo" />
                        <input className="h-11 w-full rounded-xl border-2 border-rose-100 px-4 text-xs font-bold" value={party.doc} onChange={(e) => updateParty('plaintiffs', party.id!, 'doc', e.target.value)} placeholder="CPF/CNPJ" />
                    </div>
                 ))}
             </div>
          </div>
        );
    }
    if (currentStep === 3) {
      return (
        <div className="space-y-2 animate-in fade-in">
           <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Fundamentação de Resistência (Tese de Defesa)</label>
           <div className="relative">
              <textarea className="w-full h-80 p-6 border-2 border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-red-100 text-sm font-medium bg-slate-50/50 leading-relaxed transition-all shadow-inner outline-none" value={formData.facts} onChange={e => handleInputChange('facts', e.target.value)} placeholder="Descreva os argumentos de defesa. A IA converterá em fundamentação jurídica técnica." />
              {isTranscribing && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-[2rem] flex flex-col items-center justify-center animate-in fade-in">
                      <Loader2 className="h-10 w-10 text-red-600 animate-spin mb-4" />
                      <span className="text-xs font-black text-red-900 uppercase tracking-widest">Processando áudio defensivo...</span>
                  </div>
              )}
           </div>
           <div className="flex items-center gap-3 px-4 py-2">
              <input type="file" ref={audioInputRef} onChange={e => handleAudioUpload(e, 'facts')} className="hidden" accept="audio/*" />
              <button onClick={() => audioInputRef.current?.click()} className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all border border-red-100 bg-white">
                <FileAudio size={16}/><span className="text-[9px] font-black uppercase tracking-widest">Importar Áudio</span>
              </button>
              <button onClick={() => toggleRecording('facts')} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border shadow-sm ${isListening && voiceTarget === 'facts' ? 'bg-rose-500 text-white border-rose-600 animate-pulse' : 'bg-white text-slate-500 border-slate-200 hover:text-red-600'}`}>
                {isListening && voiceTarget === 'facts' ? <MicOff size={16}/> : <Mic size={16}/>}<span className="text-[9px] font-black uppercase tracking-widest">{isListening && voiceTarget === 'facts' ? 'Ouvindo...' : 'Ditar Tese'}</span>
              </button>
           </div>
        </div>
      );
    }
    if (currentStep === 4) {
      return (
        <div className="space-y-2 animate-in fade-in">
           <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Pedidos de Improcedência e Requerimentos</label>
           <div className="relative">
              <textarea className="w-full h-56 p-6 border-2 border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-red-100 text-sm font-bold bg-slate-50/50 outline-none" value={formData.requests.join('\n')} onChange={e => handleInputChange('requests', e.target.value.split('\n'))} placeholder="Ex: Preliminares, Improcedência Total, Honorários Sucumbenciais..." />
              {isTranscribing && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-[1.5rem] flex flex-col items-center justify-center animate-in fade-in">
                      <Loader2 className="h-8 w-8 text-red-600 animate-spin mb-3" />
                      <span className="text-[10px] font-black text-red-900 uppercase tracking-widest">Analisando pedidos...</span>
                  </div>
              )}
           </div>
           <div className="flex items-center gap-3 px-4 py-2">
              <button onClick={() => audioInputRef.current?.click()} className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all border border-red-100 bg-white">
                <FileAudio size={16}/><span className="text-[9px] font-black uppercase tracking-widest">Importar Áudio</span>
              </button>
              <button onClick={() => toggleRecording('requests')} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border shadow-sm ${isListening && voiceTarget === 'requests' ? 'bg-rose-500 text-white border-rose-600 animate-pulse' : 'bg-white text-slate-500 border-slate-200 hover:text-red-600'}`}>
                {isListening && voiceTarget === 'requests' ? <MicOff size={16}/> : <Mic size={16}/>}<span className="text-[9px] font-black uppercase tracking-widest">{isListening && voiceTarget === 'requests' ? 'Ouvindo...' : 'Ditar Pedidos'}</span>
              </button>
           </div>
        </div>
      );
    }
    if (currentStep === 5) {
      return (
          <div className="text-center py-12 animate-in zoom-in-95">
              {isGenerating ? (
                  <div className="flex flex-col items-center gap-8">
                      <div className="relative">
                          <Sparkles className="h-20 w-20 text-red-600 animate-pulse" />
                          <div className="absolute inset-0 bg-red-400/20 rounded-full blur-2xl animate-ping" />
                      </div>
                      <h3 className="text-4xl font-black text-slate-900 tracking-tighter">Gerando Defesa Técnica...</h3>
                  </div>
              ) : (
                  <>
                      <Shield className="h-20 w-20 text-slate-950 mx-auto mb-8" />
                      <h3 className="text-5xl font-black text-slate-950 tracking-tighter mb-4">Revisão e Geração</h3>
                      <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.3em] mb-12">Confirme os dados antes da IA redigir a contestação sênior.</p>
                      <Button size="lg" onClick={handleGenerate} className="h-24 px-20 text-2xl rounded-[2.5rem] bg-red-700 shadow-2xl hover:scale-105 hover:bg-red-800 transition-all text-white font-black">
                         <Sparkles size={28} className="mr-4 text-red-200"/> GERAR CONTESTAÇÃO
                      </Button>
                  </>
              )}
          </div>
      );
    }
    return null;
  };

  if (isFullScreen && generatedContent) {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-200 flex h-screen overflow-hidden">
         <div className="flex-1 flex flex-col h-full bg-slate-300 relative border-r-2 border-slate-300">
            <div className="bg-white border-b-2 border-slate-300 px-8 py-4 flex justify-between items-center shadow-lg shrink-0 z-10">
                <div className="flex items-center gap-6">
                    <button onClick={() => setIsFullScreen(false)} className="p-3 text-slate-400 hover:text-slate-900 bg-slate-100 rounded-2xl transition-all"><X size={20}/></button>
                    <div className="flex flex-col">
                        <h2 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none">Editor de Defesas</h2>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Peça Técnica Sênior</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="rounded-xl px-4 h-11 font-black uppercase text-[9px] border-2" onClick={() => window.print()}><Printer size={16} className="mr-2"/> Imprimir</Button>
                    <Button variant="outline" className="rounded-xl px-4 h-11 font-black uppercase text-[9px] border-2" onClick={handleDownloadDoc}><Download size={16} className="mr-2"/> Word</Button>
                    <Button size="md" onClick={handleSave} isLoading={isSaving} className="rounded-xl bg-slate-900 text-white px-6 h-11 font-black uppercase text-[9px] shadow-xl"><Save size={16} className="mr-2"/> SALVAR</Button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-12 flex flex-col items-center custom-scrollbar">
                <div className="w-full max-w-[21.2cm] bg-white shadow-2xl border border-slate-400 mb-20">
                    <div 
                        ref={contentRef}
                        className="w-full min-h-[29.7cm] p-[3cm_2cm_3cm_3cm] box-border focus:ring-0 outline-none"
                        contentEditable={true} 
                        suppressContentEditableWarning={true} 
                        style={{ fontFamily: '"Times New Roman", serif', fontSize: '12pt', lineHeight: '1.5', textAlign: 'justify' }}
                        dangerouslySetInnerHTML={{ __html: generatedContent }}
                    />
                </div>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="w-full py-4">
        <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-6 duration-500">
          <div className="bg-slate-50 px-10 py-6 border-b border-slate-200 flex justify-between items-center">
            <div className="flex gap-8 overflow-x-auto no-scrollbar py-1">
                {STEPS.map((s, idx) => (
                    <div key={s.id} className={`flex items-center gap-2 shrink-0 ${currentStep === idx + 1 ? 'text-slate-950' : 'text-slate-300'}`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${currentStep === idx + 1 ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>{idx+1}</div>
                        <span className="hidden md:inline text-[9px] uppercase font-black tracking-widest">{s.title}</span>
                    </div>
                ))}
            </div>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-950 p-2 transition-colors"><X size={20}/></button>
          </div>
          <div className="p-8 md:p-10 max-h-[82vh] overflow-y-auto custom-scrollbar">{renderStepContent()}</div>
          <div className="bg-slate-50 px-10 py-6 border-t border-slate-200 flex justify-between items-center">
              <Button variant="outline" className="rounded-2xl px-8 h-12 font-black uppercase text-[10px] tracking-widest border-2" onClick={() => { if(currentStep===1) onCancel(); else setCurrentStep(prev=>prev-1); }}>Voltar</Button>
              {currentStep < 5 && (
                  <Button className="rounded-2xl px-12 h-12 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-200 bg-red-700 text-white hover:bg-red-800 transition-all" onClick={() => setCurrentStep(prev=>prev+1)} disabled={currentStep === 1 && !uploadSuccess}>Próximo: {STEPS[currentStep].title}</Button>
              )}
          </div>
        </div>
    </div>
  );
};
