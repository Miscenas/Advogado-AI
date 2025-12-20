
import React, { useState, useRef, useEffect } from 'react';
import { PetitionFormData, PetitionFilingMetadata, PetitionParty, UsageLimit } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { Button } from '../ui/Button';
import saveAs from 'file-saver';
import { 
  User, 
  Scale, 
  CheckCircle, 
  Sparkles,
  Save,
  Printer,
  Loader2,
  PenTool,
  FileUp,
  X,
  Download,
  Mic,
  MicOff,
  Send,
  MessageSquare,
  History,
  Trash2,
  ArrowRight,
  ImageIcon,
  Gavel,
  ShieldCheck,
  Info,
  MapPin,
  CreditCard,
  Briefcase,
  FileAudio
} from 'lucide-react';
import { 
  generateLegalPetition, 
  extractDataFromDocument, 
  suggestFilingMetadata, 
  chatRefinePetition, 
  transcribeAudio 
} from '../../services/aiService';

interface WizardProps {
  userId: string;
  onCancel: () => void;
  onSuccess: () => void;
  usage: UsageLimit | null;
  accountStatus: string;
  isAdmin?: boolean;
}

type WizardMode = 'selection' | 'scratch' | 'upload';
interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

const INITIAL_PARTY: PetitionParty = { id: '', name: '', type: 'pf', doc: '', rg: '', address: '', qualification: '' };

const INITIAL_DATA: PetitionFormData = {
  area: 'civel',
  actionType: '',
  jurisdiction: '',
  plaintiffs: [{...INITIAL_PARTY, id: 'p1'}],
  defendants: [{...INITIAL_PARTY, id: 'd1'}],
  facts: '',
  requests: [],
  evidence: 'Documental e testemunhal',
  value: 'R$ 0,00',
  analyzedDocuments: []
};

const AREAS_DO_DIREITO = [
  { value: 'civel', label: 'Cível' },
  { value: 'trabalhista', label: 'Trabalhista' },
  { value: 'familia', label: 'Família e Sucessões' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'previdenciario', label: 'Previdenciário' },
  { value: 'consumidor', label: 'Consumidor' },
  { value: 'outros', label: 'Outros' }
];

export const PetitionWizard: React.FC<WizardProps> = ({ userId, onCancel, onSuccess, usage, accountStatus }) => {
  const [mode, setMode] = useState<WizardMode>('selection');
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PetitionFormData>(INITIAL_DATA);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  
  const [isFullScreen, setIsFullScreen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Estados do Chat de Refinamento
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [refinementInput, setRefinementInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<'facts' | 'requests' | 'chat' | null>(null);
  const recognitionRef = useRef<any>(null);

  const STEPS = mode === 'upload' 
    ? ['Upload', 'Dados', 'Fatos', 'Pedidos', 'Gerar'] 
    : ['Dados', 'Fatos', 'Pedidos', 'Gerar'];

  useEffect(() => {
    if (isFullScreen && contentRef.current && generatedContent) {
        contentRef.current.innerHTML = generatedContent;
    }
  }, [isFullScreen, generatedContent]);

  useEffect(() => {
    if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isRefining]);

  const handleInputChange = (field: keyof PetitionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateParty = (type: 'plaintiffs' | 'defendants', id: string, field: keyof PetitionParty, value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const addParty = (type: 'plaintiffs' | 'defendants') => {
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], { ...INITIAL_PARTY, id: Math.random().toString(36).substr(2, 9) }]
    }));
  };

  const removeParty = (type: 'plaintiffs' | 'defendants', id: string) => {
    if (formData[type].length <= 1) return;
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter(p => p.id !== id)
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsExtracting(true);
    try {
      const analysis = await extractDataFromDocument(files[0]);
      if (analysis) {
          setFormData(prev => ({
            ...prev,
            ...analysis,
            plaintiffs: analysis.plaintiffs?.map((p: any) => ({...INITIAL_PARTY, ...p, id: Math.random().toString()})) || prev.plaintiffs,
            defendants: analysis.defendants?.map((p: any) => ({...INITIAL_PARTY, ...p, id: Math.random().toString()})) || prev.defendants,
          }));
          setUploadSuccess(true);
      }
    } catch (e) { alert("Erro ao ler arquivo."); } finally { setIsExtracting(false); }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'facts' | 'requests') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsTranscribing(true);
    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Data = (event.target?.result as string).split(',')[1];
            const transcription = await transcribeAudio(base64Data, files[0].type);
            if (target === 'facts') {
                setFormData(prev => ({ ...prev, facts: prev.facts + (prev.facts ? '\n\n' : '') + transcription }));
            } else {
                setFormData(prev => {
                    const current = prev.requests.join('\n');
                    return { ...prev, requests: (current + (current ? '\n' : '') + transcription).split('\n') };
                });
            }
            setIsTranscribing(false);
        };
        reader.readAsDataURL(files[0]);
    } catch (error) {
        setIsTranscribing(false);
        alert("Erro ao transcrever áudio.");
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const content = await generateLegalPetition(formData);
      setGeneratedContent(content);
      setIsFullScreen(true);
      setChatMessages([{
        role: 'model',
        text: 'Olá! Redigi a petição inicial completa. O que gostaria de ajustar agora?',
        timestamp: new Date()
      }]);
    } catch (error: any) { alert("Erro na geração."); } finally { setIsGenerating(false); }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!refinementInput.trim() || !generatedContent || isRefining) return;

    const userText = refinementInput;
    setRefinementInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userText, timestamp: new Date() }]);
    setIsRefining(true);

    try {
        const currentHTML = contentRef.current?.innerHTML || generatedContent;
        const refinedHTML = await chatRefinePetition(currentHTML, userText, chatMessages);
        
        setGeneratedContent(refinedHTML);
        if (contentRef.current) contentRef.current.innerHTML = refinedHTML;
        
        setChatMessages(prev => [...prev, { 
            role: 'model', 
            text: 'Pronto! Apliquei as alterações solicitadas na minuta ao lado. Posso ajudar com algo mais?', 
            timestamp: new Date() 
        }]);
    } catch (e) { 
        setChatMessages(prev => [...prev, { 
            role: 'model', 
            text: 'Desculpe, tive um erro ao processar sua instrução. Pode tentar novamente?', 
            timestamp: new Date() 
        }]);
    } finally { 
        setIsRefining(false); 
    }
  };

  const toggleVoiceRecording = (target: 'facts' | 'requests' | 'chat') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Navegador sem suporte a voz.");
    if (isListening) { recognitionRef.current?.stop(); return; }
    
    setVoiceTarget(target);
    const rec = new SpeechRecognition();
    rec.lang = 'pt-BR';
    rec.onresult = (e: any) => {
        const transcript = e.results[e.results.length - 1][0].transcript;
        if (target === 'chat') {
            setRefinementInput(prev => prev + ' ' + transcript);
        } else if (target === 'facts') {
            setFormData(prev => ({ ...prev, facts: prev.facts + ' ' + transcript }));
        } else if (target === 'requests') {
            setFormData(prev => {
                const current = prev.requests.join('\n');
                return { ...prev, requests: (current + ' ' + transcript).split('\n') };
            });
        }
    };
    rec.onstart = () => setIsListening(true);
    rec.onend = () => { setIsListening(false); setVoiceTarget(null); };
    recognitionRef.current = rec;
    rec.start();
  };

  const handlePrintEditor = () => {
    const contentToPrint = contentRef.current?.innerHTML || generatedContent;
    if (!contentToPrint) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Por favor, permita pop-ups para imprimir.");
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title> </title>
          <style>
            @page { 
              size: A4; 
              margin: 0mm; 
            }
            body { 
              font-family: "Times New Roman", serif; 
              font-size: 12pt; 
              line-height: 1.5; 
              text-align: justify; 
              margin: 0; 
              padding: 30mm 20mm 20mm 30mm;
              background-color: white !important;
              color: black !important;
            }
            p { margin-bottom: 12pt; text-indent: 1.25cm; }
            table { width: 100% !important; border-collapse: collapse; margin-bottom: 1rem; }
            table th, table td { border: 1px solid #000; padding: 8px; }
          </style>
        </head>
        <body>
          ${contentToPrint}
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadDoc = () => {
    const contentToSave = contentRef.current?.innerHTML || generatedContent;
    if (!contentToSave) return;
    const blobContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><style>
          @page { size: 21cm 29.7cm; margin: 3cm 2cm 2cm 3cm; }
          body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; text-align: justify; }
          p { margin-bottom: 12pt; text-indent: 1.25cm; }
      </style></head>
      <body><div>${contentToSave}</div></body></html>
    `;
    const blob = new Blob(['\ufeff', blobContent], { type: 'application/msword' });
    saveAs(blob, `Peticao_JurisPet.doc`);
  };

  const handleSaveToAcervo = async () => {
    const finalContent = contentRef.current?.innerHTML || generatedContent;
    if (!finalContent) return;
    setIsSaving(true);
    try {
        const metadata = await suggestFilingMetadata(finalContent);
        const { error } = await supabase.from('petitions').insert([{
            user_id: userId, 
            area: formData.area, 
            action_type: formData.actionType,
            content: finalContent, 
            plaintiff_name: formData.plaintiffs[0]?.name || 'Polo Ativo',
            defendant_name: formData.defendants[0]?.name || 'Polo Passivo', 
            created_at: new Date().toISOString(),
            competence: metadata.competence,
            legal_class: metadata.class,
            subject: metadata.subject,
            filing_url: metadata.filingUrl || ''
        }]);
        if (error) throw error;
        onSuccess();
    } catch (e: any) { alert("Erro ao salvar."); } finally { setIsSaving(false); }
  };

  const renderStep = () => {
    const step = STEPS[currentStep - 1];
    switch (step) {
      case 'Upload':
        return (
          <div className="space-y-6 text-center py-4 w-full">
             <div className={`border-4 border-dashed rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-16 transition-all ${uploadSuccess ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' : isExtracting ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800' : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600'}`}>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf, .txt, .doc, .docx, image/*" />
                {isExtracting ? (
                    <div className="flex flex-col items-center gap-6">
                        <Loader2 className="h-12 w-12 md:h-16 md:w-16 text-indigo-600 animate-spin" />
                        <p className="font-black text-slate-900 dark:text-slate-100 text-sm md:text-xl uppercase tracking-widest">Analisando Arquivo...</p>
                    </div>
                ) : uploadSuccess ? (
                    <div className="flex flex-col items-center gap-4 animate-in zoom-in">
                        <CheckCircle size={56} className="text-emerald-500" />
                        <h3 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Extração Concluída</h3>
                        <Button variant="outline" size="md" onClick={() => fileInputRef.current?.click()} className="rounded-xl border-2 mt-4 font-black uppercase text-[10px] dark:border-slate-700">Trocar Documento</Button>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-center gap-4 mb-6">
                            <FileUp className="h-10 w-10 md:h-14 md:w-14 text-indigo-400 dark:text-indigo-500" />
                            <ImageIcon className="h-10 w-10 md:h-14 md:w-14 text-emerald-400 dark:text-emerald-500" />
                        </div>
                        <h3 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 uppercase leading-none">PDF ou Foto do Processo</h3>
                        <p className="text-slate-400 dark:text-slate-500 text-xs md:text-sm font-medium mb-10 max-w-sm mx-auto">Nossa IA Sênior preencherá os dados automaticamente através de documentos ou fotos.</p>
                        <Button size="lg" className="rounded-2xl bg-indigo-600 font-black tracking-widest px-8 md:px-10 h-14 md:h-16 shadow-xl text-xs md:text-sm" onClick={() => fileInputRef.current?.click()}>SUBIR ARQUIVO / IMAGEM</Button>
                    </>
                )}
             </div>
          </div>
        );
      case 'Gerar':
        return (
            <div className="text-center py-10 md:py-12 animate-in zoom-in-95 w-full">
                {isGenerating ? (
                    <div className="flex flex-col items-center gap-6 md:gap-8">
                        <Sparkles className="h-16 w-16 md:h-20 md:w-20 text-indigo-600 animate-pulse" />
                        <h3 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Redigindo Peça Sênior...</h3>
                    </div>
                ) : (
                    <>
                        <Scale className="h-16 w-16 md:h-20 md:w-20 text-slate-950 dark:text-slate-200 mx-auto mb-6 md:mb-8" />
                        <h3 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white tracking-tighter mb-4 uppercase leading-none">Pronto para Gerar</h3>
                        <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px] md:text-[11px] tracking-[0.3em] mb-12 italic">Doutrina e jurisprudência completa serão aplicadas.</p>
                        <Button size="lg" onClick={handleGenerate} className="w-full md:w-auto h-20 md:h-24 px-12 md:px-20 text-lg md:text-2xl rounded-[2rem] md:rounded-[2.5rem] bg-indigo-600 shadow-2xl hover:scale-105 hover:bg-indigo-700 transition-all text-white font-black border-none">
                           <Sparkles size={24} className="mr-3 text-indigo-200"/> GERAR PEÇA COMPLETA
                        </Button>
                    </>
                )}
            </div>
        );
      default:
        return (
            <div className="space-y-6 animate-in fade-in duration-500 w-full text-left">
                {step === 'Dados' && (
                  <div className="space-y-6 md:space-y-8 pb-2 w-full">
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] flex items-start gap-3 md:gap-4">
                        <div className="bg-amber-200 dark:bg-amber-900/40 p-2 rounded-xl text-amber-700 dark:text-amber-500 shrink-0">
                            <Info size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] md:text-xs font-black text-amber-900 dark:text-amber-400 uppercase tracking-tight">Preenchimento Opcional</p>
                            <p className="text-[9px] md:text-[10px] font-bold text-amber-700 dark:text-amber-600 uppercase leading-relaxed mt-1">
                                Dados detalhados podem ser adicionados agora ou editados livremente após a geração da minuta final.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="w-full">
                          <label className="mb-1 block text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Área Jurídica</label>
                          <select className="flex h-11 md:h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all text-xs md:text-sm" value={formData.area} onChange={e => handleInputChange('area', e.target.value)}>
                            {AREAS_DO_DIREITO.map(area => (<option key={area.value} value={area.value}>{area.label}</option>))}
                          </select>
                        </div>
                        <div className="w-full">
                          <label className="mb-1 block text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Tipo de Ação</label>
                          <input type="text" className="flex h-11 md:h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all text-xs md:text-sm" value={formData.actionType} onChange={e => handleInputChange('actionType', e.target.value)} placeholder="Ex: Divórcio Litigioso" />
                        </div>
                    </div>
                    
                    <div className="w-full text-left">
                      <label className="mb-1 block text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Endereçamento (Juízo)</label>
                      <input type="text" className="flex h-11 md:h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all text-xs md:text-sm" value={formData.jurisdiction} onChange={e => handleInputChange('jurisdiction', e.target.value)} placeholder="EX: AO JUÍZO DA VARA CÍVEL..." />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 md:gap-10">
                        <div className="space-y-4 md:space-y-6">
                           <div className="flex items-center justify-between border-b-2 border-indigo-100 dark:border-indigo-900 pb-2 px-1">
                              <label className="text-[9px] md:text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2"><User size={14}/> Polo Ativo (Autor)</label>
                              <button onClick={() => addParty('plaintiffs')} className="text-[8px] md:text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all">+ Novo</button>
                           </div>
                           {formData.plaintiffs.map((party) => (
                               <div key={party.id} className="bg-white dark:bg-slate-900/60 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/50 space-y-4 shadow-sm relative group">
                                  {formData.plaintiffs.length > 1 && (
                                      <button onClick={() => removeParty('plaintiffs', party.id!)} className="absolute -top-2 -right-2 bg-white dark:bg-slate-800 text-rose-500 border border-rose-100 dark:border-rose-900/50 p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all"><X size={12}/></button>
                                  )}
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black text-indigo-300 dark:text-indigo-500 uppercase tracking-widest ml-1">Nome Completo</label>
                                    <input className="h-9 md:h-10 w-full rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-950 px-4 text-[11px] md:text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none" value={party.name} onChange={e => updateParty('plaintiffs', party.id!, 'name', e.target.value)} placeholder="Nome" />
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <div className="space-y-1">
                                        <label className="text-[8px] font-black text-indigo-300 dark:text-indigo-500 uppercase tracking-widest ml-1">CPF/CNPJ</label>
                                        <input className="h-9 md:h-10 w-full rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-950 px-4 text-[11px] md:text-xs font-bold text-slate-900 dark:text-white" value={party.doc} onChange={e => updateParty('plaintiffs', party.id!, 'doc', e.target.value)} placeholder="000.000.000-00" />
                                     </div>
                                     <div className="space-y-1">
                                        <label className="text-[8px] font-black text-indigo-300 dark:text-indigo-500 uppercase tracking-widest ml-1">RG</label>
                                        <input className="h-9 md:h-10 w-full rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-950 px-4 text-[11px] md:text-xs font-bold text-slate-900 dark:text-white" value={party.rg} onChange={e => updateParty('plaintiffs', party.id!, 'rg', e.target.value)} placeholder="0.000.000" />
                                     </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black text-indigo-300 dark:text-indigo-500 uppercase tracking-widest ml-1">Endereço Completo</label>
                                    <input className="h-9 md:h-10 w-full rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-950 px-4 text-[11px] md:text-xs font-bold text-slate-900 dark:text-white" value={party.address} onChange={e => updateParty('plaintiffs', party.id!, 'address', e.target.value)} placeholder="Logradouro, nº, Cidade - UF" />
                                  </div>
                               </div>
                           ))}
                        </div>

                        <div className="space-y-4 md:space-y-6">
                           <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-2 px-1">
                              <label className="text-[9px] md:text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2"><Briefcase size={14}/> Polo Passivo (Réu)</label>
                              <button onClick={() => addParty('defendants')} className="text-[8px] md:text-[9px] font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">+ Novo</button>
                           </div>
                           {formData.defendants.map((party) => (
                               <div key={party.id} className="bg-white dark:bg-slate-900/60 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm relative group">
                                  {formData.defendants.length > 1 && (
                                      <button onClick={() => removeParty('defendants', party.id!)} className="absolute -top-2 -right-2 bg-white dark:bg-slate-800 text-rose-500 border border-rose-100 dark:border-rose-900/50 p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all"><X size={12}/></button>
                                  )}
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome ou Razão Social</label>
                                    <input className="h-9 md:h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 text-[11px] md:text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-800 outline-none" value={party.name} onChange={e => updateParty('defendants', party.id!, 'name', e.target.value)} placeholder="Nome" />
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">CPF/CNPJ</label>
                                        <input className="h-9 md:h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 text-[11px] md:text-xs font-bold text-slate-900 dark:text-white" value={party.doc} onChange={e => updateParty('defendants', party.id!, 'doc', e.target.value)} placeholder="00.000.000/0000-00" />
                                     </div>
                                     <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">RG/Inscrição</label>
                                        <input className="h-9 md:h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 text-[11px] md:text-xs font-bold text-slate-900 dark:text-white" value={party.rg} onChange={e => updateParty('defendants', party.id!, 'rg', e.target.value)} placeholder="Opcional" />
                                     </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Endereço Completo</label>
                                    <input className="h-9 md:h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 text-[11px] md:text-xs font-bold text-slate-900 dark:text-white" value={party.address} onChange={e => updateParty('defendants', party.id!, 'address', e.target.value)} placeholder="Logradouro, nº, Cidade - UF" />
                                  </div>
                               </div>
                           ))}
                        </div>
                    </div>
                  </div>
                )}
                {step === 'Fatos' && (
                  <div className="space-y-4 w-full text-left">
                     <label className="text-[10px] md:text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 text-left">Exposição dos Fatos</label>
                     <div className="relative">
                        <textarea className="w-full h-80 md:h-96 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-800 text-xs md:text-sm font-medium bg-white dark:bg-slate-950/40 text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 transition-all shadow-inner leading-relaxed" value={formData.facts} onChange={e => handleInputChange('facts', e.target.value)} placeholder="Narre os fatos detalhadamente. A IA formatará o texto juridicamente." />
                        {isTranscribing && voiceTarget === 'facts' && (
                          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-[1.5rem] md:rounded-[2.5rem] flex flex-col items-center justify-center animate-in fade-in">
                            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
                            <span className="text-xs font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest">Processando áudio...</span>
                          </div>
                        )}
                     </div>
                     <div className="flex items-center gap-3 px-1">
                        <input type="file" ref={audioInputRef} onChange={e => handleAudioUpload(e, 'facts')} className="hidden" accept="audio/*" />
                        <button onClick={() => audioInputRef.current?.click()} className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-4 py-2 rounded-xl transition-all border border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-slate-900 shadow-sm">
                            <FileAudio size={16}/><span className="text-[9px] font-black uppercase tracking-widest">Importar Áudio</span>
                        </button>
                        <button onClick={() => toggleVoiceRecording('facts')} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border shadow-sm ${isListening && voiceTarget === 'facts' ? 'bg-indigo-600 text-white border-indigo-700 animate-pulse' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-indigo-600'}`}>
                            {isListening && voiceTarget === 'facts' ? <MicOff size={16}/> : <Mic size={16}/>}<span className="text-[9px] font-black uppercase tracking-widest">{isListening && voiceTarget === 'facts' ? 'Ouvindo...' : 'Ditar Fatos'}</span>
                        </button>
                     </div>
                  </div>
                )}
                {step === 'Pedidos' && (
                  <div className="space-y-6 w-full text-left">
                     <label className="text-[10px] md:text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Pedidos e Requerimentos</label>
                     <div className="relative">
                        <textarea className="w-full h-56 md:h-64 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-2 border-slate-200 dark:border-slate-800 text-xs md:text-sm font-bold bg-white dark:bg-slate-950/40 text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 transition-all" value={formData.requests.join('\n')} onChange={e => handleInputChange('requests', e.target.value.split('\n'))} placeholder="Ex: Danos Morais, Liminar, Justiça Gratuita..." />
                        {isTranscribing && voiceTarget === 'requests' && (
                          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-[1.5rem] md:rounded-[2rem] flex flex-col items-center justify-center animate-in fade-in">
                            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
                            <span className="text-xs font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest">Processando áudio...</span>
                          </div>
                        )}
                     </div>
                     <div className="flex items-center gap-3 px-1">
                        <button onClick={() => audioInputRef.current?.click()} className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-4 py-2 rounded-xl transition-all border border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-slate-900 shadow-sm">
                            <FileAudio size={16}/><span className="text-[9px] font-black uppercase tracking-widest">Importar Áudio</span>
                        </button>
                        <button onClick={() => toggleVoiceRecording('requests')} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border shadow-sm ${isListening && voiceTarget === 'requests' ? 'bg-indigo-600 text-white border-indigo-700 animate-pulse' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-indigo-600'}`}>
                            {isListening && voiceTarget === 'requests' ? <MicOff size={16}/> : <Mic size={16}/>}<span className="text-[9px] font-black uppercase tracking-widest">{isListening && voiceTarget === 'requests' ? 'Ouvindo...' : 'Ditar Pedidos'}</span>
                        </button>
                     </div>
                     <div className="max-w-md text-left">
                        <label className="text-[9px] md:text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Valor da Causa (R$)</label>
                        <input className="h-12 md:h-14 w-full rounded-xl md:rounded-2xl border-2 border-slate-200 dark:border-slate-800 px-6 font-black text-lg md:text-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all" value={formData.value} onChange={e => handleInputChange('value', e.target.value)} placeholder="R$ 0,00" />
                     </div>
                  </div>
                )}
            </div>
        );
    }
  };

  if (isFullScreen && generatedContent) {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-100 dark:bg-slate-950 flex flex-col md:flex-row h-screen overflow-hidden">
         <div className="flex-1 flex flex-col h-full bg-slate-200 dark:bg-slate-900 relative overflow-hidden transition-colors">
            <div className="bg-white dark:bg-slate-950 border-b border-slate-300 dark:border-slate-800 px-4 md:px-10 py-3 md:py-5 flex justify-between items-center shadow-lg shrink-0 z-10 no-print transition-colors">
                <div className="flex items-center gap-3 md:gap-6 text-left">
                    <button onClick={() => setIsFullScreen(false)} className="p-2 md:p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 rounded-xl md:rounded-2xl transition-all"><X size={18}/></button>
                    <div className="flex flex-col">
                        <h2 className="text-sm md:text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Editor de Petição</h2>
                    </div>
                </div>
                <div className="flex gap-2 md:gap-3">
                    <Button variant="outline" className="hidden sm:flex rounded-xl px-3 md:px-4 h-10 md:h-12 font-black uppercase text-[8px] md:text-[10px] border-2 dark:border-slate-700 dark:text-slate-300" onClick={handlePrintEditor}><Printer size={16} className="mr-1 md:mr-2"/> Imprimir</Button>
                    <Button variant="outline" className="rounded-xl px-3 md:px-4 h-10 md:h-12 font-black uppercase text-[8px] md:text-[10px] border-2 dark:border-slate-700 dark:text-slate-300" onClick={handleDownloadDoc}><Download size={16} className="mr-1 md:mr-2"/> Word</Button>
                    <Button size="md" onClick={handleSaveToAcervo} isLoading={isSaving} className="rounded-xl bg-slate-900 dark:bg-indigo-600 text-white px-4 md:px-8 h-10 md:h-12 font-black uppercase text-[8px] md:text-[10px] shadow-xl border-none"><Save size={16} className="mr-1 md:mr-2"/> SALVAR</Button>
                </div>
            </div>
            <div className="flex-1 overflow-auto p-4 md:p-12 flex flex-col items-center custom-scrollbar bg-slate-100 dark:bg-slate-900">
                <div className="min-w-[21cm] w-fit sm:w-full sm:max-w-[21.2cm] bg-white shadow-2xl border border-slate-300 mb-20 transition-all origin-top">
                    <div 
                        ref={contentRef}
                        className="w-full min-h-[29.7cm] p-[2cm] md:p-[3cm_2cm_3cm_3cm] box-border focus:ring-0 outline-none text-left"
                        contentEditable={true} 
                        suppressContentEditableWarning={true} 
                        style={{ 
                          fontFamily: '"Times New Roman", serif', 
                          fontSize: '12pt', 
                          lineHeight: '1.5', 
                          textAlign: 'justify',
                          color: '#000000',
                          backgroundColor: '#ffffff' 
                        }}
                    />
                </div>
            </div>
         </div>
         
         <aside className="hidden md:flex w-[400px] lg:w-[450px] h-full bg-slate-50 dark:bg-[#0F172A] flex-col border-l border-slate-200 dark:border-slate-800 shadow-2xl z-20 no-print overflow-hidden transition-colors">
            <div className="p-6 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0 text-left">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg">
                        <MessageSquare size={18} />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Ajustar com IA</h3>
                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter leading-none">Minuta Inteligente Ativa</p>
                    </div>
                </div>
            </div>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50 dark:bg-slate-900/30">
                {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
                        <div className={`max-w-[90%] p-4 rounded-2xl text-[10px] md:text-[11px] font-bold leading-relaxed shadow-sm text-left ${
                            msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                        }`}>
                            {msg.text}
                        </div>
                        <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase mt-2 px-1">
                            {msg.role === 'user' ? 'Advogado' : 'JurisPet IA'} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}
                {isRefining && (
                    <div className="flex items-start gap-3">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                            <Loader2 size={16} className="animate-spin text-indigo-600" />
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">Reescrevendo...</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <form onSubmit={handleSendMessage} className="relative">
                    <input 
                        value={refinementInput} 
                        onChange={e => setRefinementInput(e.target.value)} 
                        disabled={isRefining}
                        className="w-full h-14 pl-6 pr-24 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[11px] font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner" 
                        placeholder="Ex: 'Aumente o dano moral para 20k'..." 
                    />
                    <div className="absolute right-2 top-2 flex items-center gap-1">
                        <button 
                            type="button"
                            onClick={() => toggleVoiceRecording('chat')} 
                            disabled={isRefining}
                            className={`p-3 rounded-xl transition-all ${isListening && voiceTarget === 'chat' ? 'bg-rose-500 text-white animate-pulse' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600 bg-transparent'}`}
                        >
                            <Mic size={18} />
                        </button>
                        <button 
                            type="submit" 
                            disabled={!refinementInput.trim() || isRefining}
                            className="p-3 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all disabled:opacity-30"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </form>
            </div>
         </aside>
      </div>
    );
  }

  return (
    <div className="w-full h-full pb-10 md:pb-20 max-w-6xl mx-auto px-2 md:px-0 text-left">
      {mode === 'selection' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-10">
          <button onClick={() => { setMode('scratch'); setCurrentStep(1); }} className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] hover:border-indigo-600 dark:hover:border-indigo-500 hover:shadow-2xl transition-all h-[340px] md:h-[420px] flex flex-col items-center justify-center text-center group active:scale-95 shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-800 p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] group-hover:bg-indigo-600 group-hover:text-white transition-all mb-6 md:mb-10 shadow-lg border border-slate-100 dark:border-slate-700"><PenTool size={48} className="md:w-16 md:h-16" /></div>
            <h3 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Minuta do Zero</h3>
            <p className="text-slate-400 dark:text-slate-500 mt-4 md:mt-6 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] max-w-[180px]">Redação técnica baseada em narrativa livre.</p>
          </button>
          
          <button onClick={() => { setMode('upload'); setCurrentStep(1); }} className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] hover:border-emerald-600 dark:hover:border-emerald-500 hover:shadow-2xl transition-all h-[340px] md:h-[420px] flex flex-col items-center justify-center text-center group active:scale-95 shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-800 p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] group-hover:bg-emerald-600 group-hover:text-white transition-all mb-6 md:mb-10 shadow-lg border border-slate-100 dark:border-slate-700"><FileUp size={48} className="md:w-16 md:h-16" /></div>
            <h3 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Importar PDF</h3>
            <p className="text-slate-400 dark:text-slate-500 mt-4 md:mt-6 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] max-w-[180px]">Extração automática via IA de arquivos ou fotos.</p>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[4rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden w-full transition-all">
          <div className="bg-slate-50 dark:bg-slate-950/50 px-6 md:px-10 py-5 md:py-8 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex gap-4 md:gap-8 overflow-x-auto no-scrollbar py-1 w-full md:w-auto">
                {STEPS.map((s, idx) => (
                    <div key={s} className={`flex items-center gap-2 shrink-0 ${currentStep === idx + 1 ? 'text-slate-950 dark:text-white' : 'text-slate-300 dark:text-slate-700'}`}>
                        <div className={`w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-[9px] md:text-[10px] font-black transition-all ${currentStep === idx + 1 ? 'bg-slate-950 dark:bg-indigo-600 text-white shadow-xl' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-500'}`}>{idx+1}</div>
                        <span className="text-[9px] md:text-[10px] uppercase font-black tracking-widest">{s}</span>
                    </div>
                ))}
            </div>
            <button onClick={onCancel} className="hidden md:flex text-slate-400 hover:text-slate-950 dark:hover:text-white p-2 transition-colors"><X size={24}/></button>
          </div>
          <div className="p-6 md:p-12 min-h-[50vh] md:min-h-[60vh] flex flex-col items-start w-full transition-all text-left">{renderStep()}</div>
          <div className="bg-slate-50 dark:bg-slate-950/50 px-6 md:px-12 py-6 md:py-8 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center gap-4">
              <Button variant="outline" className="rounded-2xl px-6 md:px-10 h-12 md:h-14 font-black uppercase text-[10px] md:text-[11px] tracking-widest border-2 dark:border-slate-700 dark:text-slate-400 flex-1 md:flex-none" onClick={() => { if(currentStep===1) setMode('selection'); else setCurrentStep(prev=>prev-1); }}>Voltar</Button>
              {currentStep < STEPS.length && (
                  <Button className="rounded-2xl px-8 md:px-16 h-12 md:h-14 font-black uppercase text-[10px] md:text-[11px] tracking-widest shadow-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex-1 md:flex-none border-none" onClick={() => setCurrentStep(prev=>prev+1)} disabled={mode === 'upload' && currentStep === 1 && !uploadSuccess}>Próximo</Button>
              )}
          </div>
        </div>
      )}
    </div>
  );
};
